# Script simple para probar notificaciones FCM
param()

$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== PRUEBA DE NOTIFICACIONES FCM ===" -ForegroundColor Magenta

# Login
$credentials = @{
    correo = "1061705869@escuelaparapadres.com"
    contrasena = "1061705869"
}

Write-Host "1. Haciendo login..." -ForegroundColor Cyan

$loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body ($credentials | ConvertTo-Json)

if ($loginResponse.success) {
    $token = $loginResponse.data.token
    Write-Host "   Login exitoso" -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    Write-Host "2. Probando registro FCM..." -ForegroundColor Cyan
    
    # Usar estructura que debería funcionar según MovilController
    $fcmPayload = @{
        fcmToken = "c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI"
        dispositivo = "moto e40"
        sistemaOperativo = "android"
        versionApp = "1.0"
    }

    try {
        $fcmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body ($fcmPayload | ConvertTo-Json)
        Write-Host "   Registro FCM exitoso!" -ForegroundColor Green
        Write-Host "   Respuesta: $($fcmResponse.message)" -ForegroundColor White
    }
    catch {
        $errorMsg = $_.Exception.Message
        Write-Host "   ERROR en registro FCM" -ForegroundColor Red
        Write-Host "   Error: $errorMsg" -ForegroundColor Red
        
        # Intentar obtener más detalles del error
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $responseBody = $reader.ReadToEnd()
            Write-Host "   Detalles: $responseBody" -ForegroundColor Yellow
        }
    }

    Write-Host "3. Verificando notificaciones actuales..." -ForegroundColor Cyan
    
    try {
        $notifResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones" -Method GET -Headers $headers
        Write-Host "   Notificaciones obtenidas correctamente" -ForegroundColor Green
        Write-Host "   Total: $($notifResponse.data.notificaciones.Count)" -ForegroundColor White
        Write-Host "   No leidas: $($notifResponse.data.meta.noLeidas)" -ForegroundColor White
    }
    catch {
        Write-Host "   ERROR al obtener notificaciones" -ForegroundColor Red
    }

} else {
    Write-Host "Login fallido: $($loginResponse.message)" -ForegroundColor Red
}

Write-Host "`n=== PRUEBA FINALIZADA ===" -ForegroundColor Magenta