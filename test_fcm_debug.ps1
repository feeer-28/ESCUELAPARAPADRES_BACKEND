# Test directo del token FCM con DEBUG
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== TEST DIRECTO FCM TOKEN ===" -ForegroundColor Green

# Datos de login corregidos - DOCUMENTO
$loginData = @{
    documento = "1234567890"
    password = "1234567890"
} | ConvertTo-Json

Write-Host "Payload de login:" -ForegroundColor Yellow
Write-Host $loginData -ForegroundColor White

Write-Host "`nHaciendo login..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData -UseBasicParsing
    $loginResult = $response.Content | ConvertFrom-Json
    
    Write-Host "`nRespuesta de login:" -ForegroundColor Yellow
    Write-Host ($loginResult | ConvertTo-Json -Depth 3) -ForegroundColor White
    
    if ($loginResult.success) {
        Write-Host "`nLOGIN EXITOSO" -ForegroundColor Green
        
        $token = $loginResult.data.token
        Write-Host "Token obtenido:" -ForegroundColor Yellow
        Write-Host $token -ForegroundColor White
        
        # Headers con token
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }

        Write-Host "`nHeaders a enviar:" -ForegroundColor Yellow
        Write-Host ($headers | ConvertTo-Json) -ForegroundColor White

        # Test registro FCM con tu token real
        $fcmData = @{
            fcmToken = "c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI"
            dispositivo = "moto e40"
            sistemaOperativo = "android"
            versionApp = "1.0"
        } | ConvertTo-Json

        Write-Host "`nPayload FCM:" -ForegroundColor Yellow
        Write-Host $fcmData -ForegroundColor White

        Write-Host "`nRegistrando token FCM..." -ForegroundColor Cyan
        
        try {
            $fcmResponse = Invoke-WebRequest -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcmData -UseBasicParsing
            $fcmResult = $fcmResponse.Content | ConvertFrom-Json
            Write-Host "`nTOKEN FCM REGISTRADO EXITOSAMENTE!" -ForegroundColor Green
            Write-Host "Respuesta:" -ForegroundColor Yellow
            Write-Host ($fcmResult | ConvertTo-Json -Depth 3) -ForegroundColor White
        }
        catch {
            Write-Host "`nERROR al registrar FCM token:" -ForegroundColor Red
            Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Yellow
            
            # Mostrar detalles del error si están disponibles
            if ($_.Exception.Response) {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorDetails = $reader.ReadToEnd()
                Write-Host "Detalles del error: $errorDetails" -ForegroundColor Yellow
                
                Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
                Write-Host "Headers de respuesta: $($_.Exception.Response.Headers)" -ForegroundColor Gray
            }
        }
    }
    else {
        Write-Host "`nLOGIN FALLIDO: $($loginResult.message)" -ForegroundColor Red
    }
}
catch {
    Write-Host "`nERROR EN LOGIN:" -ForegroundColor Red
    Write-Host "Exception: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n=== FIN TEST ===" -ForegroundColor Green