# N8N Workflow Integration - Complete Guide

Panduan lengkap integrasi n8n untuk otomasi data omzet dari 3 cabang (UTM, JTJ, TSM) ke sistem komisi CS.

---

## 🏗️ Arsitektur Alur Data

```
┌─────────────────────────────────────────────────────────────────┐
│                        WEBAPP (Frontend)                         │
│  ├─ Dashboard Admin/HRD                                          │
│  ├─ Pilih Date Range (startDate → endDate)                      │
│  └─ Tombol: "Sync Omzet dari N8N"                              │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 ├─────────────────────────────────────────────┐
                 │                                             │
                 ▼ (OPTION 1: Manual Sync via Webapp)      ▼ (OPTION 2: Auto from N8N)
                 │                                          │
         ┌───────────────────┐                    ┌──────────────────┐
         │ N8N Scheduled Job │                    │ Webhook Trigger  │
         │ (Polling)         │                    │ (dari POS/ERP)   │
         │ - Daily at 21:00  │                    │ - Real-time      │
         │ - Or manual       │                    │ - 3 webhook URL  │
         └────────┬──────────┘                    └────────┬─────────┘
                  │                                       │
                  └───────────────┬─────────────────────┬─┘
                                  │
                    ┌─────────────────────────────────┐
                    │     N8N WORKFLOW NODES          │
                    │                                 │
                    │ 1. Webhook/HTTP Trigger         │
                    │    - Receive data dari POS      │
                    │    - Validate x-api-key header  │
                    │                                 │
                    │ 2. Function: Check Mode         │
                    │    - Parse payload              │
                    │    - Determine: daily/update... │
                    │    - Set default values         │
                    │                                 │
                    │ 3. Conditional: Mode Check      │
                    │    - daily → Direct Insert      │
                    │    - update → Upsert Revisi     │
                    │    - bulk → SplitInBatches      │
                    │                                 │
                    │ 4. Split In Batches (Bulk)      │
                    │    - Batch size: 100-500        │
                    │    - Prevent deadlock           │
                    │                                 │
                    │ 5. PostgreSQL Node              │
                    │    - INSERT/UPSERT              │
                    │    - tbl_cash, tbl_piutang      │
                    │    - Auto-calculate totals      │
                    │                                 │
                    │ 6. Function: Log Status         │
                    │    - Record sync timestamp      │
                    │    - Count inserted rows        │
                    │                                 │
                    │ 7. HTTP Response                │
                    │    - Return status 200/400/500  │
                    │    - Include row counts         │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │  PostgreSQL (VPS Production)    │
                    │                                 │
                    │  Tabel:                         │
                    │  ├─ tbl_cash                    │
                    │  ├─ tbl_piutang                 │
                    │  ├─ commission_mutations        │
                    │  ├─ audit_log                   │
                    │  └─ n8n_sync_log                │
                    │                                 │
                    │  Kolom Penting:                 │
                    │  ├─ source_n8n: UTM/JTJ/TSM     │
                    │  ├─ revisi: 0,1,2...            │
                    │  ├─ updated_at: timestamp       │
                    │  └─ synced_at: last sync time   │
                    └─────────────────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │    Webapp Backend (Express)     │
                    │                                 │
                    │  Routes:                        │
                    │  POST /api/omzet/webhook/n8n    │
                    │  POST /api/omzet/sync/n8n       │
                    │  GET  /api/omzet/by-branch      │
                    │  GET  /api/omzet/stats          │
                    │                                 │
                    │  Services:                      │
                    │  ├─ omzetService.js             │
                    │  └─ commissionsService.js       │
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │   Webapp Frontend (React)        │
                    │                                 │
                    │  Tampilkan:                     │
                    │  ├─ Omzet per cabang            │
                    │  ├─ Sync history                │
                    │  ├─ Commission calculation      │
                    │  └─ Reports & Analytics         │
                    └─────────────────────────────────┘
```

---

## 📋 N8N Workflow Detail

### Webhook Configuration

