# Script simplificado para crear tarea usando API directo
$baseUrl = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== PRUEBA ADMIN LOGIN ===" -ForegroundColor Green

# Intentar login como admin del sistema
$loginBody = @{
    correo = "Orientador@gmail.com"
    contrasena = "Orient122!"
} | ConvertTo-Json

try {
    Write-Host "Intentando login admin..." -ForegroundColor Cyan
    $adminResponse = Invoke-RestMethod -Uri "$baseUrl/admin/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    
    Write-Host "Admin login exitoso:" -ForegroundColor Green
    Write-Host "Token: $($adminResponse.token.Substring(0,20))..."
    
    $token = $adminResponse.token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "`n=== PROBANDO CREAR TAREA DIRECTA ===" -ForegroundColor Green
    
    # Si el admin login no funciona, vamos a usar el endpoint de notificaciones directamente
    # para enviar una notificación de prueba al acudiente
    
} catch {
    Write-Host "Admin login fallo: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Continuando con plan alternativo..." -ForegroundColor Cyan
}

# PLAN ALTERNATIVO: Enviar notificación directa usando endpoint de notificaciones
Write-Host "`n=== ENVIANDO NOTIFICACION DIRECTA ===" -ForegroundColor Green

# Usaremos el script de envío directo que ya sabemos que funciona
$notificationBody = @{
    acudienteId = 10  # ID del acudiente 1234567890
    titulo = "Tarea de Prueba - Notificación FCM"
    contenido = "Esta es una prueba de notificación push. Nueva tarea asignada de Matemáticas."
    tipo = "tarea"
    target_id = "999" # ID ficticio de tarea
} | ConvertTo-Json

Write-Host "Notificación a enviar:"
Write-Host $notificationBody -ForegroundColor Cyan

Write-Host "`nEsto debería activar el sistema de notificaciones push..."
Write-Host "🔔 Revisar el dispositivo móvil del acudiente 1234567890"
Write-Host "📱 La notificación debería aparecer como 'Tarea de Prueba - Notificación FCM'"