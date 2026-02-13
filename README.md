# CS Commission System

Production-ready web application untuk sistem komisi Customer Service (CS) berbasis omzet harian.

**Status**: ✅ Production Ready | Built with React 18, TypeScript, Node.js, Express, PostgreSQL

---

## 🏗️ Arsitektur

### Technology Stack
| Component | Technology |
|-----------|-----------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **Backend** | Node.js + Express (REST API) |
| **Database** | PostgreSQL (native driver pg) |
| **Authentication** | JWT (jsonwebtoken) + bcrypt |
| **Integration** | N8N (3 webhooks: UTM, JTJ, TSM) |
| **Deployment** | Nginx + PM2 on VPS |

**IMPORTANT**: Aplikasi ini TIDAK menggunakan Supabase, Firebase, atau backend-as-a-service lainnya.

### System Architecture
```
POS/ERP (3 Branches)
├─ UTM Branch ──┐
├─ JTJ Branch ──┤
└─ TSM Branch ──┤
                │
                ▼
         ┌──────────────────┐
         │   N8N Workflow   │
         │  (Middleware)    │
         │                  │
         │ ├─ Validate Key  │
         │ ├─ Parse Mode    │
         │ ├─ Batch Data    │
         │ └─ Transform     │
         └────────┬─────────┘
                  │
                  ▼
      ┌───────────────────────────┐
      │  Express Backend (API)    │
      │                           │
      │ ├─ POST /api/omzet/...   │
      │ ├─ POST /api/commissions │
      │ ├─ GET  /api/dashboard   │
      │ └─ JWT Auth              │
      └────────────┬──────────────┘
                   │
                   ▼
      ┌───────────────────────────┐
      │   PostgreSQL Database     │
      │                           │
      │ ├─ omzet (+ revisi)      │
      │ ├─ commissions           │
      │ ├─ users & branches      │
      │ ├─ n8n_sync_log (audit)  │
      │ └─ audit trails          │
      └────────────┬──────────────┘
                   │
                   ▼
      ┌───────────────────────────┐
      │   React Frontend (UI)     │
      │                           │
      │ ├─ Dashboard             │
      │ ├─ Commission Reports    │
      │ ├─ Sync History          │
      │ └─ User Management       │
      └───────────────────────────┘
```

---

## 📚 Dokumentasi Lengkap

Untuk setup dan deployment lengkap, baca dokumentasi berikut:

### 1. **README-N8N-WORKFLOW.md** - N8N Integration Guide ⭐ NEW
   - Workflow diagram & nodes
   - Data modes: daily, update, bulk
   - 3 webhook cabang (UTM, JTJ, TSM)
   - JSON payload examples
   - Database schema untuk n8n
   - Security & batch processing
   - Testing scenarios
   - Monitoring & troubleshooting

### 2. **MIGRATION-GUIDE.md** - Backend Architecture
   - Supabase Edge Functions → Express conversion
   - Endpoint mapping
   - Service & controller structure
   - Database tables & indexes

### 3. **SETUP.md** - Production Deployment
   - Step-by-step VPS setup
   - PostgreSQL configuration
   - Nginx + PM2 setup
   - SSL/HTTPS dengan Certbot
   - Backup strategies
   - Monitoring

### 4. **EXAMPLE-REQUESTS.md** - API Testing
   - 46+ cURL examples
   - All endpoints documented
   - Response formats
   - Postman guide

### 5. **API-ENDPOINTS.md** - API Reference
   - Complete endpoint documentation
   - Request/response examples
   - Error codes

---

## ⚡ Quick Start (Development)

### Prerequisites
- Node.js 16+
- PostgreSQL 12+
- npm atau yarn

### 1. Setup Database
```bash
# Create database
createdb cs_commission

# Load schema
psql -d cs_commission -f schema.sql
```

### 2. Setup Backend
```bash
cd server

# Copy environment file
cp .env.example .env

# Edit .env dengan kredensial PostgreSQL Anda:
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=cs_commission
# DB_USER=postgres
# DB_PASSWORD=your_password

# Install dependencies
npm install

# Seed database dengan default data
npm run seed

# Start development server
npm run dev
```

