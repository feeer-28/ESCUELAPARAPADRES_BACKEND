# Test final rapido FCM
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== TEST FINAL FCM ===" -ForegroundColor Green

# Login rapido
$login = @{ documento = "1061705869"; password = "1061705869" } | ConvertTo-Json
$resp = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $login -TimeoutSec 60

if ($resp.success) {
    Write-Host "✅ LOGIN OK" -ForegroundColor Green
    
    # FCM con timeout largo
    $fcm = @{ fcmToken = "TEST_FINAL_$(Get-Date -Format 'mmss')"; dispositivo = "test" } | ConvertTo-Json
    $headers = @{ "Authorization" = "Bearer $($resp.token)"; "Content-Type" = "application/json" }
    
    try {
        $result = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcm -TimeoutSec 30
        Write-Host "🎉 FCM EXITOSO!" -ForegroundColor Green
        Write-Host "Respuesta: $($result.message)" -ForegroundColor White
    }
    catch {
        Write-Host "❌ FCM Error: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "❌ LOGIN FALLO" -ForegroundColor Red
}

Write-Host "=== FIN ===" -ForegroundColor Green