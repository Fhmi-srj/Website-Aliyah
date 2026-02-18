#!/bin/bash
#======================================================================
# Deploy Script for Website-Aliyah (Laravel + Vite)
# Jalankan di terminal hosting (SSH):
#   cd /home/diantar2/absen.mahakam.sch.id && bash deploy.sh
#
# Options:
#   --fresh-db    : Reset database (migrate:fresh + seed) ⚠️ HAPUS SEMUA DATA
#   --no-build    : Skip npm install & build (jika tidak ada perubahan frontend)
#   --seed        : Jalankan seeder setelah migrate
#
# Catatan:
#   Frontend assets (public/build/) sudah di-commit ke Git.
#   Jadi npm build hanya dijalankan jika npm tersedia di server.
#   Jika tidak ada npm, build dilakukan di lokal sebelum push.
#======================================================================

set -e  # Berhenti jika ada error

# ── Warna Output ─────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Parse Arguments ──────────────────────────────────────────────────
FRESH_DB=false
NO_BUILD=false
RUN_SEED=false

for arg in "$@"; do
    case $arg in
        --fresh-db) FRESH_DB=true ;;
        --no-build) NO_BUILD=true ;;
        --seed)     RUN_SEED=true ;;
    esac
done

# ── Helper Functions ─────────────────────────────────────────────────
step() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

warn() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# ── Safety: Pastikan site kembali online jika script error ───────────
cleanup() {
    echo -e "\n${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    error "Deploy gagal! Mengembalikan aplikasi ke online..."
    php artisan up 2>/dev/null || true
    success "Aplikasi kembali online (tapi deploy belum selesai)"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}
trap cleanup ERR

# ── Start ────────────────────────────────────────────────────────────
echo -e "\n${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     🚀 DEPLOY WEBSITE-ALIYAH                ║${NC}"
echo -e "${CYAN}║     $(date '+%Y-%m-%d %H:%M:%S')                  ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"

# ── 1. Maintenance Mode ─────────────────────────────────────────────
step "1/7 — Mengaktifkan Maintenance Mode"
php artisan down --retry=60 --refresh=15 2>/dev/null || true
success "Maintenance mode aktif"

# ── 2. Pull Latest Code ─────────────────────────────────────────────
step "2/7 — Mengambil kode terbaru dari Git"
git fetch origin main
git reset --hard origin/main
success "Kode berhasil diperbarui ke $(git log --oneline -1)"

# ── 3. Composer Dependencies ────────────────────────────────────────
step "3/7 — Menginstall dependencies PHP (Composer)"
composer install --no-dev --optimize-autoloader --no-interaction 2>&1
success "Dependencies PHP selesai"

# ── 4. NPM Build (Frontend) ─────────────────────────────────────────
step "4/7 — Cek frontend assets"
if [ "$NO_BUILD" = true ]; then
    warn "NPM build dilewati (--no-build)"
elif command -v npm &> /dev/null; then
    echo "npm ditemukan, menjalankan build..."
    npm ci --production=false 2>&1
    npm run build 2>&1
    success "Frontend assets berhasil di-build di server"
else
    if [ -d "public/build" ] && [ -f "public/build/manifest.json" ]; then
        success "npm tidak tersedia, tapi build assets sudah ada dari Git"
        warn "Pastikan 'npm run build' dijalankan di lokal sebelum push"
    else
        error "npm tidak tersedia dan build assets tidak ditemukan!"
        error "Jalankan 'npm run build' di lokal, commit, lalu push ulang"
    fi
fi

# ── 5. Database Migration ────────────────────────────────────────────
step "5/7 — Migrasi Database"
if [ "$FRESH_DB" = true ]; then
    warn "⚠️  FRESH DATABASE — Semua data akan dihapus!"
    read -p "Yakin ingin fresh database? (ketik 'yes'): " confirm
    if [ "$confirm" = "yes" ]; then
        php artisan migrate:fresh --seed --force 2>&1
        success "Database di-reset dan di-seed"
    else
        error "Dibatalkan. Menjalankan migrate biasa..."
        php artisan migrate --force 2>&1
        success "Migrasi database selesai"
    fi
else
    php artisan migrate --force 2>&1
    success "Migrasi database selesai"
fi

# Seed jika diminta
if [ "$RUN_SEED" = true ] && [ "$FRESH_DB" = false ]; then
    php artisan db:seed --force 2>&1
    success "Seeder berhasil dijalankan"
fi

# ── 6. Cache & Optimization ─────────────────────────────────────────
step "6/7 — Optimasi Cache"
php artisan config:clear 2>&1
php artisan route:clear 2>&1
php artisan view:clear 2>&1
php artisan cache:clear 2>&1

php artisan config:cache 2>&1
php artisan route:cache 2>&1
php artisan view:cache 2>&1

success "Cache sudah di-rebuild"

# ── 7. Storage, Permissions & Go Live ────────────────────────────────
step "7/7 — Storage Link, Permissions & Go Live"
php artisan storage:link 2>/dev/null || true

# Set permissions yang benar
chmod -R 755 storage bootstrap/cache 2>/dev/null || true
chmod -R 644 storage/logs/*.log 2>/dev/null || true

success "Storage link & permissions diperbarui"

# Matikan maintenance mode
php artisan up 2>&1
success "Aplikasi kembali online!"

# ── Summary ──────────────────────────────────────────────────────────
echo -e "\n${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ DEPLOY SELESAI!                       ║${NC}"
echo -e "${GREEN}║     Commit : $(git log --oneline -1 | head -c 40)${NC}"
echo -e "${GREEN}║     Waktu  : $(date '+%H:%M:%S')                       ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
