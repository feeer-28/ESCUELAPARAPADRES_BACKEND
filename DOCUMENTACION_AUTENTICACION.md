# 🔐 DOCUMENTACIÓN DE AUTENTICACIÓN - API BACKEND

## ✅ ENDPOINTS IMPLEMENTADOS

### 1️⃣ Login Administrador Sistema
```http
POST /admin/login
Content-Type: application/json

{
  "correo": "admin@educacionpopayan.gov.co",
  "contrasena": "Admin123!"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso como Administrador del Sistema",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "correo": "admin@educacionpopayan.gov.co",
      "rolId": 1,
      "rolNombre": "Administrador del Sistema",
      "estaActivo": true
    }
  }
}
```

---

### 2️⃣ Login Rectores (✨ NUEVO - IMPLEMENTADO HOY)
```http
POST /rectores/login
Content-Type: application/json

{
  "correo": "rector.test@instituciontest.edu.co",
  "contrasena": "MiNueva123!"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso como rector",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 3,
      "correo": "rector.test@instituciontest.edu.co",
      "rolId": 2,
      "rolNombre": "rector",
      "institucionId": 1,
      "institucion": "Institución Educativa Test",
      "funcionario": {
        "id": 2,
        "nombre": "Juan Carlos",
        "apellido": "Gómez Pérez",
        "telefono": "3101234567"
      }
    }
  }
}
```

**Errores posibles:**
- **400 Bad Request**: Faltan campos requeridos (correo o contraseña)
- **401 Unauthorized**: Correo o contraseña incorrectos
- **403 Forbidden**: Usuario inactivo (`estaActivo: false`)
- **422 Unprocessable Entity**: Usuario no tiene rol de rector
- **500 Internal Server Error**: Error en el servidor

---

### 3️⃣ Login Coordinadores (✨ NUEVO - IMPLEMENTADO HOY)
```http
POST /coordinadores/login
Content-Type: application/json

{
  "correo": "coordinador@instituciontest.edu.co",
  "contrasena": "Coordinador123!"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso como coordinador",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 4,
      "correo": "coordinador@instituciontest.edu.co",
      "rolId": 3,
      "rolNombre": "coordinador",
      "institucionId": 1,
      "institucion": "Institución Educativa Test",
      "funcionario": {
        "id": 3,
        "nombre": "María José",
        "apellido": "López Rodríguez",
        "telefono": "3109876543"
      }
    }
  }
}
```

**Errores posibles:** (iguales a `/rectores/login`)

---

### 4️⃣ Login Docentes (YA EXISTÍA)
```http
POST /docentes/login
Content-Type: application/json

{
  "correo": "docente@instituciontest.edu.co",
  "contrasena": "Docente123!"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso como docente",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 5,
      "correo": "docente@instituciontest.edu.co",
      "rolId": 4,
      "rolNombre": "docente",
      "institucionId": 1
    }
  }
}
```

**NOTA**: Este endpoint acepta tanto rol 4 (docente) como rol 5 (docente coordinador).

---

### 5️⃣ Login Acudientes (YA EXISTÍA)
```http
POST /acudientes/login
Content-Type: application/json

{
  "telefono": "3001234567",
  "numeroDocumento": "1234567890"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 6,
      "numeroDocumento": "1234567890",
      "tipoDocumento": "CC",
      "rolId": 6,
      "telefono": "3001234567"
    }
  }
}
```

**NOTA ESPECIAL**: Este endpoint NO usa correo/contraseña. Usa `telefono` + `numeroDocumento` como autenticación.

---

## 🎯 CASOS DE USO POR ROL

| Rol | Endpoint | rolId | Validación Especial |
|-----|----------|-------|---------------------|
| **Admin Sistema** | `/admin/login` | 1 | Solo Admin Sistema |
| **Rector** | `/rectores/login` | 2 | Solo Rectores |
| **Coordinador** | `/coordinadores/login` | 3 | Solo Coordinadores |
| **Docente** | `/docentes/login` | 4 o 5 | Docente o Docente Coordinador |
| **Acudiente** | `/acudientes/login` | 6 | Telefono + Documento (sin contraseña) |

---

## 🔑 TOKEN JWT

Todos los endpoints (excepto acudientes) devuelven un token JWT con esta estructura:

**Payload del Token:**
```json
{
  "sub": 3,                    // ID del usuario
  "correo": "rector@test.com", // Correo del usuario
  "rolId": 2,                  // ID del rol
  "institucionId": 1,          // ID de la institución (si aplica)
  "iat": 1234567890,           // Issued at
  "exp": 1234977890            // Expiration (7 días después)
}
```

**Expiración:** 7 días (604800 segundos)

