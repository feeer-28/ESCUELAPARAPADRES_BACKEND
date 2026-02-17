# Test rápido para confirmar que el fix SQL funcionó
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "🔥 PROBANDO SISTEMA DESPUÉS DEL FIX SQL" -ForegroundColor Green

# 1. Login
$loginData = @{documento="1234567890";password="1234567890"} | ConvertTo-Json
$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData

if ($loginResponse.success) {
    Write-Host "✅ LOGIN EXITOSO" -ForegroundColor Green
    
    # 2. Test FCM
    $token = $loginResponse.token
    $headers = @{"Authorization" = "Bearer $token"; "Content-Type" = "application/json"}
    
    $fcmData = @{
        fcmToken = "TEST_POST_FIX_$(Get-Date -Format 'HHmm')"
        dispositivo = "test_fix_device"
        sistemaOperativo = "android" 
        versionApp = "1.0"
    } | ConvertTo-Json
    
    try {
        Write-Host "🔧 Probando registro FCM DESPUÉS del fix..." -ForegroundColor Cyan
        $fcmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcmData
        
        Write-Host "🎉 ¡REGISTRO FCM EXITOSO!" -ForegroundColor Green
        Write-Host "   Respuesta: $($fcmResponse.message)" -ForegroundColor White
        Write-Host "   El error 42703 está RESUELTO ✅" -ForegroundColor Green
        
    }
    catch {
        Write-Host "❌ Error FCM: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   Puede necesitar más tiempo o hay otro problema" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Error en login" -ForegroundColor Red
}

Write-Host "`n🏁 PRUEBA COMPLETADA" -ForegroundColor Green