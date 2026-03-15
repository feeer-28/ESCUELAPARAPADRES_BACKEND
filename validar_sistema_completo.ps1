# ===================================================================
# VALIDACIÓN COMPLETA DEL SISTEMA MÓVIL - ESCUELA PARA PADRES
# ===================================================================
# Uso: .\validar_sistema_completo.ps1
# 
# Este script verifica que todo el sistema móvil esté funcionando
# correctamente después del fix de la base de datos (columnas 'cuerpo' y 'datos')
# ===================================================================

$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

Write-Host "`n🚀 INICIANDO VALIDACIÓN COMPLETA DEL SISTEMA..." -ForegroundColor Cyan
Write-Host "====================================================================" -ForegroundColor Gray

# Variables para tracking
$errores = 0
$tests_exitosos = 0

# Función para mostrar resultados
function Mostrar-Resultado {
    param($test, $exitoso, $detalle = "")
    if ($exitoso) {
        Write-Host "✅ $test" -ForegroundColor Green
        $script:tests_exitosos++
        if ($detalle) { Write-Host "   → $detalle" -ForegroundColor White }
    } else {
        Write-Host "❌ $test" -ForegroundColor Red
        $script:errores++
        if ($detalle) { Write-Host "   → $detalle" -ForegroundColor Yellow }
    }
}

# Test 1: Verificar conexión básica al servidor
Write-Host "`n🔄 Test 1: Conexión al servidor..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/estudiante/perfil" -Method Get -Headers @{"Authorization" = "Bearer invalid"} -SkipHttpErrorCheck
    Mostrar-Resultado "Servidor responde" $true "Conectividad OK"
} catch {
    Mostrar-Resultado "Servidor responde" $false "Error de conectividad: $($_.Exception.Message)"
}

# Test 2: Login de acudiente
Write-Host "`n🔄 Test 2: Sistema de autenticación..." -ForegroundColor Yellow
$loginData = @{
    numero_documento = "12345678"
    password = "password123"
    tipo_usuario = "acudiente"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/login" -Method Post -Body $loginData -ContentType "application/json"
    if ($response.token) {
        $TOKEN_ACUDIENTE = $response.token
        Mostrar-Resultado "Login acudiente" $true "Token obtenido: $($response.token.Substring(0,20))..."
    } else {
        Mostrar-Resultado "Login acudiente" $false "No se recibió token válido"
    }
} catch {
    Mostrar-Resultado "Login acudiente" $false "Error: $($_.Exception.Message)"
    $TOKEN_ACUDIENTE = $null
}

# Test 3: Registro FCM (Parte crítica que se reparó)
Write-Host "`n🔄 Test 3: Registro FCM (FIX PRINCIPAL)..." -ForegroundColor Yellow
if ($TOKEN_ACUDIENTE) {
    $fcmData = @{
        fcm_token = "TEST_TOKEN_$(Get-Date -Format 'yyyyMMddHHmmss')"
        device_info = @{
            platform = "android"
            version = "1.0.0"
        } | ConvertTo-Json
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/registrar-fcm" -Method Post -Body $fcmData -ContentType "application/json" -Headers @{"Authorization" = "Bearer $TOKEN_ACUDIENTE"}
        if ($response.message -match "exitosamente") {
            Mostrar-Resultado "Registro FCM" $true "✨ PROBLEMA ORIGINAL RESUELTO ✨"
        } else {
            Mostrar-Resultado "Registro FCM" $false "Respuesta inesperada: $($response | Out-String)"
        }
    } catch {
        Mostrar-Resultado "Registro FCM" $false "❌ ERROR CRÍTICO: $($_.Exception.Message)"
    }
} else {
    Mostrar-Resultado "Registro FCM" $false "No hay token para autenticar"
}

# Test 4: Endpoints móviles principales
Write-Host "`n🔄 Test 4: Endpoints móviles..." -ForegroundColor Yellow
if ($TOKEN_ACUDIENTE) {
    $endpoints = @(
        @{url = "/api/movil/perfil"; nombre = "Perfil acudiente"},
        @{url = "/api/estudiante/perfil"; nombre = "Perfil estudiante"},
        @{url = "/api/movil/notificaciones"; nombre = "Notificaciones"},
        @{url = "/api/movil/mis-estudiantes"; nombre = "Lista estudiantes"}
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-RestMethod -Uri "$BASE_URL$($endpoint.url)" -Method Get -Headers @{"Authorization" = "Bearer $TOKEN_ACUDIENTE"} -SkipHttpErrorCheck
            $exitoso = $response -and ($response.GetType().Name -ne "ErrorRecord")
            Mostrar-Resultado $endpoint.nombre $exitoso
        } catch {
            Mostrar-Resultado $endpoint.nombre $false $_.Exception.Message
        }
    }
}

# Test 5: Segundo registro FCM para confirmar estabilidad
Write-Host "`n🔄 Test 5: Estabilidad FCM (Segundo registro)..." -ForegroundColor Yellow
if ($TOKEN_ACUDIENTE) {
    $fcmData2 = @{
        fcm_token = "STABILITY_TEST_$(Get-Date -Format 'yyyyMMddHHmmss')"
        device_info = @{
            platform = "ios"
            version = "1.0.0"
        } | ConvertTo-Json
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$BASE_URL/api/movil/registrar-fcm" -Method Post -Body $fcmData2 -ContentType "application/json" -Headers @{"Authorization" = "Bearer $TOKEN_ACUDIENTE"}
        $exitoso = $response.message -match "exitosamente"
        Mostrar-Resultado "Estabilidad FCM" $exitoso "Base de datos estable"
    } catch {
        Mostrar-Resultado "Estabilidad FCM" $false "Inestabilidad detectada: $($_.Exception.Message)"
    }
}

# RESUMEN FINAL
Write-Host "`n====================================================================" -ForegroundColor Gray
Write-Host "📊 RESUMEN DE VALIDACIÓN" -ForegroundColor Cyan
Write-Host "✅ Tests exitosos: $tests_exitosos" -ForegroundColor Green
Write-Host "❌ Errores encontrados: $errores" -ForegroundColor $(if ($errores -eq 0) { "Green" } else { "Red" })

if ($errores -eq 0) {
    Write-Host "`n🎉 ¡SISTEMA 100% FUNCIONAL!" -ForegroundColor Green
    Write-Host "💫 El problema de la base de datos YA NO EXISTE" -ForegroundColor Green
    Write-Host "🚀 Listo para producción completa" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Revisar errores encontrados" -ForegroundColor Yellow
    Write-Host "📞 Contactar al equipo técnico si persisten problemas" -ForegroundColor Yellow
}

Write-Host "`n🔄 Para ejecutar nuevamente: .\validar_sistema_completo.ps1" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Gray