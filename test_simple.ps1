# Test simple FCM token
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== TEST SIMPLE FCM ===" -ForegroundColor Green

# Login 
$loginData = @{
    documento = "1061705869"
    password = "1061705869"
}

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body ($loginData | ConvertTo-Json)
    
    if ($loginResponse.success) {
        Write-Host "✅ LOGIN OK" -ForegroundColor Green
        
        # FCM Token
        $fcmData = @{
            fcmToken = "c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI"
            dispositivo = "moto e40"
            sistemaOperativo = "android"
            versionApp = "1.0"
        }
        
        $headers = @{
            "Authorization" = "Bearer $($loginResponse.data.token)"
            "Content-Type" = "application/json"
        }
        
        $fcmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body ($fcmData | ConvertTo-Json)
        
        Write-Host "✅ FCM TOKEN REGISTRADO!" -ForegroundColor Green
    }
    else {
        Write-Host "❌ LOGIN FALLO: $($loginResponse.message)" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== FIN ===" -ForegroundColor Green