```json
{
  "webhooks": [
    {
      "name": "Omzet UTM",
      "url": "https://your-n8n.com/webhook/omzet-utm",
      "branch": "UTM",
      "method": "POST",
      "auth": "x-api-key header"
    },
    {
      "name": "Omzet JTJ",
      "url": "https://your-n8n.com/webhook/omzet-jtj",
      "branch": "JTJ",
      "method": "POST",
      "auth": "x-api-key header"
    },
    {
      "name": "Omzet TSM",
      "url": "https://your-n8n.com/webhook/omzet-tsm",
      "branch": "TSM",
      "method": "POST",
      "auth": "x-api-key header"
    }
  ]
}
```

### Node Configuration

#### 1. Webhook Trigger
```javascript
// Trigger settings
{
  "httpMethod": "POST",
  "path": "omzet-{{ $env.BRANCH_NAME }}",
  "responseCode": 200,
  "respondWith": "allData",
  "authentication": "headerAuth",
  "headerAuth": {
    "name": "x-api-key",
    "value": "{{ $env.N8N_WEBHOOK_SECRET }}"
  }
}
```

#### 2. Function: Check Mode
```javascript
// Check mode and set defaults
const payload = $input.first().json;

return {
  // Request data
  ...payload,

  // Determine mode
  mode: payload.mode || 'daily', // daily, update, bulk

  // Set defaults
  cash: payload.cash || 0,
  piutang: payload.piutang || 0,
  revisi: payload.revisi || 0,
  source_n8n: payload.branch || 'unknown',

  // Timestamp
  synced_at: new Date().toISOString(),

  // Validation
  isValid: payload.tanggal && (payload.cash !== undefined),
};
```

#### 3. Conditional: Route by Mode
```javascript
// Branch logic
if ($input.first().json.mode === 'bulk') {
  return $input.first().json;  // Route to SplitInBatches
} else if ($input.first().json.mode === 'update') {
  return $input.first().json;  // Route to Upsert
} else {
  return $input.first().json;  // Route to Direct Insert
}
```

#### 4. Split In Batches (For Bulk)
```javascript
// Configuration
{
  "batchSize": 500,
  "options": {
    "reset": true
  }
}

// Input: Array of records
// Output: Batches of 500 records each
```

#### 5. PostgreSQL Node: Insert/Upsert
```sql
-- Daily insert (new record only)
INSERT INTO omzet (branch_id, tanggal, cash, piutang, total, source_n8n, revisi, synced_at)
VALUES ({{ $json.branch_id }}, {{ $json.tanggal }}, {{ $json.cash }}, {{ $json.piutang }},
        {{ $json.cash + $json.piutang }}, '{{ $json.source_n8n }}', 0, NOW())
ON CONFLICT (branch_id, tanggal) DO NOTHING;

-- Update mode (replace with new revisi)
INSERT INTO omzet (branch_id, tanggal, cash, piutang, total, source_n8n, revisi, synced_at)
VALUES ({{ $json.branch_id }}, {{ $json.tanggal }}, {{ $json.cash }}, {{ $json.piutang }},
        {{ $json.cash + $json.piutang }}, '{{ $json.source_n8n }}', {{ $json.revisi }}, NOW())
ON CONFLICT (branch_id, tanggal) DO UPDATE SET
  cash = EXCLUDED.cash,
  piutang = EXCLUDED.piutang,
  total = EXCLUDED.total,
  revisi = EXCLUDED.revisi + 1,
  updated_at = NOW(),
  synced_at = NOW();

-- Bulk insert (with batch handling)
INSERT INTO omzet (branch_id, tanggal, cash, piutang, total, source_n8n, revisi, synced_at)
VALUES ({{ $json.branch_id }}, {{ $json.tanggal }}, {{ $json.cash }}, {{ $json.piutang }},
        {{ $json.cash + $json.piutang }}, '{{ $json.source_n8n }}', 0, NOW())
ON CONFLICT (branch_id, tanggal) DO NOTHING;
```

#### 6. Function: Log Status
```javascript
// Log execution details
const result = $input.first().json;

return {
  status: 'success',
  timestamp: new Date().toISOString(),
  mode: result.mode,
  branch: result.source_n8n,
  recordsProcessed: result.rowsAffected || 1,
  rowsInserted: result.affectedRows,
  rowsUpdated: 0,
  message: `Successfully processed ${result.rowsAffected || 1} record(s) in ${result.mode} mode`
};
```

