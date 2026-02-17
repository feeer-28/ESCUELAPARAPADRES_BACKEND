# Test: Login como orientador y crear tarea
$baseUrl = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== LOGIN ORIENTADOR ===" -ForegroundColor Green

# 1. Login del orientador usando endpoint general
$loginBody = @{
    correo = "Orientador@gmail.com"
    contrasena = "Orient122!"
} | ConvertTo-Json

try {
    Write-Host "Intentando login en /login..." -ForegroundColor Cyan
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    
    Write-Host "Login exitoso:" -ForegroundColor Green
    Write-Host "Token: $($loginResponse.token.Substring(0,20))..."
    Write-Host "Usuario: $($loginResponse.user.firstName) $($loginResponse.user.lastName)"
    Write-Host "Rol: $($loginResponse.user.roleId)"
    
    $orientadorToken = $loginResponse.token
} catch {
    Write-Host "Error en login: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Codigo de estado: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    exit
}

Write-Host "`n=== OBTENER ESTUDIANTES ===" -ForegroundColor Green

# 2. Obtener lista de estudiantes para encontrar el del acudiente 1234567890
try {
    $headers = @{
        "Authorization" = "Bearer $orientadorToken"
        "Content-Type" = "application/json"
    }
    
    $estudiantesResponse = Invoke-RestMethod -Uri "$baseUrl/api/estudiantes" -Method GET -Headers $headers -UseBasicParsing
    
    Write-Host "Total estudiantes encontrados: $($estudiantesResponse.data.Count)" -ForegroundColor Cyan
    
    # Buscar estudiante del acudiente 1234567890
    $estudianteTarget = $null
    foreach ($estudiante in $estudiantesResponse.data) {
        Write-Host "Estudiante: $($estudiante.firstName) $($estudiante.lastName) - ID: $($estudiante.id)"
        if ($estudiante.acudientes) {
            foreach ($acudiente in $estudiante.acudientes) {
                if ($acudiente.documento -eq "1234567890") {
                    $estudianteTarget = $estudiante
                    Write-Host "ENCONTRADO! Estudiante: $($estudiante.firstName) $($estudiante.lastName)" -ForegroundColor Yellow
                    break
                }
            }
        }
        if ($estudianteTarget) { break }
    }
    
    if (-not $estudianteTarget) {
        Write-Host "No se encontro estudiante asociado al acudiente 1234567890" -ForegroundColor Red
        exit
    }
    
} catch {
    Write-Host "Error obteniendo estudiantes: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n=== CREAR TAREA ===" -ForegroundColor Green

# 3. Crear una tarea para el estudiante encontrado
$fecha = Get-Date -Format "yyyy-MM-dd"
$fechaEntrega = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")

$tareaBody = @{
    titulo = "Tarea de Prueba - Notificación FCM"
    descripcion = "Esta es una tarea de prueba para verificar que lleguen las notificaciones push al acudiente. Creada el $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
    fechaAsignacion = $fecha
    fechaEntrega = $fechaEntrega
    materiaId = 1  # Asumiendo que existe materia con ID 1
    cursoId = $estudianteTarget.cursoId
    estudianteId = $estudianteTarget.id
    estado = "pendiente"
} | ConvertTo-Json

try {
    $tareaResponse = Invoke-RestMethod -Uri "$baseUrl/api/tareas" -Method POST -Body $tareaBody -Headers $headers -UseBasicParsing
    
    Write-Host "Tarea creada exitosamente:" -ForegroundColor Green
    Write-Host "ID de tarea: $($tareaResponse.data.id)"
    Write-Host "Título: $($tareaResponse.data.titulo)"
    Write-Host "Estudiante: $($estudianteTarget.firstName) $($estudianteTarget.lastName)"
    Write-Host "Fecha entrega: $($tareaResponse.data.fechaEntrega)"
    
} catch {
    Write-Host "Error creando tarea: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Respuesta del servidor:" -ForegroundColor Yellow
    Write-Host $_.Exception.Response
}

Write-Host "`n=== RESUMEN ===" -ForegroundColor Magenta
Write-Host "Login orientador completado"
Write-Host "Estudiante encontrado: $($estudianteTarget.firstName) $($estudianteTarget.lastName)"
Write-Host "Tarea creada para verificar notificacion"
Write-Host "La notificacion deberia llegar al dispositivo del acudiente 1234567890"
Write-Host "Verificar en el dispositivo movil si llego la notificacion push"