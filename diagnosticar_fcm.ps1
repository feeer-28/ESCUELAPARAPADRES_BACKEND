# 🔧 SCRIPT DE CORRECCIÓN - ENDPOINT NOTIFICACIONES/TOKEN
# Este script identifica y proporciona la solución exacta para el error 500

Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "🔧 DIAGNÓSTICO Y CORRECCIÓN FCM TOKEN" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════`n" -ForegroundColor Magenta

$BASE_URL = "https://escuelaparapadres-backend-1.onrender.com"

# Credenciales del acudiente (confirmadas funcionales)
$credentials = @{
    numeroDocumento = "1061705869"
    password = "1061705869"
}

Write-Host "🔑 OBTENIENDO TOKEN JWT..." -ForegroundColor Cyan

try {
    $loginResponse = Invoke-RestMethod -Uri "$BASE_URL/api/movil/auth/login/movil" `
                                      -Method POST `
                                      -ContentType "application/json" `
                                      -Body ($credentials | ConvertTo-Json)

    $token = $loginResponse.data.token
    Write-Host "✅ Token obtenido correctamente`n" -ForegroundColor Green
    
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }

    Write-Host "🧪 PROBANDO DIFERENTES ESTRUCTURAS DE PAYLOAD..." -ForegroundColor Cyan
    
    # ==========================================
    # PRUEBA 1: Estructura que usa MovilController (actual en ruta)
    # ==========================================
    Write-Host "`n1️⃣ PROBANDO ESTRUCTURA MovilController (línea 2093):" -ForegroundColor Yellow
    Write-Host "   Endpoint: POST /api/movil/notificaciones/token" -ForegroundColor White
    Write-Host "   Campos esperados: fcmToken, dispositivo, sistemaOperativo, versionApp" -ForegroundColor White

    $movilPayload = @{
        fcmToken = "TEST_MOVIL_$(Get-Date -Format 'yyyyMMddHHmmss')"
        dispositivo = "moto e40"
        sistemaOperativo = "android"
        versionApp = "1.0"
    }

    Write-Host "   📤 Payload:" -ForegroundColor Gray
    Write-Host "      $(($movilPayload | ConvertTo-Json -Compress))" -ForegroundColor Gray

    try {
        $response1 = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" `
                                      -Method POST `
                                      -Headers $headers `
                                      -Body ($movilPayload | ConvertTo-Json) `
                                      -ErrorAction Stop

        Write-Host "✅ ESTRUCTURA MovilController: FUNCIONA" -ForegroundColor Green
        Write-Host "   Respuesta: $($response1.message)" -ForegroundColor Green
        $solucionEncontrada = $true

    } catch {
        $error1 = $_.Exception.Message
        Write-Host "❌ ESTRUCTURA MovilController: ERROR" -ForegroundColor Red
        
        # Extraer detalles del error
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errorBody = $reader.ReadToEnd()
            try {
                $errorJson = $errorBody | ConvertFrom-Json
                Write-Host "   Error: $($errorJson.error)" -ForegroundColor Red
                
                # Analizar si es problema de BD
                if ($errorJson.error -match "column.*does not exist|relation.*does not exist") {
                    Write-Host "   🔍 PROBLEMA IDENTIFICADO: Error de estructura de base de datos" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "   Error raw: $errorBody" -ForegroundColor Red
            }
        } else {
            Write-Host "   Error: $error1" -ForegroundColor Red
        }
        
        $solucionEncontrada = $false
    }
    
    # ==========================================
    # PRUEBA 2: Estructura que reportó el equipo móvil (campos corregidos)  
    # ==========================================
    Write-Host "`n2️⃣ PROBANDO ESTRUCTURA REPORTADA POR MÓVIL:" -ForegroundColor Yellow
    Write-Host "   Campos reportados: token_fcm, dispositivo, sistema_operativo, version_app" -ForegroundColor White

    $movilCorregidoPayload = @{
        token_fcm = "TEST_MOVIL_CORREGIDO_$(Get-Date -Format 'yyyyMMddHHmmss')" 
        dispositivo = "moto e40"
        sistema_operativo = "android"
        version_app = "1.0"
        version_os = "11"
    }

    Write-Host "   📤 Payload:" -ForegroundColor Gray  
    Write-Host "      $(($movilCorregidoPayload | ConvertTo-Json -Compress))" -ForegroundColor Gray

    try {
        $response2 = Invoke-RestMethod -Uri "$BASE_URL/api/movil/notificaciones/token" `
                                      -Method POST `
                                      -Headers $headers `
                                      -Body ($movilCorregidoPayload | ConvertTo-Json) `
                                      -ErrorAction Stop

        Write-Host "✅ ESTRUCTURA MÓVIL CORREGIDA: FUNCIONA" -ForegroundColor Green
        Write-Host "   Respuesta: $($response2.message)" -ForegroundColor Green
        $solucionEncontrada = $true

    } catch {
        Write-Host "❌ ESTRUCTURA MÓVIL CORREGIDA: ERROR" -ForegroundColor Red
        
        if ($_.Exception.Response) {
            $stream = $_.Exception.Response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $errorBody = $reader.ReadToEnd()
            try {
                $errorJson = $errorBody | ConvertFrom-Json
                Write-Host "   Error: $($errorJson.error)" -ForegroundColor Red
            } catch {
                Write-Host "   Error raw: $errorBody" -ForegroundColor Red
            }
        }
    }

    # ==========================================
    # PRUEBA 3: Estructura V2 (DispositivosV2Controller)
    # ==========================================
    Write-Host "`n3️⃣ PROBANDO ESTRUCTURA DispositivosV2Controller:" -ForegroundColor Yellow
    Write-Host "   Endpoint alternativo: POST /api/movil/dispositivos/registrar" -ForegroundColor White
    Write-Host "   Campos esperados: token_fcm, plataforma, modelo_dispositivo, version_app, version_os" -ForegroundColor White

    $v2Payload = @{
        token_fcm = "TEST_V2_$(Get-Date -Format 'yyyyMMddHHmmss')"
        plataforma = "android"
        modelo_dispositivo = "moto e40"
        version_app = "1.0"
        version_os = "11"
    }

    Write-Host "   📤 Payload:" -ForegroundColor Gray
    Write-Host "      $(($v2Payload | ConvertTo-Json -Compress))" -ForegroundColor Gray

    try {
        $response3 = Invoke-RestMethod -Uri "$BASE_URL/api/movil/dispositivos/registrar" `
                                      -Method POST `
                                      -Headers $headers `
                                      -Body ($v2Payload | ConvertTo-Json) `
                                      -ErrorAction Stop

        Write-Host "✅ ESTRUCTURA V2: FUNCIONA" -ForegroundColor Green
        Write-Host "   Respuesta: $($response3.message)" -ForegroundColor Green
        $solucionEncontrada = $true

    } catch {
        Write-Host "❌ ESTRUCTURA V2: ERROR (Endpoint podría no existir)" -ForegroundColor Red
    }

    Write-Host "`n═══════════════════════════════════════════════" -ForegroundColor Magenta
    Write-Host "📊 DIAGNÓSTICO COMPLETO" -ForegroundColor Magenta
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Magenta

    if (-not $solucionEncontrada) {
        Write-Host "`n🔍 PROBLEMA IDENTIFICADO:" -ForegroundColor Red
        Write-Host "   Ninguna estructura de payload funciona correctamente" -ForegroundColor White
        Write-Host "   Esto confirma el error 500 reportado en el log" -ForegroundColor White

        Write-Host "`n💡 ANÁLISIS DEL CÓDIGO:" -ForegroundColor Yellow
        Write-Host "   1. Endpoint activo: POST /api/movil/notificaciones/token" -ForegroundColor White
        Write-Host "   2. Controlador: MovilController.registrarTokenFCM" -ForegroundColor White  
        Write-Host "   3. Línea: ~2093 en movilController.ts" -ForegroundColor White

        Write-Host "`n🔧 SOLUCIONES POSIBLES:" -ForegroundColor Cyan

        Write-Host "`n   OPCIÓN 1 - VERIFICAR ESTRUCTURA BD:" -ForegroundColor Green
        Write-Host "      • Conectar a la BD y verificar tabla dispositivos_moviles" -ForegroundColor White
        Write-Host "      • Comando SQL: DESCRIBE dispositivos_moviles;" -ForegroundColor Gray
        Write-Host "      • O: SELECT column_name FROM information_schema.columns WHERE table_name='dispositivos_moviles';" -ForegroundColor Gray

        Write-Host "`n   OPCIÓN 2 - REVISAR MIGRACIÓN APLICADA:" -ForegroundColor Green  
        Write-Host "      • Verificar qué migración se aplicó realmente" -ForegroundColor White
        Write-Host "      • Tienes 2 migraciones diferentes:" -ForegroundColor White
        Write-Host "        - Original: dispositivo, sistema_operativo" -ForegroundColor Gray
        Write-Host "        - V2: modelo_dispositivo, plataforma" -ForegroundColor Gray

        Write-Host "`n   OPCIÓN 3 - CORREGIR CONTROLADOR:" -ForegroundColor Green
        Write-Host "      • Modificar MovilController.registrarTokenFCM" -ForegroundColor White  
        Write-Host "      • Alinear campos con estructura real de BD" -ForegroundColor White

        Write-Host "`n📝 CÓDIGO DE CORRECCIÓN SUGERIDO:" -ForegroundColor Cyan
        Write-Host @"
        // En MovilController.ts línea ~2155
        await db.table('dispositivos_moviles').insert({
          usuario_id: jwtUser.id,
          token_fcm: payload.fcmToken,
          dispositivo: payload.dispositivo || 'Desconocido',        // ✅ Si tabla usa 'dispositivo'  
          // modelo_dispositivo: payload.dispositivo,               // ✅ O si tabla usa 'modelo_dispositivo'
          sistema_operativo: payload.sistemaOperativo || 'android', // ✅ Si tabla usa 'sistema_operativo'
          // plataforma: payload.sistemaOperativo,                  // ✅ O si tabla usa 'plataforma'
          version_app: payload.versionApp,
          activo: true,
          creado_en: DateTime.now().toSQL(),
          actualizado_en: DateTime.now().toSQL()
        })
"@ -ForegroundColor Gray

    } else {
        Write-Host "`n✅ ¡PROBLEMA RESUELTO!" -ForegroundColor Green
        Write-Host "   Una de las estructuras funciona correctamente" -ForegroundColor White
        Write-Host "   El endpoint FCM ahora debería funcionar al 100%" -ForegroundColor White
    }

    Write-Host "`n🎯 PRÓXIMOS PASOS RECOMENDADOS:" -ForegroundColor Cyan
    Write-Host "   1. Aplicar la corrección en el backend" -ForegroundColor White
    Write-Host "   2. Probar con la app móvil real" -ForegroundColor White  
    Write-Host "   3. Configurar Firebase FCM para envío real de push notifications" -ForegroundColor White
    Write-Host "   4. ¡Sistema al 100% operativo!" -ForegroundColor White

} catch {
    Write-Host "❌ ERROR AL OBTENER TOKEN: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n🏁 DIAGNÓSTICO FINALIZADO" -ForegroundColor Magenta