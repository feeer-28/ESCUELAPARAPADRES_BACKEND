# Debug respuesta de login
$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== DEBUG LOGIN RESPONSE ===" -ForegroundColor Green

$loginData = @{
    documento = "1061705869"
    password = "1061705869"
} | ConvertTo-Json

Write-Host "Payload enviado:" -ForegroundColor Yellow
Write-Host $loginData -ForegroundColor White

$response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" -Method POST -ContentType "application/json" -Body $loginData

Write-Host "Respuesta completa:" -ForegroundColor Yellow
Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor White

if ($response.success) {
    Write-Host "Success: TRUE" -ForegroundColor Green
    if ($response.data) {
        Write-Host "Data existe: TRUE" -ForegroundColor Green
        if ($response.data.token) {
            Write-Host "Token existe: TRUE" -ForegroundColor Green
            Write-Host "Token value: $($response.data.token)" -ForegroundColor Cyan
        } else {
            Write-Host "Token existe: FALSE" -ForegroundColor Red
        }
    } else {
        Write-Host "Data existe: FALSE" -ForegroundColor Red
    }
} else {
    Write-Host "Success: FALSE" -ForegroundColor Red
    Write-Host "Message: $($response.message)" -ForegroundColor Red
}

Write-Host "=== FIN ===" -ForegroundColor Green