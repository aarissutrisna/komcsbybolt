# Supabase Edge Functions → Express Backend Migration

Konversi lengkap dari Supabase Edge Functions ke Express backend yang berjalan di Node.js + PostgreSQL.

## 1. calculate-commissions ✅

### Sebelumnya (Supabase Edge Function)
```
POST /functions/v1/calculate-commissions
Body: { branchId, tanggal }
```

### Sekarang (Express Backend)
```
POST /api/commissions/calculate-by-date
Headers: Authorization: Bearer <token>
Body: {
  "branchId": "uuid",
  "tanggal": "2024-01-15"
}
```

### Perubahan
- Endpoint: `/api/commissions/calculate-by-date`
- Method: POST (tetap sama)
- Auth: JWT token (sebelumnya Supabase service key)
- Response: Same format

### Logika
✅ Tetap sama:
- Ambil omzet data berdasarkan branch dan date
- Hitung komisi persen berdasarkan target_min/target_max
- Ambil CS users di branch
- Ambil attendance data
- Calculate komisi untuk setiap CS dengan faktor pengali dan status kehadiran

### Contoh Request

```bash
curl -X POST http://localhost:3000/api/commissions/calculate-by-date \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "550e8400-e29b-41d4-a716-446655440000",
    "tanggal": "2024-01-15"
  }'
```

---

## 2. manage-withdrawals ✅

### Sebelumnya (Supabase Edge Function)
```
POST /functions/v1/manage-withdrawals?action=create
PUT /functions/v1/manage-withdrawals?action=approve
```

### Sekarang (Express Backend)

#### Create Withdrawal
```
POST /api/withdrawals/create
Headers: Authorization: Bearer <token>
Body: { "nominal": 1000000 }
```

#### Approve/Reject Withdrawal
```
POST /api/withdrawals/approve
Headers: Authorization: Bearer <token>
Body: {
  "withdrawalId": "uuid",
  "approved": true,
  "catatan": "Approved"
}
```

#### Get Withdrawal Requests
```
GET /api/withdrawals/list?status=pending&branchId=uuid
Headers: Authorization: Bearer <token>
```

#### Get User Balance
```
GET /api/withdrawals/balance
Headers: Authorization: Bearer <token>
```

### Logika
✅ Tetap sama:
- Create: Check available balance (total komisi + mutations)
- Approve: Update status + create commission_mutations record
- Balance calculation: Sum of paid commissions + net mutations

### Contoh Request

```bash
# Create withdrawal request
curl -X POST http://localhost:3000/api/withdrawals/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "nominal": 1000000 }'

# Approve withdrawal
curl -X POST http://localhost:3000/api/withdrawals/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "withdrawalId": "550e8400-e29b-41d4-a716-446655440400",
    "approved": true,
    "catatan": "Approved for payment"
  }'

# Get balance
curl -X GET http://localhost:3000/api/withdrawals/balance \
  -H "Authorization: Bearer $TOKEN"
```

---

## 3. n8n-webhook ✅

### Sebelumnya (Supabase Edge Function)
```
POST /functions/v1/n8n-webhook
Headers: Authorization: Bearer <supabase_key>
Query: (none)
Body: {
  branchId, data, token, tanggal, cash, piutang
}
```

### Sekarang (Express Backend)
```
POST /api/omzet/webhook/n8n
Headers: (optional Authorization for token validation)
Body: {
  branchId, data, token, tanggal, cash, piutang
}
```

### Perubahan
- Endpoint: `/api/omzet/webhook/n8n`
- Auth: Optional (token-based, tidak memerlukan JWT)
- Dapat dipanggil dari N8N tanpa auth header
- Token validation menggunakan N8N_WEBHOOK_SECRET env var

### Logika
✅ Tetap sama:
- Terima omzet data (array atau single record)
- Transform date format (DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD)
- Validate branch exists
- Upsert omzet data
- Trigger commission calculation untuk setiap date
- Return results

### Contoh Request

```bash
# Dari N8N (tanpa auth)
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "your-webhook-secret",
    "data": [
      {
        "tanggal": "2024-01-15",
        "cash": 5000000,
        "piutang": 2000000
      }
    ]
  }'

# Single record format
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "550e8400-e29b-41d4-a716-446655440000",
    "tanggal": "15-01-2024",
    "cash": 5000000,
    "piutang": 2000000,
    "token": "your-webhook-secret"
  }'
```

---

## 4. sync-omzet-n8n ✅

### Sebelumnya (Supabase Edge Function)
```
POST /functions/v1/sync-omzet-n8n
Headers: Authorization: Bearer <supabase_key>
Body: { branchId, startDate, endDate }
```

