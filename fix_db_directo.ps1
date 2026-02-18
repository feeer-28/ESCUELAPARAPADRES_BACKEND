# ===================================================================
# FIX DIRECTO DE BASE DE DATOS - Sin dependencia del backend
# ===================================================================
# Ejecuta comandos SQL directos para agregar columnas faltantes
# Resuelve error 42703: column "cuerpo" does not exist
# ===================================================================

Write-Host "🔧 INICIANDO FIX DIRECTO DE BASE DE DATOS..." -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Gray

# Configuración de conexión
$DB_HOST = "aws-0-us-west-2.pooler.supabase.com"
$DB_PORT = "6543"
$DB_USER = "postgres.dlchjtewqwpuichmuxwr"
$DB_PASSWORD = "ESCUELADEPADRES"
$DB_DATABASE = "postgres"

Write-Host "🔄 Creando script SQL para agregar columnas..." -ForegroundColor Yellow

# Crear archivo SQL temporal
$sqlScript = @'
-- Agregar columnas faltantes
ALTER TABLE notificaciones_push ADD COLUMN IF NOT EXISTS cuerpo TEXT;
ALTER TABLE notificaciones_push ADD COLUMN IF NOT EXISTS datos JSONB;

-- Verificar que se agregaron
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notificaciones_push' 
AND column_name IN ('cuerpo', 'datos');

-- Confirmación
SELECT 'FIX COMPLETADO - COLUMNAS AGREGADAS' as resultado, NOW() as fecha_fix;
'@

$tempFile = "fix_schema_$(Get-Date -Format 'yyyyMMddHHmmss').sql"
$sqlScript | Out-File -FilePath $tempFile -Encoding UTF8

Write-Host "📄 Script SQL creado: $tempFile" -ForegroundColor Green

# Verificar si psql está disponible
try {
    $psqlCheck = Get-Command psql -ErrorAction Stop
    Write-Host "✅ psql encontrado, ejecutando fix..." -ForegroundColor Green
    
    # Ejecutar SQL
    $env:PGPASSWORD = $DB_PASSWORD
    $result = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -f $tempFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ FIX APLICADO EXITOSAMENTE" -ForegroundColor Green
        Write-Host "🎉 Las columnas han sido agregadas a la base de datos" -ForegroundColor Green
        Write-Host "Resultado:`n$result" -ForegroundColor Gray
    } else {
        Write-Host "❌ Error al ejecutar SQL:" -ForegroundColor Red
        Write-Host "$result" -ForegroundColor Yellow
    }
    
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    
} catch {
    Write-Host "⚠️ psql no está disponible en este sistema" -ForegroundColor Yellow
    Write-Host "📋 Para aplicar el fix manualmente:" -ForegroundColor Cyan
    Write-Host "   1. Instala PostgreSQL client" -ForegroundColor White
    Write-Host "   2. Ejecuta: psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -f $tempFile" -ForegroundColor White
    Write-Host "   3. Password: $DB_PASSWORD" -ForegroundColor Gray
    Write-Host "📄 O copia estos comandos SQL y ejecútalos en cualquier cliente PostgreSQL:" -ForegroundColor Cyan
    Write-Host $sqlScript -ForegroundColor White
}

# Limpiar archivo temporal
if (Test-Path $tempFile) {
    Remove-Item $tempFile
}

Write-Host "`n=====================================================" -ForegroundColor Gray
Write-Host "🔧 Script completado." -ForegroundColor Cyan