# Test FCM con estructura de respuesta corregida
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== TEST FCM CORREGIDO ===" -ForegroundColor Green

$loginData = @{
    documento = "1061705869"
    password = "1061705869"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData

if ($response.success) {
    Write-Host "LOGIN OK" -ForegroundColor Green
    
    # CORRECION: usar response.token en lugar de response.data.token
    $token = $response.token
    Write-Host "Token obtenido: $($token.Substring(0,50))..." -ForegroundColor White
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Probar FCM con el token correcto
    Write-Host "Registrando FCM token..." -ForegroundColor Cyan
    $fcmData = @{
        fcmToken = "c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI"
        dispositivo = "moto e40"
        sistemaOperativo = "android"
        versionApp = "1.0"
    } | ConvertTo-Json
    
    try {
        $fcmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcmData
        Write-Host "FCM TOKEN REGISTRADO EXITOSAMENTE!" -ForegroundColor Green
        Write-Host "Respuesta: $($fcmResponse.message)" -ForegroundColor White
        Write-Host "Tu token FCM real esta registrado en el sistema!" -ForegroundColor Yellow
    }
    catch {
        Write-Host "ERROR en FCM: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "LOGIN FALLO" -ForegroundColor Red
}

Write-Host "=== FIN TEST ===" -ForegroundColor Green