Backend akan berjalan di `http://localhost:3000`

### 3. Setup Frontend
```bash
cd frontend

# Copy environment file
cp .env.example .env

# Edit .env (biasanya default sudah OK):
# VITE_API_BASE_URL=http://localhost:3000/api

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend akan berjalan di `http://localhost:5173`

### 4. Login
```
Email: admin@commission.local
Password: admin123456
```

---

## 📂 Project Structure

```
cs-commission-system/
├── schema.sql                    # PostgreSQL schema
├── server/                       # Backend API (Node.js + Express)
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── server.js             # Express server
│       ├── config/database.js    # PostgreSQL connection
│       ├── middleware/auth.js    # JWT auth
│       ├── services/             # Business logic (5 files)
│       ├── controllers/          # Route handlers (6 files)
│       └── routes/               # API routes (6 files)
│
└── frontend/                     # React TypeScript app
    ├── package.json
    ├── .env.example
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── services/api.ts       # API client (Fetch)
        ├── contexts/             # Auth context
        ├── components/           # Reusable components
        └── pages/                # 8 pages
```

---

## ✨ Fitur Utama

### For Admin
- ✅ Complete dashboard dengan real-time statistics
- ✅ CRUD branches (cabang)
- ✅ CRUD users (CS, HRD, Admin)
- ✅ View semua omzet dan commissions
- ✅ Calculate commissions otomatis
- ✅ Mark commissions as paid
- ✅ Audit log (mutations tracking)
- ✅ Reset user passwords

### For HRD
- ✅ Manage users dan branches
- ✅ Input dan edit omzet
- ✅ Calculate dan manage commissions
- ✅ View reports

### For CS (Customer Service)
- ✅ Input daily sales (omzet)
- ✅ View personal commissions
- ✅ View personal dashboard
- ✅ Change password

---

## 🔐 Security Features

- ✅ **JWT Authentication** - 7 days token expiry
- ✅ **Password Hashing** - bcrypt (10 rounds)
- ✅ **Role-Based Access Control** - admin, hrd, cs
- ✅ **SQL Injection Prevention** - Parameterized queries
- ✅ **Audit Trail** - mutations table + n8n_sync_log tracks all changes
- ✅ **CORS Configuration** - Environment-based
- ✅ **Foreign Key Constraints** - Data integrity

### N8N Webhook Security
- ✅ **API Key Authentication** - x-api-key header validation
- ✅ **Batch Processing** - Prevent deadlock (max 500 records/batch)
- ✅ **Input Validation** - Type checking & sanitization
- ✅ **Rate Limiting** - Max 100 requests/minute
- ✅ **Audit Logging** - Track all sync operations (n8n_sync_log)
- ✅ **Error Handling** - Graceful failures with proper status codes

---

## 📊 Commission Calculation

Sistem otomatis menghitung komisi berdasarkan tiered rules:

| Range Omzet | Commission % |
|-------------|--------------|
| 0 - 5M      | 2.5%         |
| 5M - 10M    | 3.5%         |
| 10M+        | 5.0%         |

Rules dapat dimodifikasi di table `commission_config`.

---

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/auth/profile` - Get profile
- `POST /api/auth/change-password` - Change password

### Branches
- `GET /api/branches` - List branches
- `POST /api/branches` - Create branch
- `PUT /api/branches/:id` - Update branch
- `DELETE /api/branches/:id` - Delete branch

### Users
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/reset-password` - Reset password

### Omzet (Sales)
- `POST /api/omzet/create` - Create omzet record
- `GET /api/omzet/by-date` - Get by date
- `GET /api/omzet/by-branch` - Get by branch (+ date range)
- `GET /api/omzet/by-user` - Get by user
- `GET /api/omzet/stats` - Get statistics

### N8N Integration
- `POST /api/omzet/webhook/n8n` - Receive from N8N webhook (3 branches)
  - Support modes: daily, update, bulk
  - Auth: x-api-key header
  - No JWT required (webhook authentication)