#### 7. HTTP Response
```javascript
// Return response to caller
{
  "success": true,
  "status": 200,
  "data": {
    "mode": $input.first().json.mode,
    "branch": $input.first().json.source_n8n,
    "recordsProcessed": $input.first().json.rowsAffected || 1,
    "timestamp": new Date().toISOString(),
    "message": "Data synced successfully"
  }
}
```

---

## 📊 Data Modes Explained

### 1. Mode: `daily` (Default)
**Fungsi**: Tambah data hari ini (append mode)
- **Trigger**: Normal POS transaction
- **Behavior**:
  - Check if record exists untuk (branch_id, tanggal)
  - Jika tidak ada → INSERT baru
  - Jika sudah ada → SKIP (tidak overwrite)
- **Use Case**: Daily sync dari POS system
- **Kolom**: cash, piutang, source_n8n, revisi=0

```json
{
  "branch": "UTM",
  "tanggal": "2024-01-15",
  "cash": 5000000,
  "piutang": 2000000,
  "mode": "daily"
}
```

### 2. Mode: `update` (Revisi)
**Fungsi**: Update data lama dengan revisi baru
- **Trigger**: Koreksi data dari periode sebelumnya
- **Behavior**:
  - Check if record exists untuk (branch_id, tanggal)
  - Jika ada → UPDATE dengan revisi += 1
  - Jika tidak ada → INSERT dengan revisi=0
  - Track `updated_at` untuk audit
- **Use Case**: Koreksi sales yang sudah ter-record
- **Kolom**: cash, piutang, source_n8n, revisi (auto-increment)

```json
{
  "branch": "JTJ",
  "tanggal": "2024-01-10",
  "cash": 5500000,
  "piutang": 1800000,
  "mode": "update",
  "revisi": 1
}
```

### 3. Mode: `bulk` (Historical Import)
**Fungsi**: Import data historical dalam jumlah besar
- **Trigger**: Import 1 tahun data atau data recovery
- **Behavior**:
  - Split data into batches (500 records/batch)
  - Insert semua records (ON CONFLICT DO NOTHING)
  - Mencegah deadlock & timeout
  - Progress tracking per batch
- **Use Case**: First-time setup atau data recovery
- **Kolom**: Sama dengan daily, tapi dalam array

```json
{
  "mode": "bulk",
  "branch": "TSM",
  "data": [
    {
      "tanggal": "2023-01-01",
      "cash": 3000000,
      "piutang": 1000000
    },
    {
      "tanggal": "2023-01-02",
      "cash": 3500000,
      "piutang": 1200000
    }
  ]
}
```

---

## 🔄 Webapp Integration

### API Endpoint: Manual Sync
```
POST /api/omzet/sync/n8n
Headers: Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

Body:
{
  "branchId": "550e8400-e29b-41d4-a716-446655440000",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Flow**:
1. User buka Webapp → Dashboard → "Sync Omzet"
2. Select date range (startDate, endDate)
3. Click "Sync" button
4. Webapp call `POST /api/omzet/sync/n8n`
5. Backend fetch dari N8N endpoint branch
6. Data tersimpan ke PostgreSQL
7. Auto-calculate commissions
8. Show success message dengan jumlah records

### API Endpoint: Webhook dari N8N
```
POST /api/omzet/webhook/n8n
Headers: x-api-key: <N8N_WEBHOOK_SECRET>
Content-Type: application/json