### Sekarang (Express Backend)
```
POST /api/omzet/sync/n8n
Headers: Authorization: Bearer <token>
Body: { branchId, startDate, endDate }
```

### Perubahan
- Endpoint: `/api/omzet/sync/n8n`
- Auth: JWT token required
- Role: admin atau hrd only

### Logika
✅ Tetap sama:
- Ambil branch n8n_endpoint
- Fetch data dari N8N endpoint dengan date range
- Validate data
- Upsert ke omzet table
- Update last_sync_at timestamp

### Contoh Request

```bash
curl -X POST http://localhost:3000/api/omzet/sync/n8n \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "550e8400-e29b-41d4-a716-446655440000",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

---

## Database Changes

### Tabel Baru
1. **attendance_data** - Status kehadiran CS
   - user_id, branch_id, tanggal, status_kehadiran

2. **withdrawal_requests** - Permintaan penarikan komisi
   - user_id, branch_id, nominal, status, tanggal, catatan

3. **commission_mutations** - Mutasi komisi (masuk/keluar)
   - user_id, branch_id, tanggal, tipe, nominal, keterangan

### Tabel Dimodifikasi
1. **branches** - Added fields:
   - target_min, target_max, n8n_endpoint, last_sync_at

2. **users** - Added field:
   - faktor_pengali

---

## Environment Variables

### Backend (.env)
```env
# Existing
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cs_commission
DB_USER=postgres
DB_PASSWORD=...
NODE_ENV=development
PORT=3000
JWT_SECRET=...
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173

# New
N8N_WEBHOOK_SECRET=your-webhook-secret-token
```

---

## API Endpoint Summary

| Old Edge Function | New Express Route | Auth | Role |
|-------------------|-------------------|------|------|
| `/calculate-commissions` | `POST /api/commissions/calculate-by-date` | JWT | admin, hrd |
| `/calculate-commissions` (branch) | `POST /api/commissions/calculate-by-branch` | JWT | admin, hrd |
| `/manage-withdrawals?action=create` | `POST /api/withdrawals/create` | JWT | all |
| `/manage-withdrawals?action=approve` | `POST /api/withdrawals/approve` | JWT | admin, hrd |
| `/manage-withdrawals` (list) | `GET /api/withdrawals/list` | JWT | admin, hrd |
| `/n8n-webhook` | `POST /api/omzet/webhook/n8n` | Optional | - |
| `/sync-omzet-n8n` | `POST /api/omzet/sync/n8n` | JWT | admin, hrd |

---

## Testing

### Test Calculate Commissions
```bash
# Setup test data first
# 1. Create omzet record
curl -X POST http://localhost:3000/api/omzet/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "uuid",
    "branchId": "uuid",
    "amount": 5000000,
    "date": "2024-01-15",
    "description": "Test omzet"
  }'

# 2. Create attendance record
# (via database or future attendance API)

# 3. Calculate commissions
curl -X POST http://localhost:3000/api/commissions/calculate-by-date \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "uuid",
    "tanggal": "2024-01-15"
  }'
```

### Test N8N Webhook (from N8N)
```bash
curl -X POST http://your-domain.com/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "550e8400-e29b-41d4-a716-446655440000",
    "token": "your-webhook-secret",
    "data": [{
      "tanggal": "2024-01-15",
      "cash": 5000000,
      "piutang": 2000000
    }]
  }'
```

---

## Deployment Changes

### VPS Setup
1. Install Node.js, PostgreSQL
2. Create database: `createdb cs_commission`
3. Run schema.sql: `psql -d cs_commission -f schema.sql`
4. Setup backend .env with database credentials
5. Install dependencies: `npm install --production`
6. Start with PM2: `pm2 start src/server.js`

### Nginx Reverse Proxy
```nginx
location /api {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
  proxy_cache_bypass $http_upgrade;
}
```

---

## Benefits

✅ **No Supabase Dependency** - Run backend anywhere
✅ **Full Control** - Manage all business logic
✅ **Better Performance** - Direct database connection
✅ **Easier Debugging** - Local development
✅ **Cost Efficient** - No Supabase fees for edge functions
✅ **Standard Stack** - Node.js + Express + PostgreSQL

---

## Rollback

Jika perlu kembali ke Supabase edge functions:
1. Semua logika sudah documented
2. Port requests kembali ke Supabase endpoints
3. Konversi token auth (JWT ↔ Supabase)

---

**Migration Status**: ✅ Complete
**Testing Status**: Ready for QA
**Documentation**: Complete
