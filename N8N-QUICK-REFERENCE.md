# N8N Integration - Quick Reference

Cheat sheet untuk N8N workflow integration dengan CS Commission System.

---

## 🚀 Quick Start

### 1. Webhook URLs (3 Branches)
```
POST https://your-domain.com/api/omzet/webhook/n8n
POST https://your-domain.com/api/omzet/webhook/n8n
POST https://your-domain.com/api/omzet/webhook/n8n
```

### 2. Header Required
```
x-api-key: your_super_secret_webhook_key_min_32_chars
```

### 3. Basic Payload
```json
{
  "branch": "UTM",
  "tanggal": "2024-01-15",
  "cash": 5000000,
  "piutang": 2000000,
  "mode": "daily"
}
```

### 4. Response
```json
{
  "success": true,
  "status": 200,
  "data": {
    "mode": "daily",
    "branch": "UTM",
    "recordsProcessed": 1,
    "timestamp": "2024-01-15T21:30:45.123Z"
  }
}
```

---

## 📊 Data Modes

| Mode | Purpose | Behavior | Use Case |
|------|---------|----------|----------|
| **daily** | Append new | Skip if exists | Daily POS sync |
| **update** | Revise old | Update + version | Correct past sales |
| **bulk** | Import many | Batch by 500 | Historical import |

---

## 🔄 N8N Node Setup

```
1. Webhook Trigger
   ├─ Method: POST
   ├─ Path: omzet-{{ $env.BRANCH_NAME }}
   └─ Auth: x-api-key header

2. Function: Check Mode
   └─ Parse payload, set defaults

3. Conditional: Route by Mode
   └─ Branch to: daily/update/bulk

4. Split In Batches (Bulk only)
   └─ Batch size: 500, delay: 500ms

5. PostgreSQL Node
   ├─ INSERT/UPSERT omzet
   └─ Mode: daily/update

6. Function: Log Status
   └─ Track sync metadata

7. HTTP Response
   └─ Return 200 + summary
```

---

## 💾 Database Tables

### omzet
- branch_id, tanggal, cash, piutang, total
- **source_n8n**: UTM, JTJ, TSM, manual
- **revisi**: 0, 1, 2... (track updates)
- **synced_at**: last sync timestamp
- Unique: (branch_id, tanggal)

### n8n_sync_log (Audit)
- branch_name, mode, records_*, status
- started_at, completed_at, duration_ms
- error_message (if failed)

---

## 🔐 Security

### API Key
```bash
# Minimum: 32 characters
N8N_WEBHOOK_SECRET=your_super_secret_key_min_32_chars_here

# Example (NEVER use this!)
N8N_WEBHOOK_SECRET=this_is_a_32_char_secret_key_abc123
```

### Validation
```javascript
// Check x-api-key header
if (req.headers['x-api-key'] !== process.env.N8N_WEBHOOK_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### Rate Limiting
- Max 100 requests/minute
- Batch size max 500 records
- Timeout 30 seconds/batch

---

## 📝 JSON Payloads

### Daily Sync
```json
{
  "branch": "UTM",
  "tanggal": "2024-01-15",
  "cash": 5000000,
  "piutang": 2000000,
  "mode": "daily"
}
```

### Update Revision
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

### Bulk Import
```json
{
  "mode": "bulk",
  "branch": "TSM",
  "data": [
    {"tanggal": "2023-01-01", "cash": 3000000, "piutang": 1000000},
    {"tanggal": "2023-01-02", "cash": 3500000, "piutang": 1200000}
  ]
}
```

---

## 🧪 Test Commands

### Daily Sync Test
```bash
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "x-api-key: test_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "UTM",
    "tanggal": "2024-01-15",
    "cash": 5000000,
    "piutang": 2000000,
    "mode": "daily"
  }'
```

### Update Test
```bash
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "x-api-key: test_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "branch": "JTJ",
    "tanggal": "2024-01-10",
    "cash": 5500000,
    "piutang": 1800000,
    "mode": "update",
    "revisi": 1
  }'
```

### Bulk Test
```bash
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "x-api-key: test_secret" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "bulk",
    "branch": "TSM",
    "data": [
      {"tanggal": "2023-12-01", "cash": 3000000, "piutang": 1000000},
      {"tanggal": "2023-12-02", "cash": 3500000, "piutang": 1200000}
    ]
  }'
```

---

## 📍 Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | Success | Data saved ✅ |
| 400 | Bad request | Check payload syntax |
| 401 | Unauthorized | Verify x-api-key header |
| 409 | Conflict | Use mode="update" for revisions |
| 500 | Server error | Check backend logs |

---

## 🔗 API Endpoints

### Webhook (from N8N)
```
POST /api/omzet/webhook/n8n
Header: x-api-key
No JWT required
```

### Manual Sync (from Webapp)
```
POST /api/omzet/sync/n8n
Header: Authorization: Bearer <JWT>
Requires: admin or hrd role
Body: { branchId, startDate, endDate }
```

### Get Omzet
```
GET /api/omzet/by-branch?branchId=uuid&startDate=2024-01-01&endDate=2024-01-31
Header: Authorization: Bearer <JWT>
```

---

## 📊 Monitoring

### Check sync history
```sql
SELECT * FROM n8n_sync_log
ORDER BY started_at DESC
LIMIT 20;
```

### Check failed syncs
```sql
SELECT * FROM n8n_sync_log
WHERE status != 'success'
ORDER BY started_at DESC;
```

### Check data by branch
```sql
SELECT
  DATE(tanggal) as date,
  branch_id,
  COUNT(*) as record_count,
  SUM(cash) as total_cash,
  SUM(piutang) as total_piutang
FROM omzet
WHERE DATE(tanggal) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(tanggal), branch_id
ORDER BY date DESC;
```

---

## ⚠️ Common Issues

**"Invalid webhook token"**
- x-api-key not matching N8N_WEBHOOK_SECRET
- Solution: Check .env file

**"Duplicate key value"**
- Same (branch, tanggal) already exists
- Solution: Use mode="update"

**"Timeout"**
- Batch too large
- Solution: Reduce from 500 → 100

**"Branch not found"**
- branch_id mismatch
- Solution: Verify branch exists

---

## 🎯 Workflow Diagram (Simple)

```
POS/ERP
  ↓
N8N Webhook → Validate → Process → PostgreSQL
  ↓
Webapp API
  ↓
React Dashboard
```

---

## 📚 Full Documentation

See **README-N8N-WORKFLOW.md** for complete guide.

---

## 📞 Need Help?

1. **Quick issue** → Check "Common Issues" section above
2. **Configuration question** → See README-N8N-WORKFLOW.md
3. **API examples** → See EXAMPLE-REQUESTS.md
4. **Deployment** → See SETUP.md

---

**Status**: ✅ Production Ready
**Last Updated**: 2024-01-15