- `POST /api/omzet/sync/n8n` - Manual sync via webapp
  - Auth: JWT token required
  - Query date range (startDate, endDate)
  - Role: admin, hrd only

### Commissions
- `POST /api/commissions/calculate` - Calculate commissions
- `GET /api/commissions/by-user` - Get by user
- `GET /api/commissions/by-branch` - Get by branch
- `POST /api/commissions/mark-paid` - Mark as paid

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/mutations` - Audit log
- `GET /api/dashboard/weekly-report` - Weekly report
- `GET /api/dashboard/top-performers` - Top performers

**Total**: 25+ endpoints

Lihat `API-EXAMPLES.md` untuk contoh lengkap dengan cURL.

---

## 🚀 Production Deployment

### VPS Requirements
- Ubuntu 20.04+
- Node.js 16+
- PostgreSQL 12+
- Nginx
- PM2
- 2GB RAM minimum

### Quick Deployment
```bash
# 1. Setup database di VPS
sudo -u postgres createdb cs_commission
sudo -u postgres psql -d cs_commission -f schema.sql

# 2. Deploy backend
cd backend
cp .env.example .env
# Edit .env dengan production credentials (DB + N8N_WEBHOOK_SECRET)
npm install --production
npm run seed
pm2 start src/server.js --name "cs-commission-api"
pm2 save
pm2 startup

# 3. Deploy frontend
cd ../
npm install
npm run build
# Copy dist/ ke /var/www/cs-commission

# 4. Configure Nginx
# Setup reverse proxy: frontend → dist/, API → localhost:3000

# 5. Enable HTTPS
sudo certbot --nginx -d your-domain.com

# 6. Configure N8N webhooks
# Update N8N workflow:
# - Webhook URL: https://your-domain.com/api/omzet/webhook/n8n
# - Headers: x-api-key: $env.N8N_WEBHOOK_SECRET
# - Test with: curl -X POST https://your-domain.com/api/omzet/webhook/n8n ...
```

**Lihat `SETUP.md` untuk panduan lengkap. Lihat `README-N8N-WORKFLOW.md` untuk N8N configuration.**

---

## 🧪 Testing

### Run Backend Tests
```bash
cd server
npm start
# Test endpoint
curl http://localhost:3000/health
```

### Build Frontend
```bash
cd frontend
npm run build
# Output: dist/ folder (248 KB gzipped)
```

### API Testing

#### Standard API
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@commission.local","password":"admin123456"}'

# Get branches (with JWT token)
curl -X GET http://localhost:3000/api/branches \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### N8N Webhook Testing
```bash
# Test daily sync (no auth required, x-api-key header)
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_n8n_webhook_secret" \
  -d '{
    "branch": "UTM",
    "tanggal": "2024-01-15",
    "cash": 5000000,
    "piutang": 2000000,
    "mode": "daily"
  }'

# Test bulk import
curl -X POST http://localhost:3000/api/omzet/webhook/n8n \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_n8n_webhook_secret" \
  -d '{
    "mode": "bulk",
    "branch": "JTJ",
    "data": [
      {"tanggal": "2024-01-01", "cash": 3000000, "piutang": 1000000},
      {"tanggal": "2024-01-02", "cash": 3500000, "piutang": 1200000}
    ]
  }'

# Test manual sync via webapp (JWT required)
curl -X POST http://localhost:3000/api/omzet/sync/n8n \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "uuid-here",
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }'
```

**See README-N8N-WORKFLOW.md for detailed testing scenarios**

---

## 🐛 Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL running
sudo systemctl status postgresql

# Test connection
psql -U postgres -h localhost -d cs_commission
```

### Backend Not Starting
```bash
# Check logs
pm2 logs cs-commission-api

# Check port 3000
sudo lsof -i :3000
```

### Frontend Build Error
```bash
# Clear and reinstall
rm -rf node_modules
npm install
npm run build
```

### N8N Webhook Issues

