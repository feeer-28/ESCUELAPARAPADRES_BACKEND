# Test de nuevos endpoints de autenticación

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTING ENDPOINTS DE LOGIN POR ROL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Test Login Rector
Write-Host "1. TEST: POST /rectores/login" -ForegroundColor Yellow
$rectorBody = @{
    correo = "rector.test@instituciontest.edu.co"
    contrasena = "MiNueva123!"
} | ConvertTo-Json

try {
    $rectorResp = Invoke-RestMethod -Uri 'http://localhost:3333/rectores/login' -Method Post -Body $rectorBody -ContentType 'application/json'
    Write-Host "   SUCCESS: Rector login funciona" -ForegroundColor Green
    Write-Host "   Token: $($rectorResp.data.token.Substring(0, 30))..." -ForegroundColor Gray
    Write-Host "   Usuario: $($rectorResp.data.usuario.correo)" -ForegroundColor White
    Write-Host "   Rol: $($rectorResp.data.usuario.rolNombre)" -ForegroundColor White
    Write-Host "   Institucion: $($rectorResp.data.usuario.institucion)" -ForegroundColor White
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 2. Test Login Coordinador
Write-Host "2. TEST: POST /coordinadores/login" -ForegroundColor Yellow
$coordBody = @{
    correo = "coordinador@instituciontest.edu.co"
    contrasena = "Coordinador123!"
} | ConvertTo-Json

try {
    $coordResp = Invoke-RestMethod -Uri 'http://localhost:3333/coordinadores/login' -Method Post -Body $coordBody -ContentType 'application/json'
    Write-Host "   SUCCESS: Coordinador login funciona" -ForegroundColor Green
    Write-Host "   Usuario: $($coordResp.data.usuario.correo)" -ForegroundColor White
    Write-Host "   Rol: $($coordResp.data.usuario.rolNombre)" -ForegroundColor White
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. Test Login Docente (ya existente)
Write-Host "3. TEST: POST /docentes/login (ya existente)" -ForegroundColor Yellow
Write-Host "   INFO: Este endpoint ya existia" -ForegroundColor Cyan

Write-Host ""

# 4. Test validación de rol incorrecto
Write-Host "4. TEST: Validacion de rol incorrecto" -ForegroundColor Yellow
$adminBody = @{
    correo = "admin@educacionpopayan.gov.co"
    contrasena = "Admin123!"
} | ConvertTo-Json

try {
    $adminResp = Invoke-RestMethod -Uri 'http://localhost:3333/rectores/login' -Method Post -Body $adminBody -ContentType 'application/json'
    Write-Host "   ERROR: Deberia rechazar admin en endpoint de rector" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "   SUCCESS: Correctamente rechaza usuario con rol incorrecto" -ForegroundColor Green
    } else {
        Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "POST /rectores/login - IMPLEMENTADO" -ForegroundColor Green
Write-Host "POST /coordinadores/login - IMPLEMENTADO" -ForegroundColor Green
Write-Host "POST /docentes/login - YA EXISTIA" -ForegroundColor Yellow
Write-Host "POST /acudientes/login - YA EXISTIA" -ForegroundColor Yellow
Write-Host ""