**Uso del Token:**
```http
GET /api/protected-endpoint
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ⚠️ CASO ESPECIAL: `debeCambiarContrasena`

Si un usuario tiene `debeCambiarContrasena: true` en la base de datos:

1. **NO PUEDE hacer login normal**
2. Debe usar el endpoint de cambio de contraseña forzado (si existe)
3. O el administrador debe resetear su contraseña

**Ejemplo:**
- Usuario: `bryandreshurtado18@gmail.com` (rolId: 2, debeCambiarContrasena: true)
- Intento de login en `/rectores/login`:
  ```json
  {
    "success": false,
    "message": "Correo o contraseña incorrectos"
  }
  ```
- **Solución**: El admin debe cambiar la contraseña o implementar endpoint de cambio forzado.

---

## 🛠️ CÓDIGOS DE ERROR HTTP

| Código | Significado | Cuándo ocurre |
|--------|-------------|---------------|
| **200** | OK | Login exitoso |
| **400** | Bad Request | Faltan campos requeridos (correo/contraseña) |
| **401** | Unauthorized | Correo o contraseña incorrectos |
| **403** | Forbidden | Usuario inactivo (`estaActivo: false`) |
| **422** | Unprocessable Entity | Usuario tiene rol incorrecto para ese endpoint |
| **500** | Internal Server Error | Error en servidor/base de datos |

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN FRONTEND

### Para cada pantalla de login:

- [ ] **1. Capturar datos del formulario**
  - Correo (email válido)
  - Contraseña (mínimo 8 caracteres)

- [ ] **2. Validar campos antes de enviar**
  - Campos no vacíos
  - Formato de correo válido

- [ ] **3. Enviar POST al endpoint correcto**
  - Rectores → `/rectores/login`
  - Coordinadores → `/coordinadores/login`
  - Docentes → `/docentes/login`
  - Acudientes → `/acudientes/login` (telefono + documento)

- [ ] **4. Manejar respuesta exitosa (200)**
  - Guardar `token` en localStorage/sessionStorage
  - Guardar datos del usuario (`rolId`, `institucionId`, etc.)
  - Redirigir al dashboard correspondiente

- [ ] **5. Manejar errores específicos**
  - 400: Mostrar "Complete todos los campos"
  - 401: Mostrar "Correo o contraseña incorrectos"
  - 403: Mostrar "Su cuenta está inactiva. Contacte al administrador"
  - 422: Mostrar "No tiene permisos para acceder aquí"
  - 500: Mostrar "Error del servidor. Intente más tarde"

- [ ] **6. Agregar token a requests subsecuentes**
  ```javascript
  headers: {
    'Authorization': `Bearer ${token}`
  }
  ```

---

## 🧪 EJEMPLOS DE PRUEBA CON CURL

### PowerShell:
```powershell
# Login Rector
$body = @{ correo = "rector.test@instituciontest.edu.co"; contrasena = "MiNueva123!" } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3333/rectores/login' -Method Post -Body $body -ContentType 'application/json'

# Login Coordinador
$body = @{ correo = "coordinador@test.com"; contrasena = "Pass123!" } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:3333/coordinadores/login' -Method Post -Body $body -ContentType 'application/json'
```

### Linux/Mac:
```bash
# Login Rector
curl -X POST http://localhost:3333/rectores/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"rector.test@instituciontest.edu.co","contrasena":"MiNueva123!"}'

# Login Coordinador
curl -X POST http://localhost:3333/coordinadores/login \
  -H "Content-Type: application/json" \
  -d '{"correo":"coordinador@test.com","contrasena":"Pass123!"}'
```

---

## 🎉 RESUMEN DE CAMBIOS

### ✅ **NUEVO (Implementado hoy):**
1. `POST /rectores/login` - Login específico para rectores (rolId: 2)
2. `POST /coordinadores/login` - Login específico para coordinadores (rolId: 3)
3. Archivo: `app/controllers/authController.ts` - Controlador genérico con validación de roles
4. Archivo: `start/routes/auth.ts` - Rutas de autenticación por rol

### ✅ **YA EXISTÍAN:**
1. `POST /admin/login` - Login de administrador del sistema
2. `POST /docentes/login` - Login de docentes
3. `POST /acudientes/login` - Login de acudientes (telefono + documento)

### 🔒 **SEGURIDAD:**
- ✅ Validación de rol en cada endpoint
- ✅ Verificación de contraseña con hash
- ✅ Check de usuario activo (`estaActivo`)
- ✅ Tokens JWT con expiración de 7 días
- ✅ Respuestas genéricas en errores de autenticación (no revelar si usuario existe)

---

## 📞 SOPORTE

**Desarrollador Backend:** Bryan Hurtado  
**Email:** bryandreshurtado18@gmail.com  
**Última actualización:** $(Get-Date -Format "yyyy-MM-dd HH:mm")

---

## 🚀 PRÓXIMOS PASOS SUGERIDOS

1. [ ] Implementar endpoint de cambio de contraseña forzado
2. [ ] Implementar endpoint de recuperación de contraseña
3. [ ] Agregar rate limiting en endpoints de login (prevenir fuerza bruta)
4. [ ] Implementar refresh tokens
5. [ ] Agregar logs de auditoría en cada login exitoso/fallido
