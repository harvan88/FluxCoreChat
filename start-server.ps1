# Script para iniciar el servidor FluxCore
# Uso: .\start-server.ps1

Write-Host "🚀 FluxCore - Iniciar Servidor" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Verificar que Docker está corriendo
Write-Host "Verificando Docker..." -ForegroundColor Yellow
docker ps 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker no está corriendo. Por favor inicia Docker Desktop." -ForegroundColor Red
    exit 1
}

$postgresContainer = docker ps --filter "name=fluxcore-postgres" --format "{{.Names}}"
if ($postgresContainer -ne "fluxcore-postgres") {
    Write-Host "❌ Contenedor PostgreSQL no está corriendo." -ForegroundColor Red
    Write-Host "`nIniciando contenedor PostgreSQL..." -ForegroundColor Yellow
    docker run --name fluxcore-postgres -e POSTGRES_DB=fluxcore -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:14
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Error al iniciar PostgreSQL" -ForegroundColor Red
        Write-Host "Si el contenedor ya existe, ejecuta: docker start fluxcore-postgres" -ForegroundColor Yellow
        exit 1
    }
    
    Write-Host "⏳ Esperando a que PostgreSQL esté listo..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

Write-Host "✅ PostgreSQL está corriendo`n" -ForegroundColor Green

# Aplicar migraciones
Write-Host "Aplicando migraciones..." -ForegroundColor Yellow
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

# Iniciar servidor
Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host "Presiona Ctrl+C para detener el servidor`n" -ForegroundColor Cyan

$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/fluxcore"
bun run dev