Body: (sama seperti mode daily/update/bulk)
```

**Flow**:
1. POS/ERP kirim data ke N8N webhook
2. N8N workflow process data
3. N8N POST ke Webapp `/api/omzet/webhook/n8n`
4. Webapp menerima → validasi → store ke PostgreSQL
5. Auto-calculate commissions
6. N8N receive response 200 OK

---

## 💾 Database Schema Changes

### Tabel: omzet (Enhanced)

```sql
CREATE TABLE omzet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  branch_id UUID NOT NULL REFERENCES branches(id),
  user_id UUID REFERENCES users(id),

  -- Omzet Data
  date DATE NOT NULL,
  cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
  piutang DECIMAL(15, 2) NOT NULL DEFAULT 0,
  amount DECIMAL(15, 2) GENERATED ALWAYS AS (cash + piutang) STORED,

  -- N8N Integration
  source_n8n VARCHAR(50) NOT NULL DEFAULT 'manual', -- UTM, JTJ, TSM, manual
  revisi INT DEFAULT 0,  -- Track revisions (0 = original, 1 = first update)
  synced_at TIMESTAMP DEFAULT NOW(),

  -- Metadata
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(branch_id, date),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_omzet_branch_date ON omzet(branch_id, date DESC);
CREATE INDEX idx_omzet_source ON omzet(source_n8n);
CREATE INDEX idx_omzet_synced ON omzet(synced_at DESC);
```

### Tabel Baru: n8n_sync_log (Audit Trail)

```sql
CREATE TABLE n8n_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sync Info
  branch_name VARCHAR(50) NOT NULL,
  branch_id UUID REFERENCES branches(id),
  mode VARCHAR(20) NOT NULL, -- daily, update, bulk

  -- Counts
  records_received INT,
  records_inserted INT,
  records_updated INT,
  records_skipped INT,

  -- Status
  status VARCHAR(20) NOT NULL, -- success, partial, failed
  error_message TEXT,

  -- Timestamps
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  duration_ms INT,

  -- Metadata
  payload_hash VARCHAR(64),
  n8n_execution_id VARCHAR(100),

  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL
);

CREATE INDEX idx_sync_log_branch_date ON n8n_sync_log(branch_id, started_at DESC);
CREATE INDEX idx_sync_log_status ON n8n_sync_log(status);
```

---

## 📝 JSON Payload Examples

### Example 1: Daily Sync dari POS
```json
{
  "branch": "UTM",
  "tanggal": "2024-01-15",
  "cash": 5000000,
  "piutang": 2000000,
  "mode": "daily"
}
```

**Response**:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "mode": "daily",
    "branch": "UTM",
    "recordsProcessed": 1,
    "timestamp": "2024-01-15T21:30:45.123Z",
    "message": "Data synced successfully"
  }
}
```

### Example 2: Update dengan Revisi
```json
{
  "branch": "JTJ",
  "tanggal": "2024-01-10",
  "cash": 5500000,
  "piutang": 1800000,
  "mode": "update",
  "revisi": 1
}
```

