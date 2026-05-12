# TailorFlow

SaaS multi-tenant untuk penjahit: order, pelanggan, faktur, billing, dan audit log — dirancang untuk isolasi data per `businessId`, RBAC, dan deployment production.

## Stack

- Next.js 15 (App Router), React 19, TypeScript strict
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v5) — JWT session
- Upstash Redis (opsional) untuk rate limiting terdistribusi
- Cloudinary untuk upload gambar

## Setup lokal

1. **Node.js** 22+ dan **PostgreSQL** 14+.
2. Salin environment:

   ```bash
   cp .env.example .env
   ```

   Isi minimal: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`.

3. **Redis (opsional, disarankan production):** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — mengaktifkan rate limit login/register/forgot yang konsisten antar instance.

4. Install dan migrasi:

   ```bash
   npm ci
   npx prisma migrate dev
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000).

## Environment penting

| Variabel | Keterangan |
|----------|------------|
| `DATABASE_URL` | Connection string PostgreSQL |
| `AUTH_SECRET` | Secret Auth.js (generate panjang acak) |
| `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL` | URL publik aplikasi (HTTPS di production) |
| `UPSTASH_REDIS_*` | Rate limiting terdistribusi |
| `CLOUDINARY_*` | Upload logo & lampiran order |

## Multi-tenant & keamanan

- Semua query bisnis harus mem-filter `businessId` sesi; gunakan helper `requireSessionBusinessId`, `orderScopeForRole`, dan `validateTenantOwnership`.
- RBAC: `OWNER`, `ADMIN`, `PEGAWAI` — matriks di `src/lib/permissions.ts`; guard halaman dengan `requirePermission` / `requireAnyPermission`.
- Pegawai melihat order **pool** (`assignedUserId` null) atau order yang di-assign ke mereka.
- Header keamanan (CSP, HSTS di production, frame-ancestors) di `next.config.ts`; middleware menambahkan kebijakan referrer/XFO untuk rute auth/dashboard.

## Skrip

- `npm run dev` — development
- `npm run build` / `npm start` — production
- `npm run lint` — ESLint
- `npm run test` — Vitest (unit)
- `npm run test:e2e` — Playwright (set `PLAYWRIGHT_BASE_URL` jika perlu)

## Deployment

- **Vercel / Railway:** set env, jalankan `prisma migrate deploy` pada release, pastikan `AUTH_SECRET` dan URL konsisten.
- **Docker:** image multi-stage di `Dockerfile` memakai output `standalone` Next.js. Build: `docker build -t tailorflow .` — pastikan `DATABASE_URL` tersedia di runtime container.
- **Health check:** `GET /api/health` — cek koneksi DB (tanpa data sensitif).

## Backup database

- Gunakan backup otomatis penyedia Postgres (Point-in-Time Recovery, snapshot harian).
- Retensi disarankan: minimal 7 hari operational, 30+ hari untuk compliance.
- Restore: restore snapshot ke instance baru, update `DATABASE_URL`, jalankan migrasi jika versi skema berbeda.

## Pengembangan lanjutan

- Lapisan: `src/lib` (permissions, tenant, rate limit, sanitize), `src/actions`, `src/app/api`, komponen UI.
- Sebelum fitur AI besar: pastikan quota paket (`src/lib/plans.ts`) dan upload (`src/app/api/upload/order`) tetap dijalankan di backend.

## Lisensi

Private — TailorFlow.
