# Test FCM sin confirmaciones
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== TEST FCM ACTUALIZADO ===" -ForegroundColor Green

# Login
$loginData = @{
    documento = "1234567890"
    password = "1234567890"
} | ConvertTo-Json

Write-Host "Login..." -ForegroundColor Cyan
$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData

if ($loginResponse.success) {
    Write-Host "✅ LOGIN EXITOSO" -ForegroundColor Green
    
    # FCM Token
    $fcmData = @{
        fcmToken = "c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI"
        dispositivo = "moto e40"
        sistemaOperativo = "android"
        versionApp = "1.0"
    } | ConvertTo-Json
    
    $headers = @{
        "Authorization" = "Bearer $($loginResponse.token)"
        "Content-Type" = "application/json"
    }
    
    Write-Host "Registrando FCM..." -ForegroundColor Cyan
    try {
        $fcmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcmData
        Write-Host "🎉 FCM TOKEN REGISTRADO EXITOSAMENTE!" -ForegroundColor Green
        Write-Host "Respuesta: $($fcmResponse.message)" -ForegroundColor White
    }
    catch {
        Write-Host "❌ ERROR FCM: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ LOGIN FALLO: $($loginResponse.message)" -ForegroundColor Red
}

Write-Host "=== FIN ===" -ForegroundColor Green