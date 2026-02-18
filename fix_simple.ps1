# Fix directo para agregar columnas faltantes en notificaciones_push
# Resuelve error 42703: column "cuerpo" does not exist

Write-Host "Iniciando fix de base de datos..." -ForegroundColor Cyan

# Credenciales de base de datos
$DB_HOST = "aws-0-us-west-2.pooler.supabase.com"
$DB_PORT = "6543"
$DB_USER = "postgres.dlchjtewqwpuichmuxwr"
$DB_PASSWORD = "ESCUELADEPADRES"
$DB_DATABASE = "postgres"

# SQL para agregar columnas
$sql = "ALTER TABLE notificaciones_push ADD COLUMN IF NOT EXISTS cuerpo TEXT; ALTER TABLE notificaciones_push ADD COLUMN IF NOT EXISTS datos JSONB;"

Write-Host "Creando archivo SQL temporal..." -ForegroundColor Yellow

# Crear archivo temporal
$tempFile = "fix_$(Get-Date -Format 'yyyyMMddHHmmss').sql"
$sql | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "Archivo creado: $tempFile" -ForegroundColor Green

# Intentar ejecutar con psql
try {
    Write-Host "Verificando psql..." -ForegroundColor Yellow
    $psqlCheck = Get-Command psql -ErrorAction Stop
    
    Write-Host "Ejecutando fix en base de datos..." -ForegroundColor Yellow
    $env:PGPASSWORD = $DB_PASSWORD
    
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c $sql 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "FIX APLICADO EXITOSAMENTE!" -ForegroundColor Green
        Write-Host "Las columnas han sido agregadas." -ForegroundColor Green
    } else {
        Write-Host "Error al ejecutar SQL:" -ForegroundColor Red
        Write-Host $result -ForegroundColor Yellow
    }
    
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "psql no disponible. Instrucciones manuales:" -ForegroundColor Yellow
    Write-Host "1. Instala PostgreSQL client" -ForegroundColor White
    Write-Host "2. Ejecuta estos comandos SQL:" -ForegroundColor White
    Write-Host $sql -ForegroundColor Cyan
    Write-Host "3. Conexion: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE" -ForegroundColor White
    Write-Host "4. Password: $DB_PASSWORD" -ForegroundColor Gray
}

# Limpiar
if (Test-Path $tempFile) {
    Remove-Item $tempFile
}

Write-Host "Script completado." -ForegroundColor Cyan