# Script de prueba para nuevos endpoints

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TESTING NUEVOS ENDPOINTS PANEL RECTOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Login de rector
Write-Host "1. LOGIN RECTOR" -ForegroundColor Yellow
$loginBody = @{
    correo = "rector.test@instituciontest.edu.co"
    contrasena = "MiNueva123!"
} | ConvertTo-Json

try {
    $loginResp = Invoke-RestMethod -Uri 'http://localhost:3333/rectores/login' -Method Post -Body $loginBody -ContentType 'application/json'
    $token = $loginResp.data.token
    Write-Host "   SUCCESS: Login exitoso" -ForegroundColor Green
    Write-Host "   Token obtenido" -ForegroundColor Gray
    Write-Host ""
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

# 2. Test GET /usuarios/me
Write-Host "2. TEST: GET /usuarios/me" -ForegroundColor Yellow
try {
    $headers = @{
        'Authorization' = "Bearer $token"
    }
    $meResp = Invoke-RestMethod -Uri 'http://localhost:3333/usuarios/me' -Method Get -Headers $headers
    Write-Host "   SUCCESS: Perfil obtenido" -ForegroundColor Green
    Write-Host "   Usuario: $($meResp.data.correo)" -ForegroundColor White
    Write-Host "   Nombre: $($meResp.data.nombre) $($meResp.data.apellido)" -ForegroundColor White
    Write-Host "   Institucion: $($meResp.data.institucion.nombre)" -ForegroundColor White
    Write-Host "   Municipio: $($meResp.data.institucion.municipio.nombre)" -ForegroundColor White
    $institucionId = $meResp.data.institucionId
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 3. Test GET /instituciones/:id
Write-Host "3. TEST: GET /instituciones/$institucionId" -ForegroundColor Yellow
try {
    $instResp = Invoke-RestMethod -Uri "http://localhost:3333/instituciones/$institucionId" -Method Get
    Write-Host "   SUCCESS: Institucion obtenida" -ForegroundColor Green
    Write-Host "   Nombre: $($instResp.data.nombre)" -ForegroundColor White
    Write-Host "   Direccion: $($instResp.data.direccion)" -ForegroundColor White
    Write-Host "   Naturaleza: $($instResp.data.naturaleza)" -ForegroundColor White
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 4. Test GET /instituciones
Write-Host "4. TEST: GET /instituciones (todas)" -ForegroundColor Yellow
try {
    $instListResp = Invoke-RestMethod -Uri "http://localhost:3333/instituciones" -Method Get
    Write-Host "   SUCCESS: Lista de instituciones obtenida" -ForegroundColor Green
    Write-Host "   Total instituciones: $($instListResp.data.Count)" -ForegroundColor White
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 5. Test GET /instituciones/:id/directivos
Write-Host "5. TEST: GET /instituciones/$institucionId/directivos" -ForegroundColor Yellow
try {
    $directivosResp = Invoke-RestMethod -Uri "http://localhost:3333/instituciones/$institucionId/directivos" -Method Get -Headers $headers
    Write-Host "   SUCCESS: Directivos obtenidos" -ForegroundColor Green
    Write-Host "   Coordinadores: $($directivosResp.data.coordinadores.Count)" -ForegroundColor White
    Write-Host "   Orientadores: $($directivosResp.data.orientadores.Count)" -ForegroundColor White
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# 6. Test GET /rectores/estadisticas
Write-Host "6. TEST: GET /rectores/estadisticas" -ForegroundColor Yellow
try {
    $statsResp = Invoke-RestMethod -Uri "http://localhost:3333/rectores/estadisticas" -Method Get -Headers $headers
    Write-Host "   SUCCESS: Estadisticas obtenidas" -ForegroundColor Green
    Write-Host "   Institucion: $($statsResp.data.institucionNombre)" -ForegroundColor White
    Write-Host "   Coordinadores: $($statsResp.data.totalCoordinadores) (activos: $($statsResp.data.coordinadoresActivos))" -ForegroundColor White
    Write-Host "   Orientadores: $($statsResp.data.totalOrientadores) (activos: $($statsResp.data.orientadoresActivos))" -ForegroundColor White
    Write-Host "   Docentes: $($statsResp.data.totalDocentes) (activos: $($statsResp.data.docentesActivos))" -ForegroundColor White
    Write-Host "   Cursos: $($statsResp.data.totalCursos)" -ForegroundColor White
    Write-Host "   Estudiantes: $($statsResp.data.totalEstudiantes)" -ForegroundColor White
} catch {
    Write-Host "   ERROR: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESUMEN" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GET /usuarios/me - IMPLEMENTADO" -ForegroundColor Green
Write-Host "GET /instituciones/:id - IMPLEMENTADO" -ForegroundColor Green
Write-Host "GET /instituciones - IMPLEMENTADO" -ForegroundColor Green
Write-Host "GET /instituciones/:id/directivos - IMPLEMENTADO" -ForegroundColor Green
Write-Host "GET /rectores/estadisticas - IMPLEMENTADO" -ForegroundColor Green
Write-Host ""
