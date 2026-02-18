# Monitoreo post-deploy simplificado
Write-Host "MONITOREANDO POST-DEPLOY DE FIREBASE" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Gray

$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "`nEsperando estabilizacion del servidor..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test 1: Conectividad
Write-Host "`nTest 1: Conectividad del servidor" -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL" -Method Get -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Servidor respondiendo" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Servidor responde con codigo: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error de conectividad: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Login 
Write-Host "`nTest 2: Sistema de autenticacion" -ForegroundColor White
$loginData = @{
    numero_documento = "12345678"
    password = "password123"
    tipo_usuario = "acudiente"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/login" -Method Post -Body $loginData -ContentType "application/json" -TimeoutSec 15
    if ($loginResponse.token) {
        Write-Host "✅ Login funcionando - Token obtenido" -ForegroundColor Green
        $TOKEN = $loginResponse.token
        
        # Test 3: FCM (CRITICO)
        Write-Host "`nTest 3: Registro FCM (CRITICO)" -ForegroundColor White
        $fcmData = @{
            fcm_token = "MONITOR_TEST_$(Get-Date -Format 'HHmmss')"
            device_info = @{
                platform = "android"
                version = "1.0.0"
            } | ConvertTo-Json
        } | ConvertTo-Json
        
        try {
            $fcmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/registrar-fcm" -Method Post -Body $fcmData -ContentType "application/json" -Headers @{"Authorization" = "Bearer $TOKEN"} -TimeoutSec 15
            
            if ($fcmResponse.message -match "exitosamente") {
                Write-Host "🎉 FCM REGISTRATION EXITOSO - FIREBASE FUNCIONANDO!" -ForegroundColor Green
            } else {
                Write-Host "⚠️ FCM respuesta inesperada:" -ForegroundColor Yellow
                Write-Host ($fcmResponse | ConvertTo-Json) -ForegroundColor Gray
            }
        } catch {
            Write-Host "❌ FCM registration fallo: $($_.Exception.Message)" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Login fallo - No se obtuvo token" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n====================================" -ForegroundColor Gray
Write-Host "MONITOREO COMPLETADO" -ForegroundColor Cyan