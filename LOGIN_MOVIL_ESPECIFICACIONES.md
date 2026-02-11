# 📱 LOGIN MÓVIL - ESPECIFICACIONES DETALLADAS PARA FRONTEND

## 🔗 **ENDPOINT**
```
POST /api/movil/auth/login/movil
```

## 📊 **REQUEST BODY (JSON)**
```json
{
  "documento": "1061705869",
  "password": "1061705869"
}
```

## ⚠️ **VALIDACIONES CRÍTICAS**

### 1. **Campos requeridos:**
- `documento`: String, **obligatorio**, no vacío
- `password`: String, **obligatorio**, no vacío

### 2. **Proceso de normalización:**
- El backend normaliza el documento eliminando caracteres no numéricos: `/\D+/g`
- Ejemplo: `"1.061.705-869"` → `"1061705869"`

### 3. **Búsqueda en BD:**
- Tabla: `acudientes`
- Campo: `numero_documento` (VARCHAR)
- Busca: documento normalizado
- Join: con tabla `usuarios` mediante `usuario_id`

## 🔍 **VERIFICACIONES DEL BACKEND**

1. **Usuario existe:** Busca en `acudientes` por `numero_documento`
2. **Usuario válido:** Verifica que tenga registro en tabla `usuarios`
3. **Rol correcto:** `rolId = 6` (acudiente)
4. **Usuario activo:** `esta_activo = true`
5. **Contraseña válida:** Hash verification o primera vez (documento = password)

## 🎯 **LÓGICA DE PRIMERA VEZ**
Si el usuario ingresa por primera vez:
- `documento` = `password` (mismo valor)
- Backend detecta automáticamente y hashea la contraseña
- Actualiza `debe_cambiar_contrasena = false`

## ✅ **RESPUESTA EXITOSA (200)**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": 10,
    "documento": "1061705869",
    "firstName": "josefina Antonieta",
    "lastName": "apellido",
    "phone": "telefono",
    "email": "correo@email.com",
    "roleId": "acudiente",
    "mustChangePassword": false,
    "lastLogin": "2026-02-10T23:27:34.000Z"
  },
  "estudiantes": [
    {
      "id": 1,
      "firstName": "Nombre",
      "lastName": "Apellido",
      "documento": "numero_documento",
      "foto": null,
      "curso": {
        "id": 1,
        "name": "Nombre del curso",
        "grado": "Grado",
        "jornada": "Jornada"
      },
      "institucion": {
        "id": 1,
        "name": "Nombre institución"
      },
      "parentesco": "Acudiente",
      "esPrincipal": true
    }
  ]
}
```

## ❌ **RESPUESTAS DE ERROR**

### **400 - Datos faltantes:**
```json
{
  "success": false,
  "message": "Documento y contraseña son requeridos"
}
```

### **401 - Usuario no encontrado:**
```json
{
  "success": false,
  "message": "Documento o contraseña incorrectos"
}
```

### **401 - Rol incorrecto:**
```json
{
  "success": false,
  "message": "Este acceso es solo para acudientes"
}
```

### **403 - Usuario desactivado:**
```json
{
  "success": false,
  "message": "Usuario desactivado. Contacta al administrador."
}
```

### **500 - Error interno:**
```json
{
  "success": false,
  "message": "Error al procesar la solicitud",
  "error": "Descripción del error"
}
```

## 🔧 **HEADERS REQUERIDOS**
```http
Content-Type: application/json
```

## 📋 **ESTRUCTURA DE DATOS EN BD**

### **Tabla `acudientes`:**
- `id`: INTEGER (PK)
- `numero_documento`: VARCHAR (UNIQUE)
- `nombres`: VARCHAR
- `apellidos`: VARCHAR
- `usuario_id`: INTEGER (FK)

### **Tabla `usuarios`:**
- `id`: INTEGER (PK) 
- `correo`: VARCHAR
- `contrasena_hash`: TEXT
- `esta_activo`: BOOLEAN
- `debe_cambiar_contrasena`: BOOLEAN
- `rol_id`: INTEGER (debe ser 6 para acudientes)

## 🧪 **EJEMPLO DE PRUEBA**

### **Documento de prueba:** `1061705869`
- Usuario: "josefina Antonieta"
- Primera vez: usar documento como password
- Acudiente ID: 3
- Usuario ID: 10

### **cURL Example:**
```bash
curl -X POST http://127.0.0.1:3333/api/movil/auth/login/movil \
  -H "Content-Type: application/json" \
  -d '{
    "documento": "1061705869",
    "password": "1061705869"
  }'
```

## 🚨 **PROBLEMA ACTUAL DETECTADO**

Del log se observa que encuentra al acudiente (ID: 3, Usuario ID: 10) pero aún falla el login. Esto indica un problema en la verificación del hash. **El frontend debe seguir exactamente estas especificaciones mientras investigamos el issue del hash en el backend.**

## 📝 **NOTAS IMPORTANTES**

1. **Normalización automática:** No es necesario que el frontend normalice el documento, el backend lo hace automáticamente.

2. **Primera vez:** Si es la primera vez que el usuario ingresa, debe usar su número de documento tanto como usuario como contraseña.

3. **Token JWT:** El token se genera con expiración de 7 días.

4. **Estudiantes:** La respuesta incluye todos los estudiantes asociados al acudiente.

5. **Validación de rol:** El sistema verifica automáticamente que sea rol acudiente (ID=6).