# Monitoreo continuo hasta que API responda
Write-Host "🔄 MONITOREO CONTINUO - Esperando API disponible..." -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Gray

$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"
$maxIntentos = 10
$intervalo = 30  # segundos

for ($i = 1; $i -le $maxIntentos; $i++) {
    Write-Host "`nIntento $i/$maxIntentos - $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Yellow
    
    try {
        # Probar login como indicador de que API está lista
        $loginData = @{
            numero_documento = "12345678"
            password = "password123"  
            tipo_usuario = "acudiente"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/login" -Method Post -Body $loginData -ContentType "application/json" -TimeoutSec 20
        
        if ($response.token) {
            Write-Host "🎉 ¡API DISPONIBLE! Login exitoso" -ForegroundColor Green
            Write-Host "✅ Sistema funcionando - Deploy completado" -ForegroundColor Green
            
            # Probar FCM ahora que API funciona
            Write-Host "`n🔥 Probando FCM (Firebase)..." -ForegroundColor Yellow
            $fcmData = @{
                fcm_token = "TEST_FINAL_$(Get-Date -Format 'HHmmss')"
                device_info = @{
                    platform = "android"
                    version = "1.0.0"
                } | ConvertTo-Json
            } | ConvertTo-Json
            
            try {
                $fcmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/registrar-fcm" -Method Post -Body $fcmData -ContentType "application/json" -Headers @{"Authorization" = "Bearer $($response.token)"} -TimeoutSec 20
                
                if ($fcmResponse.message -match "exitosamente") {
                    Write-Host "🚀 FCM FUNCIONANDO - Firebase completamente reparado!" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ FCM respuesta inesperada: $($fcmResponse.message)" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "⚠️ FCM error: $($_.Exception.Message)" -ForegroundColor Yellow
            }
            
            break
        }
    } catch {
        $error = $_.Exception.Message
        if ($error -match "404") {
            Write-Host "⏳ API aún no lista (404) - Esperando..." -ForegroundColor Yellow
        } elseif ($error -match "timeout|time") {
            Write-Host "⏳ Timeout - Server starting..." -ForegroundColor Yellow 
        } else {
            Write-Host "⚠️ Error: $error" -ForegroundColor Red
        }
    }
    
    if ($i -lt $maxIntentos) {
        Write-Host "   Esperando $intervalo segundos..." -ForegroundColor Gray
        Start-Sleep -Seconds $intervalo
    }
}

if ($i -gt $maxIntentos) {
    Write-Host "`n❌ API no disponible después de $maxIntentos intentos" -ForegroundColor Red
    Write-Host "🔍 Revisa logs en Render Dashboard" -ForegroundColor Yellow
    Write-Host "💡 O considera redeploy si persiste el problema" -ForegroundColor Yellow
}

Write-Host "`n=====================================================" -ForegroundColor Gray
Write-Host "🏁 MONITOREO FINALIZADO" -ForegroundColor Cyan