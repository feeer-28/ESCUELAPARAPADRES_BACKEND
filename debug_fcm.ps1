# Script de debugging del token FCM
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== DEBUG TOKEN FCM ===" -ForegroundColor Magenta

$loginData = @{
    documento = "1061705869"
    password = "1061705869"
} | ConvertTo-Json

Write-Host "1. HACIENDO LOGIN..." -ForegroundColor Cyan
$response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData

if ($response.success) {
    Write-Host "✅ LOGIN OK" -ForegroundColor Green
    
    $token = $response.data.token
    Write-Host "Token generado (primeros 50 chars): $($token.Substring(0,50))..." -ForegroundColor White
    Write-Host "Longitud del token: $($token.Length)" -ForegroundColor Gray
    
    # Crear headers manualmente
    $authHeader = "Bearer $token"
    Write-Host "Header Authorization: $($authHeader.Substring(0,70))..." -ForegroundColor White
    
    $headers = @{
        "Authorization" = $authHeader
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n2. PROBANDO ENDPOINT PROTEGIDO (mis estudiantes)..." -ForegroundColor Cyan
    try {
        $estudiantesResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/estudiantes" -Method GET -Headers $headers
        Write-Host "✅ Endpoint estudiantes funciona - Auth OK" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Endpoint estudiantes falla: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "`n3. PROBANDO ENDPOINT FCM..." -ForegroundColor Cyan
    $fcmData = @{
        fcmToken = "TEST_TOKEN_DEBUG"
        dispositivo = "test"
        sistemaOperativo = "test"
    } | ConvertTo-Json
    
    try {
        $fcmResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" -Method POST -Headers $headers -Body $fcmData
        Write-Host "✅ FCM TOKEN OK!" -ForegroundColor Green
        Write-Host $fcmResponse -ForegroundColor White
    }
    catch {
        Write-Host "❌ FCM ERROR: $($_.Exception.Message)" -ForegroundColor Red
        
        # Intentar obtener más detalles
        try {
            $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
            Write-Host "Detalle del error: $($errorResponse.message)" -ForegroundColor Yellow
        }
        catch {
            Write-Host "No se pudo obtener detalles del error" -ForegroundColor Gray
        }
    }
} else {
    Write-Host "❌ LOGIN FALLÓ" -ForegroundColor Red
}

Write-Host "`n=== FIN DEBUG ===" -ForegroundColor Magenta