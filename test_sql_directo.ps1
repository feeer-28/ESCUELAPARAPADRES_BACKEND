# Script para insertar tarea directa en base de datos para generar notificación
$baseUrl = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== INSERTAR TAREA DIRECTA EN BD ===" -ForegroundColor Green

# Sabemos que el acudiente 1234567890 tiene ID=10
# Vamos a usar el endpoint de inserción directa de SQL

$sqlQuery = @"
INSERT INTO tareas (titulo, descripcion, fecha_asignacion, fecha_entrega, materia_id, curso_id, estudiante_id, estado, created_at, updated_at) 
VALUES (
    'Tarea de Prueba - Notificación Push',
    'Esta es una tarea creada específicamente para probar el sistema de notificaciones push FCM. Revisar que llegue correctamente al dispositivo móvil.',
    NOW(),
    NOW() + INTERVAL '7 days',
    1,
    1, 
    (SELECT id FROM estudiantes WHERE acudiente_id = 10 LIMIT 1),
    'pendiente',
    NOW(),
    NOW()
);
"@

Write-Host "Query SQL a ejecutar:"
Write-Host $sqlQuery -ForegroundColor Cyan

# Si esto no funciona, usar el método más directo: el script de notificación
$directQuery = "UPDATE usuarios SET token_fcm = 'c6dTfPH-S12DwUKSeUZnah:APA91bEF1wsn954hn8wB-Z_g4MPcfgjhs2rcuUhP5Zy07A9yHDVxDqZ7DRwJw5nuZ2P8rrkDW2PGEplmppTk5lk4Ac76YnD1K54poVwvetbCee2g1iJSwFI' WHERE documento = '1234567890';"

Write-Host "`nAsegurando token FCM registrado:"
Write-Host $directQuery -ForegroundColor Yellow

Write-Host "`n=== OPCIONES PARA PROBAR ===" -ForegroundColor Magenta
Write-Host "1. Usar script FCM directo que ya funciona"
Write-Host "2. Crear notificación manual en backend"
Write-Host "3. Usar endpoint de prueba"

Write-Host "`nEjecutando método conocido que funciona..."