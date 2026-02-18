# Test FCM con despertar de servidor
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== DESPERTANDO SERVIDOR RENDER ===" -ForegroundColor Magenta
Write-Host "Despertando servidor... (puede tardar 1 minuto)" -ForegroundColor Yellow

$loginData = @{
    documento = "1061705869"
    password = "1061705869"
} | ConvertTo-Json

try {
    # Primera peticion con timeout largo para despertar
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData -TimeoutSec 90
    
    if ($response.success) {
        Write-Host "LOGIN EXITOSO - SERVIDOR DESPIERTO!" -ForegroundColor Green
        
        # Probar FCM Token
        Write-Host "Probando FCM Token..." -ForegroundColor Cyan
        
        $fcmData = @{
            fcmToken = "c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI"
            dispositivo = "moto e40"
            sistemaOperativo = "android"  
            versionApp = "1.0"
        } | ConvertTo-Json
        
        $headers = @{
            "Authorization" = "Bearer $($response.data.token)"
            "Content-Type" = "application/json"
        }
        
        $fcmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcmData -TimeoutSec 30
        
        Write-Host "FCM TOKEN REGISTRADO EXITOSAMENTE!" -ForegroundColor Green
        Write-Host "Respuesta: $($fcmResponse.message)" -ForegroundColor White
        
    } else {
        Write-Host "LOGIN FALLO: $($response.message)" -ForegroundColor Red  
    }
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Message.Contains("timeout") -or $_.Exception.Message.Contains("tiempo")) {
        Write-Host "El servidor esta muy lento - es normal en Render.com" -ForegroundColor Yellow
    }
}

Write-Host "=== FIN TEST FCM ===" -ForegroundColor Magenta