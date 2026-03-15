# Consultar tareas del hijo del acudiente 1234567890
$baseUrl = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "=== CONSULTAR TAREAS DEL ESTUDIANTE ===" -ForegroundColor Green

# 1. Login del acudiente
Write-Host "Haciendo login como acudiente..." -ForegroundColor Cyan
$loginBody = @{
    documento = "1234567890"
    password = "1234567890"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/movil/auth/login/movil" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    
    Write-Host "Login exitoso!" -ForegroundColor Green
    Write-Host "Acudiente: $($loginResponse.user.firstName) $($loginResponse.user.lastName)"
    
    $token = $loginResponse.token
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    # Mostrar estudiantes asociados
    Write-Host "Estudiantes asociados:" -ForegroundColor Cyan
    foreach ($estudiante in $loginResponse.estudiantes) {
        Write-Host "- $($estudiante.firstName) $($estudiante.lastName) (ID: $($estudiante.id))" -ForegroundColor Yellow
        
        # Consultar tareas de cada estudiante
        Write-Host "`nConsultando tareas del estudiante ID: $($estudiante.id)..." -ForegroundColor Cyan
        
        try {
            $tareasResponse = Invoke-RestMethod -Uri "$baseUrl/api/movil/estudiantes/$($estudiante.id)/tareas" -Method GET -Headers $headers -UseBasicParsing
            
            if ($tareasResponse.data -and $tareasResponse.data.Count -gt 0) {
                Write-Host "Total de tareas encontradas: $($tareasResponse.data.Count)" -ForegroundColor Green
                
                # Contar por estados
                $pendientes = ($tareasResponse.data | Where-Object { $_.estado -eq "pendiente" }).Count
                $completadas = ($tareasResponse.data | Where-Object { $_.estado -eq "completada" }).Count
                $vencidas = ($tareasResponse.data | Where-Object { $_.estado -eq "vencida" }).Count
                $calificadas = ($tareasResponse.data | Where-Object { $_.estado -eq "calificada" }).Count
                $entregadas = ($tareasResponse.data | Where-Object { $_.estado -eq "entregada" }).Count
                
                Write-Host "`nRESUMEN DE TAREAS:" -ForegroundColor Magenta
                Write-Host "- Pendientes: $pendientes" -ForegroundColor Yellow
                Write-Host "- Completadas: $completadas" -ForegroundColor Green
                Write-Host "- Vencidas: $vencidas" -ForegroundColor Red
                Write-Host "- Entregadas: $entregadas" -ForegroundColor Cyan
                Write-Host "- Calificadas: $calificadas" -ForegroundColor Blue
                
                # Mostrar detalles de cada tarea
                Write-Host "`nDETALLES DE TAREAS:" -ForegroundColor Magenta
                foreach ($tarea in $tareasResponse.data) {
                    $estadoMarca = switch ($tarea.estado) {
                        "pendiente" { "[PENDIENTE]" }
                        "completada" { "[COMPLETADA]" }
                        "vencida" { "[VENCIDA]" }
                        "calificada" { "[CALIFICADA]" }
                        "entregada" { "[ENTREGADA]" }
                        default { "[OTRO]" }
                    }
                    
                    Write-Host "$estadoMarca $($tarea.titulo)"
                    Write-Host "   Entrega: $($tarea.fechaEntrega)"
                    if ($tarea.descripcion -and $tarea.descripcion.Length -gt 0) {
                        $desc = $tarea.descripcion
                        if ($desc.Length -gt 80) {
                            $desc = $desc.Substring(0, 80) + "..."
                        }
                        Write-Host "   Descripcion: $desc"
                    }
                    Write-Host ""
                }
                
            } else {
                Write-Host "No se encontraron tareas para este estudiante" -ForegroundColor Yellow
            }
            
        } catch {
            Write-Host "Error consultando tareas: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
} catch {
    Write-Host "Error en login: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "=== CONSULTA COMPLETADA ===" -ForegroundColor Green