# Script para ejecutar las pruebas de FluxCore
# Uso: .\run-tests.ps1

Write-Host "🧪 FluxCore - Script de Pruebas" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Verificar que Docker está corriendo
Write-Host "1️⃣  Verificando Docker..." -ForegroundColor Yellow
docker ps 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker no está corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
    exit 1
}

$postgresContainer = docker ps --filter "name=fluxcore-postgres" --format "{{.Names}}"
if ($postgresContainer -ne "fluxcore-postgres") {
    Write-Host "❌ Contenedor PostgreSQL no está corriendo." -ForegroundColor Red
    Write-Host "Ejecuta: docker run --name fluxcore-postgres -e POSTGRES_DB=fluxcore -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PostgreSQL está corriendo`n" -ForegroundColor Green

# Aplicar migraciones
Write-Host "2️⃣  Aplicando migraciones..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/fluxcore"

Push-Location packages\db
bun run src/migrate.ts
$migrationResult = $LASTEXITCODE
Pop-Location

if ($migrationResult -ne 0) {
    Write-Host "❌ Error al aplicar migraciones" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Migraciones aplicadas correctamente`n" -ForegroundColor Green

# Verificar si el servidor está corriendo
Write-Host "3️⃣  Verificando servidor API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "✅ Servidor API está corriendo`n" -ForegroundColor Green
    $serverRunning = $true
} catch {
    Write-Host "⚠️  Servidor API no está corriendo" -ForegroundColor Yellow
    Write-Host "Debes iniciar el servidor en otra terminal con:" -ForegroundColor Yellow
    Write-Host "`$env:DATABASE_URL=`"postgresql://postgres:postgres@localhost:5432/fluxcore`"; bun run dev`n" -ForegroundColor Cyan
    $serverRunning = $false
}

if (-not $serverRunning) {
    Write-Host "¿Quieres que inicie el servidor ahora? (s/n): " -NoNewline -ForegroundColor Yellow
    $response = Read-Host
    if ($response -eq "s" -or $response -eq "S") {
        Write-Host "`nIniciando servidor..." -ForegroundColor Yellow
        Write-Host "NOTA: El servidor se ejecutará en esta terminal. Abre otra terminal para ejecutar las pruebas.`n" -ForegroundColor Cyan
        $env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/fluxcore"
        bun run dev
        exit 0
    } else {
        Write-Host "`nPor favor inicia el servidor manualmente y vuelve a ejecutar este script.`n" -ForegroundColor Yellow
        exit 1
    }
}

# Ejecutar pruebas
Write-Host "4️⃣  Ejecutando pruebas...`n" -ForegroundColor Yellow

Write-Host "📝 Pruebas de Identidad (Hito 1)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
bun run apps/api/src/test-api.ts

Write-Host "`n📝 Pruebas de Chat (Hito 2)" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
bun run apps/api/src/test-chat.ts

Write-Host "`n✅ Pruebas completadas!" -ForegroundColor Green
