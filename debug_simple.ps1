# Debug simple FCM
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== DEBUG FCM ===" -ForegroundColor Green

# Login
$loginData = @{
    documento = "1061705869"
    password = "1061705869"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData

if ($response.success) {
    Write-Host "LOGIN OK" -ForegroundColor Green
    
    $token = $response.data.token
    Write-Host "Token: $($token.Substring(0,30))..." -ForegroundColor White
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Test endpoint que sabemos funciona
    Write-Host "Probando /estudiantes..." -ForegroundColor Cyan
    try {
        $test = Invoke-RestMethod -Uri "$BASE_URL/api/movil/estudiantes" -Method GET -Headers $headers
        Write-Host "Estudiantes: OK" -ForegroundColor Green
    }
    catch {
        Write-Host "Estudiantes: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
    
    # Test FCM
    Write-Host "Probando FCM..." -ForegroundColor Cyan
    $fcmData = @{
        fcmToken = "TEST_DEBUG"
        dispositivo = "test"
    } | ConvertTo-Json
    
    try {
        $fcm = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcmData
        Write-Host "FCM: OK" -ForegroundColor Green
    }
    catch {
        Write-Host "FCM: ERROR - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "=== FIN ===" -ForegroundColor Green