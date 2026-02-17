# Test de conectividad del servidor
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== VERIFICACION DEL SERVIDOR ===" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/health" -Method GET -TimeoutSec 10
    Write-Host "✅ Servidor OK: $($response)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error en /api/health: $($_.Exception.Message)" -ForegroundColor Red
    
    # Intentar endpoint alternativo
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL" -Method GET -TimeoutSec 10
        Write-Host "✅ Ruta base funciona" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Servidor no responde: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "=== FIN VERIFICACION ===" -ForegroundColor Yellow