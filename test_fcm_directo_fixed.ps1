# Test directo del token FCM  
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== TEST DIRECTO FCM TOKEN ===" -ForegroundColor Green

# Datos de login corregidos - DOCUMENTO
$loginData = @{
    documento = "1234567890"
    password = "1234567890"
} | ConvertTo-Json

Write-Host "Haciendo login..." -ForegroundColor Cyan

try {
    $response = Invoke-WebRequest -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData
    $loginResult = $response.Content | ConvertFrom-Json
    
    if ($loginResult.success) {
        Write-Host "LOGIN EXITOSO" -ForegroundColor Green
        
        # Headers con token
        $headers = @{
            "Authorization" = "Bearer $($loginResult.data.token)"
            "Content-Type" = "application/json"
        }

        # Test registro FCM con tu token real
        $fcmData = @{
            fcmToken = "c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI"
            dispositivo = "moto e40"
            sistemaOperativo = "android"
            versionApp = "1.0"
        } | ConvertTo-Json

        Write-Host "Registrando token FCM..." -ForegroundColor Cyan
        
        try {
            $fcmResponse = Invoke-WebRequest -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcmData
            $fcmResult = $fcmResponse.Content | ConvertFrom-Json
            Write-Host "TOKEN FCM REGISTRADO EXITOSAMENTE!" -ForegroundColor Green
            Write-Host "Respuesta: $($fcmResult.message)" -ForegroundColor White
        }
        catch {
            Write-Host "ERROR al registrar FCM token:" -ForegroundColor Red
            Write-Host $_.Exception.Message -ForegroundColor Yellow
            
            # Mostrar detalles del error si están disponibles
            if ($_.Exception.Response) {
                $errorStream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($errorStream)
                $errorDetails = $reader.ReadToEnd()
                Write-Host "Detalles del error: $errorDetails" -ForegroundColor Yellow
            }
        }
    }
    else {
        Write-Host "LOGIN FALLIDO: $($loginResult.message)" -ForegroundColor Red
    }
}
catch {
    Write-Host "ERROR EN LOGIN:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}

Write-Host "=== FIN TEST ===" -ForegroundColor Green