**Response**:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "mode": "update",
    "branch": "JTJ",
    "recordsProcessed": 1,
    "revision": 1,
    "timestamp": "2024-01-15T21:30:45.123Z",
    "message": "Data updated with revision 1"
  }
}
```

### Example 3: Bulk Import Historical Data
```json
{
  "mode": "bulk",
  "branch": "TSM",
  "data": [
    {
      "tanggal": "2023-01-01",
      "cash": 3000000,
      "piutang": 1000000
    },
    {
      "tanggal": "2023-01-02",
      "cash": 3500000,
      "piutang": 1200000
    },
    {
      "tanggal": "2023-01-03",
      "cash": 4000000,
      "piutang": 1500000
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "status": 200,
  "data": {
    "mode": "bulk",
    "branch": "TSM",
    "totalRecords": 3,
    "recordsProcessed": 3,
    "recordsInserted": 3,
    "recordsSkipped": 0,
    "timestamp": "2024-01-15T21:30:45.123Z",
    "message": "Bulk import completed: 3 records inserted"
  }
}
```

### Example 4: Webapp Manual Sync Request
```json
{
  "branchId": "550e8400-e29b-41d4-a716-446655440000",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Synced 31 records from N8N",
  "recordsInserted": 28,
  "recordsUpdated": 3,
  "data": [
    {
      "tanggal": "2024-01-01",
      "cash": 5000000,
      "piutang": 2000000,
      "total": 7000000,
      "source_n8n": "TSM",
      "revisi": 0
    }
  ]
}
```

---

## 🔐 Security & Best Practices

### 1. Webhook Authentication

#### Header Validation
```javascript
// N8N Configuration
headers: {
  "x-api-key": "{{ $env.N8N_WEBHOOK_SECRET }}"
}

// Webapp Validation
app.post('/api/omzet/webhook/n8n', (req, res) => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.N8N_WEBHOOK_SECRET;

  if (apiKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Process webhook
});
```

#### Environment Variables
```env
# N8N Webhook Secret (minimal 32 chars)
N8N_WEBHOOK_SECRET=your_super_secret_key_min_32_chars_here

# N8N Endpoint URLs (if using polling)
N8N_UTM_ENDPOINT=https://your-n8n.com/webhook/omzet-utm
N8N_JTJ_ENDPOINT=https://your-n8n.com/webhook/omzet-jtj
N8N_TSM_ENDPOINT=https://your-n8n.com/webhook/omzet-tsm
```

### 2. Batch Processing Rules

**Untuk Bulk Import**:
- Max batch size: 500 records
- Delay between batches: 500ms (prevent database deadlock)
- Timeout per batch: 30 seconds
- Retry mechanism: Exponential backoff (3 attempts)

```javascript
// N8N: Batch processing with delay
{
  "batchSize": 500,
  "interval": 500, // ms delay between batches
  "maxTries": 3,
  "retryAfter": 1000 // exponential backoff
}
```

### 3. Data Validation Rules

```javascript
// Required fields
const requiredFields = ['branch', 'tanggal', 'cash', 'piutang'];

// Data types
const validation = {
  branch: { type: 'string', enum: ['UTM', 'JTJ', 'TSM'] },
  tanggal: { type: 'date', format: 'YYYY-MM-DD' },
  cash: { type: 'number', min: 0, max: 999999999999 },
  piutang: { type: 'number', min: 0, max: 999999999999 },
  mode: { type: 'string', enum: ['daily', 'update', 'bulk'], default: 'daily' },
  revisi: { type: 'number', min: 0, max: 1000 }
};

// Reject if invalid
if (!requiredFields.every(f => payload[f] !== undefined)) {
  throw new Error('Missing required fields');
}
```

### 4. Audit Trail & Logging

```javascript
// Log setiap sync attempt
const auditLog = {
  timestamp: new Date(),
  branch: payload.branch,
  mode: payload.mode,
  recordCount: payload.data?.length || 1,
  status: 'success|failed|partial',
  errorMessage: error?.message,
  ipAddress: req.ip,
  userId: req.user?.id
};

// Insert ke n8n_sync_log table
await db.query(
  'INSERT INTO n8n_sync_log (branch_name, mode, records_received, status) VALUES ($1, $2, $3, $4)',
  [auditLog.branch, auditLog.mode, auditLog.recordCount, auditLog.status]
);
```

### 5. Error Handling

```javascript
// Return appropriate status codes
const responses = {
  200: { success: true, message: 'Data synced successfully' },
  400: { success: false, error: 'Invalid request body' },
  401: { success: false, error: 'Unauthorized (invalid x-api-key)' },
  409: { success: false, error: 'Conflict (duplicate data)' },
  500: { success: false, error: 'Internal server error' }
};

// Log errors untuk troubleshooting
console.error({
  timestamp: new Date(),
  error: error.message,
  stack: error.stack,
  payload: req.body,
  branch: payload.branch
});
```

---

## 🧪 Testing Scenarios

### Test 1: Daily Sync
```bash
# Curl command
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_webhook_secret" \
  -d '{
    "branch": "UTM",
    "tanggal": "2024-01-15",
    "cash": 5000000,
    "piutang": 2000000,
    "mode": "daily"
  }'

# Expected: 201 Created
# Response: { success: true, recordsProcessed: 1 }
```

### Test 2: Update Mode (Revisi)
```bash
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_webhook_secret" \
  -d '{
    "branch": "JTJ",
    "tanggal": "2024-01-10",
    "cash": 5500000,
    "piutang": 1800000,
    "mode": "update",
    "revisi": 1
  }'

# Expected: 200 OK
# Response: { success: true, recordsProcessed: 1, revision: 1 }
```

### Test 3: Bulk Import (Historical)
```bash
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_webhook_secret" \
  -d '{
    "mode": "bulk",
    "branch": "TSM",
    "data": [
      { "tanggal": "2023-12-01", "cash": 3000000, "piutang": 1000000 },
      { "tanggal": "2023-12-02", "cash": 3500000, "piutang": 1200000 }
    ]
  }'

