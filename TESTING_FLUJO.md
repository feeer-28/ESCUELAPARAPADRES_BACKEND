# 🧪 TESTING DEL BACKEND - Flujo Completo

## Endpoints Base
```
BASE_URL: http://localhost:3333
```

---

## ✅ TEST 1: Login Admin Sistema

**Endpoint**: `POST /admin/login`

**Request**:
```json
{
  "correo": "admin@educacionpopayan.gov.co",
  "contrasena": "Admin123!"
}
```

**Comando cURL**:
```bash
curl -X POST http://localhost:3333/admin/login \
  -H "Content-Type: application/json" \
  -d "{\"correo\":\"admin@educacionpopayan.gov.co\",\"contrasena\":\"Admin123!\"}"
```

**Resultado Esperado**:
- Status: 200 OK
- Contiene: `token`, `usuario.rolId = 1`

---

## ✅ TEST 2: Crear Rector

**Endpoint**: `POST /admin/rectores`

**Request**:
```json
{
  "correo": "rector.prueba@institucion.edu.co",
  "contrasena": "Rector123!",
  "nombres": "Carlos",
  "apellidos": "Gómez Pérez",
  "numeroDocumento": "1234567890",
  "tipoDocumento": "CC",
  "telefono": "3001234567",
  "institucionId": 1
}
```

**Comando cURL** (reemplazar TOKEN):
```bash
curl -X POST http://localhost:3333/admin/rectores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_AQUI" \
  -d "{\"correo\":\"rector.prueba@institucion.edu.co\",\"contrasena\":\"Rector123!\",\"nombres\":\"Carlos\",\"apellidos\":\"Gómez Pérez\",\"numeroDocumento\":\"1234567890\",\"tipoDocumento\":\"CC\",\"telefono\":\"3001234567\",\"institucionId\":1}"
```

**Resultado Esperado**:
- Status: 201 Created
- `usuario.debeCambiarContrasena = true`

---

## ✅ TEST 3: Verificar Cambio de Contraseña Obligatorio

**Endpoint**: `POST /docentes/login` (rectores usan el mismo login que docentes)

**Request**:
```json
{
  "correo": "rector.prueba@institucion.edu.co",
  "contrasena": "Rector123!"
}
```

**Comando cURL**:
```bash
curl -X POST http://localhost:3333/docentes/login \
  -H "Content-Type: application/json" \
  -d "{\"correo\":\"rector.prueba@institucion.edu.co\",\"contrasena\":\"Rector123!\"}"
```

**Resultado Esperado**:
- Status: 200 OK
- `usuario.debeCambiarContrasena = true` ⚠️

---

## ✅ TEST 4: Cambiar Contraseña

**Endpoint**: `POST /usuarios/cambiar-password`

**Request**:
```json
{
  "contrasenaActual": "Rector123!",
  "contrasenaNueva": "MiNueva123!",
  "confirmarContrasena": "MiNueva123!"
}
```

**Comando cURL** (reemplazar TOKEN_RECTOR):
```bash
curl -X POST http://localhost:3333/usuarios/cambiar-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_RECTOR_AQUI" \
  -d "{\"contrasenaActual\":\"Rector123!\",\"contrasenaNueva\":\"MiNueva123!\",\"confirmarContrasena\":\"MiNueva123!\"}"
```

**Resultado Esperado**:
- Status: 200 OK
- `debeCambiarContrasena = false`

---

## ✅ TEST 5: Login con Nueva Contraseña

**Endpoint**: `POST /docentes/login`

**Request**:
```json
{
  "correo": "rector.prueba@institucion.edu.co",
  "contrasena": "MiNueva123!"
}
```

**Comando cURL**:
```bash
curl -X POST http://localhost:3333/docentes/login \
  -H "Content-Type: application/json" \
  -d "{\"correo\":\"rector.prueba@institucion.edu.co\",\"contrasena\":\"MiNueva123!\"}"
```

**Resultado Esperado**:
- Status: 200 OK
- `usuario.debeCambiarContrasena = false` ✅

---

## ✅ TEST 6: Descargar Plantilla Excel

**Endpoint**: `GET /estudiantes/plantilla-excel`

**Comando cURL** (reemplazar TOKEN):
```bash
curl -X GET http://localhost:3333/estudiantes/plantilla-excel \
  -H "Authorization: Bearer TOKEN_RECTOR_AQUI" \
  --output plantilla_estudiantes.xlsx
```

**Resultado Esperado**:
- Status: 200 OK
- Archivo `plantilla_estudiantes.xlsx` descargado

---

## ✅ TEST 7: Validar Excel (antes de cargar)

**Endpoint**: `POST /estudiantes/validar-excel`

**Comando cURL** (reemplazar TOKEN y RUTA_ARCHIVO):
```bash
curl -X POST http://localhost:3333/estudiantes/validar-excel \
  -H "Authorization: Bearer TOKEN_RECTOR_AQUI" \
  -F "archivo=@plantilla_estudiantes.xlsx"
```

**Resultado Esperado**:
- Status: 200 OK
- `validRows`, `invalidRows`, `preview`

---

## ✅ TEST 8: Carga Masiva de Estudiantes

**Endpoint**: `POST /estudiantes/carga-masiva`

**Comando cURL** (reemplazar TOKEN, CURSO_ID, ARCHIVO):
```bash
curl -X POST http://localhost:3333/estudiantes/carga-masiva \
  -H "Authorization: Bearer TOKEN_RECTOR_AQUI" \
  -F "archivo=@plantilla_estudiantes.xlsx" \
  -F "cursoId=1"
```

**Resultado Esperado**:
- Status: 201 Created
- `insertados`, `rechazados` con detalles

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] ✅ Admin puede loguearse
- [ ] ✅ Admin puede crear rector
- [ ] ✅ Rector tiene `mustChangePassword = true`
- [ ] ✅ Rector puede cambiar contraseña
- [ ] ✅ Después del cambio `mustChangePassword = false`
- [ ] ✅ Rector puede descargar plantilla Excel
- [ ] ✅ Rector puede validar archivo Excel
- [ ] ✅ Rector puede cargar estudiantes masivamente

---

## 🐛 ERRORES COMUNES

### Error: 401 Unauthorized
- ✅ Verificar que el token JWT esté en el header `Authorization: Bearer TOKEN`
- ✅ Verificar que el token no haya expirado (7 días)

### Error: 403 Forbidden
- ✅ Verificar que el usuario tenga el rol correcto
- ✅ Admin solo puede acceder a `/admin/*`
- ✅ Rector/Coordinador pueden acceder a `/estudiantes/*`

### Error: 400 Bad Request (Excel)
- ✅ Verificar que el archivo sea `.xlsx` o `.xls`
- ✅ Verificar que las columnas tengan los nombres correctos
- ✅ Verificar que no haya documentos duplicados

### Error: 500 Internal Server Error
- ✅ Revisar logs del servidor
- ✅ Verificar conexión a base de datos
- ✅ Verificar que el `cursoId` exista en la BD

---

**Creado**: 21 de enero de 2026
