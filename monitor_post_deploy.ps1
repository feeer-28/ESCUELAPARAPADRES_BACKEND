# Script de monitoreo post-deploy
# Ejecutar en ~5 minutos para verificar que Firebase está funcionando

Write-Host "🔍 MONITOREANDO POST-DEPLOY DE FIREBASE" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Gray

$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "`n⏰ Esperando estabilización del servidor..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test básico de conectividad
Write-Host "`nTest 1: Conectividad del servidor" -ForegroundColor White
try {
    $response = Invoke-WebRequest -Uri "$BASE_URL" -Method Get -UseBasicParsing -TimeoutSec 15
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Servidor respondiendo" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Servidor responde con código: $($response.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Error de conectividad: $($_.Exception.Message)" -ForegroundColor Red
}

# Test de login para obtener token
Write-Host "`nTest 2: Sistema de autenticación" -ForegroundColor White
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
        
        # Test FCM registration (donde estaba el error)
        Write-Host "`nTest 3: Registro FCM (CRÍTICO)" -ForegroundColor White
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
                Write-Host "🎉 FCM REGISTRATION EXITOSO - TODOS LOS PROBLEMAS RESUELTOS!" -ForegroundColor Green
            } else {
                Write-Host "⚠️ FCM respuesta inesperada: $($fcmResponse | Out-String)" -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ FCM registration falló: $($_.Exception.Message)" -ForegroundColor Red
            Write-Host "   Esto indicaría que necesitas un redeploy adicional" -ForegroundColor Red
        }
        
    } else {
        Write-Host "❌ Login falló - No se obtuvo token" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error en login: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n======================================" -ForegroundColor Gray
Write-Host "🏁 MONITOREO COMPLETADO" -ForegroundColor Cyan

Write-Host "`nRESULTADOS ESPERADOS:" -ForegroundColor Yellow
Write-Host "✅ Servidor respondiendo" -ForegroundColor White
Write-Host "✅ Login funcionando" -ForegroundColor White  
Write-Host "✅ FCM registration exitoso" -ForegroundColor White

Write-Host "`nSI ALGO FALLA:" -ForegroundColor Red
Write-Host "1. Revisa logs de Render para errores Firebase" -ForegroundColor White
Write-Host "2. Si persiste error, considera redeploy" -ForegroundColor White
Write-Host "3. O contacta para debug adicional" -ForegroundColor White

Write-Host "`n======================================" -ForegroundColor Gray