# Expected: 200 OK
# Response: { success: true, recordsProcessed: 2, mode: "bulk" }
```

### Test 4: Manual Sync via Webapp
```bash
# Login first
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@commission.local","password":"admin123456"}' \
  | jq -r '.token')

# Manual sync
curl -X POST http://localhost:3000/api/omzet/sync/n8n \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "550e8400-e29b-41d4-a716-446655440000",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'

# Expected: 200 OK
# Response: { success: true, recordsInserted: 31, omzetData: [...] }
```

### Test 5: Invalid x-api-key
```bash
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "x-api-key: wrong_key" \
  -d '{"branch":"UTM","tanggal":"2024-01-15","cash":5000000,"piutang":2000000}'

# Expected: 401 Unauthorized
# Response: { error: "Invalid webhook token" }
```

---

## 📊 Monitoring & Troubleshooting

### View Sync History
```sql
-- Check recent syncs
SELECT id, branch_name, mode, status, records_inserted,
       records_updated, started_at, completed_at
FROM n8n_sync_log
ORDER BY started_at DESC
LIMIT 20;

-- Check failed syncs
SELECT * FROM n8n_sync_log
WHERE status != 'success'
ORDER BY started_at DESC;

-- Daily summary
SELECT
  DATE(started_at) as sync_date,
  branch_name,
  COUNT(*) as sync_count,
  SUM(records_inserted) as total_inserted,
  SUM(records_updated) as total_updated
FROM n8n_sync_log
WHERE status = 'success'
GROUP BY DATE(started_at), branch_name
ORDER BY sync_date DESC;
```

### Monitor via Webapp
```
Dashboard → N8N Sync Status
├─ Last Sync: 2024-01-15 21:30:45
├─ Branch: TSM
├─ Records: 1 inserted, 0 updated
├─ Status: ✅ Success
└─ Next Sync: Scheduled at 21:00 daily
```

### Common Issues

**Issue 1: "Invalid webhook token"**
- Check: x-api-key header match N8N_WEBHOOK_SECRET
- Solution: Verify .env N8N_WEBHOOK_SECRET value

**Issue 2: "Duplicate key value violates unique constraint"**
- Cause: Same (branch, tanggal) already exists in daily mode
- Solution: Use mode="update" untuk revisi data

**Issue 3: "Batch timeout after 30s"**
- Cause: Database deadlock atau query terlalu lambat
- Solution: Reduce batch size dari 500 → 100

**Issue 4: "Branch not found"**
- Cause: branch_id tidak valid di database
- Solution: Pastikan branch sudah dicreate di webapp

---

## 🚀 Deployment Checklist

### Pre-Production
- [ ] N8N webhook URLs sudah configured
- [ ] x-api-key sudah strong (min 32 chars)
- [ ] Database tables sudah created (omzet + n8n_sync_log)
- [ ] Indexes sudah created untuk performance
- [ ] CORS configured untuk N8N server IP

### Production
- [ ] N8N_WEBHOOK_SECRET di-set di .env
- [ ] N8N scheduled job configured untuk daily sync
- [ ] Backup strategy untuk PostgreSQL
- [ ] Monitoring alerts untuk sync failures
- [ ] Logging enabled di N8N
- [ ] Rate limiting configured (max 100 req/min)

### Post-Deployment
- [ ] Test semua 3 webhook URLs
- [ ] Test bulk import dengan sample data
- [ ] Verify audit trail di n8n_sync_log
- [ ] Test error scenarios (invalid branch, wrong key, etc)
- [ ] Document N8N workflow untuk team

---

## 📖 Additional Resources

- **README.md** - Main project documentation
- **MIGRATION-GUIDE.md** - Edge function to Express migration
- **SETUP.md** - Production deployment guide
- **EXAMPLE-REQUESTS.md** - cURL examples
- **API-ENDPOINTS.md** - Full API reference

---

**Status**: ✅ Complete
**Last Updated**: 2024
**Author**: CS Commission Team