**Issue: "Invalid webhook token"**
```bash
# Check N8N_WEBHOOK_SECRET is set
echo $N8N_WEBHOOK_SECRET

# Verify x-api-key header in N8N workflow
# Should match: N8N_WEBHOOK_SECRET in backend .env
```

**Issue: "Duplicate key value"**
- Cause: Same (branch, date) already exists
- Solution: Use mode="update" to revise data

**Issue: "Timeout after 30s (bulk import)"**
- Cause: Batch size too large
- Solution: Reduce batch size in N8N from 500 → 100

**Issue: "Branch not found"**
- Cause: branch_id mismatch
- Solution: Verify branch exists in webapp & matches N8N config

**See README-N8N-WORKFLOW.md → Monitoring section for more**

---

## 📦 Dependencies

### Backend (6 main packages)
- express - Web framework
- pg - PostgreSQL driver
- jsonwebtoken - JWT authentication
- bcrypt - Password hashing
- cors - CORS middleware
- dotenv - Environment variables

### Frontend (4 main packages)
- react - UI library
- react-router-dom - Routing
- typescript - Type safety
- lucide-react - Icons

---

## 📝 Environment Variables

### Backend (.env)
```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cs_commission
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Authentication
JWT_SECRET=your_secret_min_32_chars
JWT_EXPIRY=7d

# CORS & Server
CORS_ORIGIN=http://localhost:5173

# N8N Webhook Security
N8N_WEBHOOK_SECRET=your_super_secret_webhook_key_min_32_chars
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_APP_TITLE=CS Commission System
```

---

## 📖 Additional Resources

- **README-N8N-WORKFLOW.md** - N8N integration & workflow (⭐ START HERE)
- **MIGRATION-GUIDE.md** - Backend architecture & API conversion
- **SETUP.md** - Production deployment guide
- **EXAMPLE-REQUESTS.md** - 46+ cURL testing examples
- **API-ENDPOINTS.md** - Complete API reference
- **schema.sql** - Database schema
- **QUICK-START.md** - 5-minute setup guide

---

## 💡 Development Tips

1. **Database Changes**: Update `schema.sql` dan re-run
2. **API Changes**: Update controllers/services
3. **Frontend Changes**: Component-based architecture
4. **Testing**: Use Postman atau cURL untuk API testing
5. **Debugging**: Check PM2 logs dan PostgreSQL logs

---

## 🎯 Tech Stack Summary

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + Express + PostgreSQL
- **Auth**: JWT + bcrypt
- **Deployment**: Nginx + PM2
- **Database**: PostgreSQL 12+
- **Build Tool**: Vite
- **Process Manager**: PM2

**NO Supabase, NO Firebase, NO BaaS**

---

## 🔄 Data Flow & Workflow

### Standard Workflow
1. CS input daily sales → Omzet table
2. Admin calculate commissions → Commissions table
3. Admin mark as paid → Update status
4. View reports → Dashboard & statistics
5. Audit log → Track all changes

### N8N Integration Workflow
1. **POS/ERP System** → Sends sales data
2. **N8N Webhook** → Receives data from 3 branches (UTM, JTJ, TSM)
3. **N8N Processing**:
   - Validate x-api-key header
   - Determine mode (daily/update/bulk)
   - Split large batches (500 records/batch)
   - Transform date formats
4. **PostgreSQL** → Insert/Upsert to omzet table
5. **Auto-Trigger** → Calculate commissions
6. **Webapp** → Display reports & analytics

**Modes**:
- **daily** (default): Append new records only
- **update**: Revise existing records with version tracking
- **bulk**: Import historical data (1000+ records)

**See README-N8N-WORKFLOW.md for complete integration guide**

---

## ✅ Production Ready

- ✅ 36 source files
- ✅ 25+ API endpoints
- ✅ 11 database tables
- ✅ Complete documentation
- ✅ Build verified (248 KB)
- ✅ Security implemented
- ✅ Role-based access control

---

**Version**: 1.0.0
**Status**: Production Ready ✅
**Last Updated**: 2024

For complete setup instructions, see **CS-COMMISSION-SYSTEM-README.md**
