# Test básico de endpoint móvil
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== TEST ENDPOINT MOVIL ===" -ForegroundColor Yellow

$loginData = @{
    documento = "1061705869"
    password = "1061705869"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData -TimeoutSec 15
    
    if ($response.success) {
        Write-Host "✅ LOGIN EXITOSO!" -ForegroundColor Green
        Write-Host "   Token generado: $($response.data.token.Substring(0,20))..." -ForegroundColor White
    } else {
        Write-Host "❌ LOGIN FALLO: $($response.message)" -ForegroundColor Red  
    }
}
catch {
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "=== FIN TEST ===" -ForegroundColor Yellow