# Debug detallado del error 500 FCM
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== DEBUG ERROR 500 FCM ===" -ForegroundColor Green

$loginData = @{
    documento = "1061705869"
    password = "1061705869"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData

if ($response.success) {
    Write-Host "LOGIN OK" -ForegroundColor Green
    Write-Host "Usuario ID: $($response.user.id)" -ForegroundColor White
    Write-Host "Usuario email: $($response.user.email)" -ForegroundColor White
    
    $token = $response.token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Probar con token FCM MAS SIMPLE para evitar constraint issues
    Write-Host "Registrando FCM token simple..." -ForegroundColor Cyan
    $fcmData = @{
        fcmToken = "TEST_$(Get-Date -Format 'yyyyMMddHHmmss')"
        dispositivo = "test_device"
        sistemaOperativo = "test_os"
    } | ConvertTo-Json
    
    Write-Host "Datos a enviar:" -ForegroundColor Yellow
    Write-Host $fcmData -ForegroundColor White
    
    try {
        $fcmResponse = Invoke-WebRequest -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcmData -UseBasicParsing
        Write-Host "FCM EXITOSO - Status: $($fcmResponse.StatusCode)" -ForegroundColor Green
        Write-Host "Respuesta: $($fcmResponse.Content)" -ForegroundColor White
    }
    catch {
        Write-Host "ERROR 500 - Detalles:" -ForegroundColor Red
        Write-Host "Message: $($_.Exception.Message)" -ForegroundColor Yellow
        
        if ($_.Exception.Response) {
            $errorStream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($errorStream)
            $errorBody = $reader.ReadToEnd()
            Write-Host "Error Body: $errorBody" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "LOGIN FALLO" -ForegroundColor Red
}

Write-Host "=== FIN DEBUG ===" -ForegroundColor Green