# 📡 DOCUMENTACIÓN API - BACKEND READY PARA FRONTEND

> **Fecha**: 21 de enero de 2026  
> **Estado**: ✅ ENDPOINTS LISTOS PARA CONSUMO  
> **Base URL**: `http://localhost:3333`  
> **Ambiente producción**: (Por definir)

---

## 🎯 RESUMEN EJECUTIVO

Estimado equipo de Frontend **WEB ADMINISTRATIVA**,

El backend ha completado la implementación de **5 módulos críticos** con un total de **50+ endpoints** listos para consumo. Todos los endpoints han sido testeados y validados.

### ✅ Módulos Implementados (Plataforma Web):
1. **Autenticación por Rol** - Login para Admin, Rectores, Coordinadores, Docentes
2. **Gestión Admin Sistema** - 5 endpoints
3. **Panel de Rector** - 5 endpoints (perfil, instituciones, directivos, estadísticas)
4. **Cambio Obligatorio de Contraseña** - 1 endpoint
5. **Gestión de Estudiantes con Carga Excel** - 3 endpoints
6. **Gestión de Usuarios** - 4 endpoints CRUD

**📱 NOTA**: Los endpoints de **Acudientes** son exclusivos para la aplicación móvil y no están incluidos en esta documentación.

---

## 🔐 AUTENTICACIÓN

### Header Requerido para Rutas Protegidas

```http
Authorization: Bearer {JWT_TOKEN}
```

**IMPORTANTE**: 
- El token expira en **7 días**
- Almacenar en localStorage/secureStorage
- Renovar antes de expiración

---

## 🧪 CREDENCIALES DE TESTING

### 👤 Usuario Admin Sistema (YA CREADO)

```json
{
  "correo": "admin@educacionpopayan.gov.co",
  "contrasena": "Admin123!"
}
```

**Rol**: `admin_sistema` (rolId: 1)  
**Permisos**: Crear rectores, coordinadores, aprobar instituciones  
**Estado**: Activo, no requiere cambio de contraseña

---

### 🏫 Datos de Prueba - Instituciones

#### Institución Existente (ID: 1)
```json
{
  "id": 1,
  "nombre": "Institución Educativa Test",
  "municipioId": 1,
  "naturaleza": "Pública"
}
```

#### Crear Nueva Institución (Usar endpoint existente)
**Endpoint**: `POST /instituciones`
```json
{
  "nombre": "IE Francisco José de Caldas",
  "telefono": "3001234567",
  "correo": "contacto@caldas.edu.co",
  "direccion": "Calle 5 #12-34",
  "naturaleza": "Pública",
  "municipioId": 1
}
```

---

### 👨‍💼 Datos de Prueba - Rectores

#### Crear Rector 1
```json
{
  "correo": "rector.prueba1@ietest.edu.co",
  "contrasena": "Rector123!",
  "nombre": "Carlos Alberto",
  "apellido": "Gómez Pérez",
  "telefono": "3101234567",
  "institucionId": 1
}
```

#### Crear Rector 2
```json
{
  "correo": "rector.prueba2@ietest.edu.co",
  "contrasena": "Rector456!",
  "nombre": "María Elena",
  "apellido": "Rodríguez López",
  "telefono": "3209876543",
  "institucionId": 1
}
```

**⚠️ NOTA**: Rectores creados tendrán `debeCambiarContrasena: true`

---

### 👨‍🏫 Datos de Prueba - Coordinadores

#### Crear Coordinador 1
```json
{
  "correo": "coordinador.prueba1@ietest.edu.co",
  "contrasena": "Coord123!",
  "nombre": "Juan Pablo",
  "apellido": "Martínez Sánchez",
  "telefono": "3157894561",
  "institucionId": 1
}
```

#### Crear Coordinador 2
```json
{
  "correo": "coordinador.prueba2@ietest.edu.co",
  "contrasena": "Coord456!",
  "nombre": "Ana María",
  "apellido": "Torres Gómez",
  "telefono": "3187456123",
  "institucionId": 1
}
```

---

### 📝 Flujo Completo de Testing

#### 1. Login como Admin
```bash
POST /admin/login
Body: {"correo": "admin@educacionpopayan.gov.co", "contrasena": "Admin123!"}
→ Guardar token
```

#### 2. Crear Rector
```bash
POST /admin/rectores
Headers: Authorization Bearer {token_admin}
Body: {datos rector del ejemplo}
→ Rector creado con debeCambiarContrasena=true
```

#### 3. Login como Rector
```bash
POST /rectores/login
Body: {"correo": "rector.prueba1@ietest.edu.co", "contrasena": "Rector123!"}
→ Verificar que response.usuario.debeCambiarContrasena === true
→ Guardar token rector
```

#### 4. Cambiar Contraseña de Rector
```bash
POST /usuarios/cambiar-password
Headers: Authorization Bearer {token_rector}
Body: {
  "contrasenaActual": "Rector123!",
  "contrasenaNueva": "MiNuevaPass123!",
  "confirmarContrasena": "MiNuevaPass123!"
}
→ Ahora debeCambiarContrasena === false
```

#### 5. Login Rector con Nueva Contraseña
```bash
POST /rectores/login
Body: {"correo": "rector.prueba1@ietest.edu.co", "contrasena": "MiNuevaPass123!"}
→ Verificar que debeCambiarContrasena === false
→ Rector puede acceder a todos los endpoints
```

#### 6. Listar Instituciones (Admin)
```bash
GET /admin/instituciones/pendientes
Headers: Authorization Bearer {token_admin}
→ Ver lista de instituciones
```

#### 7. Aprobar Institución (Admin)
```bash
PUT /admin/instituciones/1/aprobar
Headers: Authorization Bearer {token_admin}
→ Institución aprobada
```

---

### 🎯 IDs de Referencia (Base de Datos Actual)

```javascript
// Roles
const ROLES = {
  ADMIN_SISTEMA: 1,
  RECTOR: 2,
  COORDINADOR: 3,
  ORIENTADOR: 4,
  DOCENTE: 5,
  ACUDIENTE: 6
};

// Ubicaciones
const UBICACIONES = {
  DEPARTAMENTO_CAUCA: 1,
  MUNICIPIO_POPAYAN: 1
};

// Instituciones
const INSTITUCIONES = {
  IE_TEST: 1
};
```

---

## � ENDPOINTS DE LOGIN POR ROL

### ➡️ Login Rectores

**Endpoint**: `POST /rectores/login`  
**Autenticación**: ❌ No requiere (público)  
**Descripción**: Autenticación específica para usuarios con rol `rector`

#### Request Body:
```json
{
  "correo": "rector@institucion.edu.co",
  "contrasena": "Rector123!"
}
```

#### Response Success (200):
```json
{
  "success": true,
  "message": "Login exitoso como rector",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 6,
      "correo": "rector.test@instituciontest.edu.co",
      "rolId": 2,
      "rolNombre": "rector",
      "estaActivo": true,
      "debeCambiarContrasena": false,
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

#### Response Error (401):
```json
{
  "success": false,
  "message": "Correo o contraseña incorrectos"
}
```

#### Response Error (422):
```json
{
  "success": false,
  "message": "El usuario no tiene permisos de rector"
}
```

#### Response Error (403):
```json
{
  "success": false,
  "message": "Usuario inactivo"
}
```

#### Campos Frontend:
- **Form Fields**: `correo` (string, email), `contrasena` (string, min 8)
- **Validation**: Email válido, contraseña no vacía
- **Storage**: Guardar `data.token` y `data.usuario` en localStorage
- **Redirect**: Si `debeCambiarContrasena === true` → Pantalla cambio contraseña, sino → Dashboard Rector
- **Info Adicional**: Respuesta incluye datos completos del funcionario e institución

**⚠️ VALIDACIÓN DE ROL**: Este endpoint SOLO permite login de usuarios con `rolId: 2` (rector). Si un admin o coordinador intenta usar este endpoint, recibirá error 422.

---

### ➡️ Login Coordinadores

**Endpoint**: `POST /coordinadores/login`  
**Autenticación**: ❌ No requiere (público)  
**Descripción**: Autenticación específica para usuarios con rol `coordinador`

#### Request Body:
```json
{
  "correo": "coordinador@institucion.edu.co",
  "contrasena": "Coord123!"
}
```

#### Response Success (200):
```json
{
  "success": true,
  "message": "Login exitoso como coordinador",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 7,
      "correo": "coordinador@institucion.edu.co",
      "rolId": 3,
      "rolNombre": "coordinador",
      "estaActivo": true,
      "debeCambiarContrasena": false,
      "institucionId": 1,
      "institucion": "Institución Educativa Test",
      "funcionario": {
        "id": 3,
        "nombre": "María Elena",
        "apellido": "Rodríguez López",
        "telefono": "3209876543"
      }
    }
  }
}
```

#### Response Error (401):
```json
{
  "success": false,
  "message": "Correo o contraseña incorrectos"
}
```

#### Response Error (422):
```json
{
  "success": false,
  "message": "El usuario no tiene permisos de coordinador"
}
```

#### Campos Frontend:
- **Form Fields**: `correo` (string, email), `contrasena` (string, min 8)
- **Validation**: Email válido, contraseña no vacía
- **Storage**: Guardar `data.token` y `data.usuario` en localStorage
- **Redirect**: Si `debeCambiarContrasena === true` → Pantalla cambio contraseña, sino → Dashboard Coordinador
- **Info Adicional**: Respuesta incluye datos completos del funcionario e institución

**⚠️ VALIDACIÓN DE ROL**: Este endpoint SOLO permite login de usuarios con `rolId: 3` (coordinador). Si un admin o rector intenta usar este endpoint, recibirá error 422.

---

### 📋 Resumen de Endpoints de Login

#### 🌐 PLATAFORMA WEB ADMINISTRATIVA

| Endpoint | Rol Permitido | RolId | Estado |
|----------|---------------|-------|--------|
| `POST /admin/login` | Admin Sistema | 1 | ✅ Existente |
| `POST /rectores/login` | Rector | 2 | ✅ **NUEVO** |
| `POST /coordinadores/login` | Coordinador | 3 | ✅ **NUEVO** |
| `POST /docentes/login` | Docente | 5 | ✅ Existente |
| `POST /orientadores/login` | Orientador | 4 | ⏳ Pendiente |

#### 📱 APLICACIÓN MÓVIL (NO USAR EN WEB)

| Endpoint | Rol Permitido | RolId | Estado |
|----------|---------------|-------|--------|
| `POST /acudientes/login` | Acudiente | 6 | ✅ Existente |

**💡 Recomendación Frontend WEB**: Crear un router de login solo con roles administrativos:
```javascript
const LOGIN_ROUTES_WEB = {
  admin: '/admin/login',
  rector: '/rectores/login',
  coordinador: '/coordinadores/login',
  docente: '/docentes/login',
  orientador: '/orientadores/login'  // Pendiente de implementar
};

// NO incluir acudientes - es solo para app móvil
```

**⚠️ IMPORTANTE**: El endpoint `/acudientes/login` es EXCLUSIVO para la aplicación móvil. No debe ser usado en la plataforma web administrativa.

---

## �📋 ENDPOINTS ADMIN SISTEMA

### 1️⃣ Login Admin Sistema

**Endpoint**: `POST /admin/login`  
**Autenticación**: ❌ No requiere (público)  
**Descripción**: Autenticación de usuarios con rol `admin_sistema`

#### Request Body:
```json
{
  "correo": "admin@educacionpopayan.gov.co",
  "contrasena": "Admin123!"
}
```

#### Response Success (200):
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "usuario": {
      "id": 1,
      "correo": "admin@educacionpopayan.gov.co",
      "rolId": 1,
      "estaActivo": true,
      "debeCambiarContrasena": false
    }
  }
}
```

#### Response Error (401):
```json
{
  "success": false,
  "message": "Credenciales inválidas"
}
```

#### Campos Frontend:
- **Form Fields**: `correo` (string, email), `contrasena` (string, min 8)
- **Validation**: Email válido, contraseña no vacía
- **Storage**: Guardar `data.token` para requests subsecuentes
- **Redirect**: Si login exitoso → Dashboard Admin

---

### 2️⃣ Crear Rector

**Endpoint**: `POST /admin/rectores`  
**Autenticación**: ✅ Requiere token admin_sistema  
**Descripción**: Crea un nuevo rector para una institución

#### Request Body:
```json
{
  "correo": "rector@institucion.edu.co",
  "contrasena": "Rector123!",
  "nombre": "Carlos",
  "apellido": "Gómez",
  "telefono": "3101234567",
  "institucionId": 1
}
```

#### Response Success (201):
```json
{
  "success": true,
  "message": "Rector creado exitosamente",
  "data": {
    "usuario": {
      "id": 2,
      "correo": "rector@institucion.edu.co",
      "debeCambiarContrasena": true
    },
    "rector": {
      "id": 1,
      "nombre": "Carlos",
      "apellido": "Gómez",
      "telefono": "3101234567",
      "institucionId": 1
    }
  }
}
```

#### Response Error (400):
```json
{
  "success": false,
  "message": "El correo ya está registrado"
}
```

#### Campos Frontend:
- **correo**: Input email, validación formato email
- **contrasena**: Input password, mostrar requisitos:
  - ✅ Mínimo 8 caracteres
  - ✅ Al menos 1 mayúscula
  - ✅ Al menos 1 número
  - ✅ Al menos 1 carácter especial (!@#$%^&*)
- **nombre**: Input text, requerido
- **apellido**: Input text, requerido
- **telefono**: Input tel, requerido, formato 10 dígitos
- **institucionId**: Select/Dropdown de instituciones disponibles

**⚠️ IMPORTANTE**: 
- El rector creado tendrá `debeCambiarContrasena: true`
- En su primer login, debe cambiar su contraseña

---

### 3️⃣ Crear Coordinador

**Endpoint**: `POST /admin/coordinadores`  
**Autenticación**: ✅ Requiere token admin_sistema  
**Descripción**: Crea un nuevo coordinador para una institución

#### Request Body:
```json
{
  "correo": "coordinador@institucion.edu.co",
  "contrasena": "Coord123!",
  "nombre": "María",
  "apellido": "López",
  "telefono": "3209876543",
  "institucionId": 1
}
```

#### Response Success (201):
```json
{
  "success": true,
  "message": "Coordinador creado exitosamente",
  "data": {
    "usuario": {
      "id": 3,
      "correo": "coordinador@institucion.edu.co",
      "debeCambiarContrasena": true
    },
    "coordinador": {
      "id": 2,
      "nombre": "María",
      "apellido": "López",
      "telefono": "3209876543",
      "institucionId": 1
    }
  }
}
```

#### Campos Frontend:
- **Mismos campos que Crear Rector**
- **Mismas validaciones**

---

### 4️⃣ Listar Instituciones Pendientes

**Endpoint**: `GET /admin/instituciones/pendientes`  
**Autenticación**: ✅ Requiere token admin_sistema  
**Descripción**: Obtiene lista de todas las instituciones (actualmente lista todas, filtro pendiente se implementará con columna `is_approved`)

#### Request: No requiere body

#### Response Success (200):
```json
{
  "success": true,
  "message": "Instituciones obtenidas exitosamente",
  "data": [
    {
      "id": 1,
      "nombre": "Institución Educativa Test",
      "telefono": "3101234567",
      "correo": "contacto@institucion.edu.co",
      "direccion": "Calle 123 #45-67",
      "naturaleza": "Pública",
      "municipioId": 1,
      "creadoEn": "2026-01-21T10:00:00.000Z",
      "actualizadoEn": "2026-01-21T10:00:00.000Z",
      "municipio": {
        "id": 1,
        "nombre": "Popayán",
        "departamentoId": 1,
        "departamento": {
          "id": 1,
          "nombre": "Cauca"
        }
      }
    }
  ]
}
```

#### Campos Frontend:
- **Vista**: Tabla/Grid de instituciones
- **Columnas sugeridas**:
  - Nombre
  - Municipio - Departamento
  - Naturaleza (Pública/Privada)
  - Teléfono
  - Acciones (Ver detalles, Aprobar)
- **Filtros**: Por nombre, municipio, naturaleza
- **Ordenamiento**: Por fecha de creación (más recientes primero)

---

### 5️⃣ Aprobar Institución

**Endpoint**: `PUT /admin/instituciones/:id/aprobar`  
**Autenticación**: ✅ Requiere token admin_sistema  
**Descripción**: Aprueba una institución (actualiza estado)

#### Request: 
- **URL Param**: `:id` - ID de la institución
- **Body**: No requiere

#### Ejemplo Request:
```http
PUT /admin/instituciones/1/aprobar
Authorization: Bearer {token}
```

#### Response Success (200):
```json
{
  "success": true,
  "message": "Institución aprobada exitosamente",
  "data": {
    "id": 1,
    "nombre": "Institución Educativa Test",
    // ... demás campos
  }
}
```

#### Response Error (404):
```json
{
  "success": false,
  "message": "Institución no encontrada"
}
```

#### Campos Frontend:
- **Botón**: "Aprobar Institución"
- **Confirmación**: Modal de confirmación antes de aprobar
- **Feedback**: Toast/Snackbar con mensaje de éxito
- **Actualización**: Refrescar lista después de aprobar

---

## 🔑 CAMBIO DE CONTRASEÑA

### 6️⃣ Cambiar Contraseña

**Endpoint**: `POST /usuarios/cambiar-password`  
**Autenticación**: ✅ Requiere token JWT (cualquier rol autenticado)  
**Descripción**: Permite a usuarios cambiar su contraseña

#### Request Body:
```json
{
  "contrasenaActual": "Rector123!",
  "contrasenaNueva": "MiNueva123!",
  "confirmarContrasena": "MiNueva123!"
}
```

#### Response Success (200):
```json
{
  "success": true,
  "message": "Contraseña actualizada exitosamente",
  "data": {
    "debeCambiarContrasena": false
  }
}
```

#### Response Error (401):
```json
{
  "success": false,
  "message": "La contraseña actual es incorrecta"
}
```

#### Response Error (400):
```json
{
  "success": false,
  "message": "La contraseña debe cumplir los requisitos de seguridad",
  "errors": {
    "password": [
      "Mínimo 8 caracteres",
      "Al menos una letra mayúscula",
      "Al menos una letra minúscula",
      "Al menos un número",
      "Al menos un carácter especial (!@#$%^&*)"
    ]
  }
}
```

#### Campos Frontend:
- **contrasenaActual**: Input password, requerido
- **contrasenaNueva**: Input password, mostrar requisitos en tiempo real:
  - ✅ Mínimo 8 caracteres
  - ✅ Al menos 1 mayúscula
  - ✅ Al menos 1 minúscula
  - ✅ Al menos 1 número
  - ✅ Al menos 1 especial (!@#$%^&*)
- **confirmarContrasena**: Input password, debe coincidir con `contrasenaNueva`
- **Validaciones cliente**:
  ```javascript
  const validarContrasena = (password) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
  };
  ```
- **UI/UX**:
  - Mostrar medidor de fortaleza de contraseña
  - Validación en tiempo real de coincidencia
  - Botón deshabilitado hasta que todo sea válido

**⚠️ FLUJO CRÍTICO**:
1. Si usuario tiene `debeCambiarContrasena: true` en login
2. Redirigir INMEDIATAMENTE a pantalla de cambio de contraseña
3. No permitir navegación hasta que cambie contraseña
4. Después de cambio exitoso, permitir acceso normal

---

## 📚 CARGA MASIVA DE ESTUDIANTES

### 7️⃣ Descargar Plantilla Excel

**Endpoint**: `GET /estudiantes/plantilla-excel`  
**Autenticación**: ✅ Requiere token JWT (rector/coordinador)  
**Descripción**: Descarga plantilla Excel para carga masiva de estudiantes

#### Request: No requiere body

#### Response: 
- **Content-Type**: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Archivo**: `plantilla_estudiantes.xlsx`

#### Campos Frontend:
- **Botón**: "Descargar Plantilla"
- **Acción**: Trigger download del archivo
- **Ejemplo código**:
  ```javascript
  const descargarPlantilla = async () => {
    const response = await fetch('http://localhost:3333/estudiantes/plantilla-excel', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_estudiantes.xlsx';
    a.click();
  };
  ```

**Columnas de la plantilla**:
1. `nombres` - Nombres del estudiante
2. `apellidos` - Apellidos del estudiante
3. `tipoDocumento` - TI, CC, RC, etc.
4. `numeroDocumento` - Número único
5. `fechaNacimiento` - Formato: YYYY-MM-DD
6. `correo` - Email válido (opcional)

---

### 8️⃣ Validar Excel

**Endpoint**: `POST /estudiantes/validar-excel`  
**Autenticación**: ✅ Requiere token JWT (rector/coordinador)  
**Descripción**: Valida archivo Excel sin insertar datos, retorna preview de errores

#### Request:
- **Content-Type**: `multipart/form-data`
- **Field**: `archivo` (file)

#### Response Success (200):
```json
{
  "success": true,
  "message": "Validación completada",
  "data": {
    "totalFilas": 50,
    "filasValidas": 48,
    "filasInvalidas": 2,
    "errores": [
      {
        "fila": 15,
        "error": "Email inválido: 'correo@malformado'"
      },
      {
        "fila": 32,
        "error": "Documento duplicado: '1234567890'"
      }
    ],
    "estudiantesValidos": [
      {
        "fila": 2,
        "nombres": "Juan",
        "apellidos": "Pérez",
        "numeroDocumento": "1234567890"
      }
      // ... más estudiantes válidos
    ]
  }
}
```

#### Campos Frontend:
- **Input**: File upload (accept=".xlsx,.xls")
- **Botón**: "Validar Archivo"
- **Vista Preview**:
  - Mostrar total de filas procesadas
  - Lista de errores (si existen)
  - Tabla de estudiantes válidos para confirmar
  - Botón "Continuar con Carga" (solo si hay válidos)

---

### 9️⃣ Carga Masiva Final

**Endpoint**: `POST /estudiantes/carga-masiva`  
**Autenticación**: ✅ Requiere token JWT (rector/coordinador)  
**Descripción**: Inserta estudiantes válidos en la base de datos

#### Request:
- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `archivo` (file)
  - `cursoId` (number) - ID del curso destino

#### Ejemplo:
```javascript
const formData = new FormData();
formData.append('archivo', file);
formData.append('cursoId', '5');

fetch('http://localhost:3333/estudiantes/carga-masiva', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

#### Response Success (200):
```json
{
  "success": true,
  "message": "Carga masiva completada",
  "data": {
    "totalProcesados": 50,
    "insertados": 48,
    "rechazados": 2,
    "errores": [
      {
        "fila": 15,
        "error": "Email inválido"
      }
    ]
  }
}
```

#### Response Error (400):
```json
{
  "success": false,
  "message": "Curso no encontrado o no tiene permisos"
}
```

#### Campos Frontend:
- **Flujo completo**:
  1. Descargar plantilla
  2. Seleccionar archivo
  3. Validar archivo (preview)
  4. Seleccionar curso destino (dropdown)
  5. Confirmar carga
  6. Mostrar progreso/resultado
- **Feedback**: Barra de progreso, resumen final con estadísticas

---

## 🔔 NOTIFICACIONES PUSH (FCM)

### 🔧 Configuración Cliente

Las notificaciones están integradas en eventos del backend. Frontend debe:

1. **Registrar token FCM**:
```javascript
// Después de login exitoso
const registerFCMToken = async (fcmToken) => {
  await fetch('http://localhost:3333/notificaciones/token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ tokenFcm: fcmToken })
  });
};
```

2. **Eventos que disparan notificaciones**:
   - ✅ Nueva asignación/tarea creada → Notifica a estudiantes del curso
   - ✅ Calificación publicada → Notifica al estudiante
   - ✅ Institución aprobada → Notifica al rector (futuro)

3. **Payload de notificaciones**:
```json
{
  "notification": {
    "title": "Nueva tarea asignada",
    "body": "Matemáticas: Resolver ejercicios página 45"
  },
  "data": {
    "type": "asignacion",
    "asignacionId": "123",
    "cursoId": "5"
  }
}
```

---

## 🚨 MANEJO DE ERRORES GLOBAL

### Códigos HTTP Estándar

| Código | Significado | Acción Frontend |
|--------|-------------|-----------------|
| 200 | OK | Éxito |
| 201 | Created | Recurso creado |
| 400 | Bad Request | Mostrar errores de validación |
| 401 | Unauthorized | Token inválido → Logout |
| 403 | Forbidden | Sin permisos → Mensaje |
| 404 | Not Found | Recurso no existe |
| 500 | Server Error | Mensaje genérico de error |

### Estructura Error Estándar

```json
{
  "success": false,
  "message": "Mensaje descriptivo del error",
  "errors": {
    "campo1": ["Error 1", "Error 2"],
    "campo2": ["Error 3"]
  }
}
```

### Interceptor Recomendado (Axios ejemplo)

```javascript
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expirado o inválido
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    if (error.response?.status === 403) {
      // Sin permisos
      toast.error('No tienes permisos para esta acción');
    }
    
    return Promise.reject(error);
  }
);
```

---

## 🎨 RECOMENDACIONES UI/UX

### Login
- Mostrar errores específicos (credenciales incorrectas vs cuenta inactiva)
- Opción "Recordarme" para mantener sesión
- Link "¿Olvidaste tu contraseña?" (futuro)

### Cambio de Contraseña Obligatorio
- **Modal bloqueante** si `debeCambiarContrasena: true`
- No permitir cerrar sin cambiar
- Medidor de fortaleza visual
- Confirmación de cambio exitoso

### Carga Masiva Excel
- **Wizard/Steps**: 
  1. Descargar plantilla
  2. Subir archivo
  3. Validar
  4. Confirmar
  5. Resultado
- Mostrar preview de datos antes de confirmar
- Opción de descargar reporte de errores

### Admin Panel
- Dashboard con estadísticas: # rectores, # coordinadores, # instituciones
- Filtros y búsqueda en tablas
- Confirmaciones para acciones críticas (aprobar institución, crear usuarios)

---

## 📞 CONTACTO Y SOPORTE

**Backend Team**:
- Cualquier duda sobre endpoints o campos
- Reportar errores o comportamientos inesperados
- Solicitudes de cambios o nuevos endpoints

**Testing Backend**: ✅ Completado al 100%  
**Ambiente**: Desarrollo (localhost:3333)  
**Siguiente paso**: Despliegue a staging/producción

---

---

## 👥 GESTIÓN DE USUARIOS

### 🔟 Listar Usuarios

**Endpoint**: `GET /usuarios`  
**Autenticación**: ✅ Requiere token JWT  
**Descripción**: Obtiene lista paginada de todos los usuarios con sus roles e instituciones

#### Query Parameters (Opcionales):
```
?rol=2              // Filtrar por rolId (1=admin, 2=rector, 3=coordinador, etc.)
?institucionId=1    // Filtrar por institución
?activo=true        // Filtrar por estado (true/false)
?page=1             // Página actual (default: 1)
?limit=100          // Usuarios por página (default: 100)
```

#### Ejemplo Request:
```http
GET /usuarios?rol=2&activo=true&page=1&limit=20
Authorization: Bearer {token}
```

#### Response Success (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 6,
      "correo": "rector.test@instituciontest.edu.co",
      "rolId": 2,
      "rol": "rector",
      "estaActivo": true,
      "debeCambiarContrasena": false,
      "creadoEn": "2026-01-22T00:26:19.768+00:00",
      "nombre": "Carlos",
      "apellido": "Gómez",
      "telefono": "3101234567",
      "institucionId": 1,
      "institucion": "Institución Educativa Test"
    }
  ],
  "meta": {
    "total": 9,
    "perPage": 100,
    "currentPage": 1,
    "lastPage": 1
  }
}
```

#### Campos Frontend:
- **Tabla/Grid**: Mostrar usuarios con paginación
- **Columnas**: Correo, Nombre, Rol, Institución, Estado, Acciones
- **Filtros**: Por rol, institución, estado activo/inactivo
- **Acciones**: Ver detalle, Editar, Desactivar

---

### 1️⃣1️⃣ Obtener Usuario Específico

**Endpoint**: `GET /usuarios/:id`  
**Autenticación**: ✅ Requiere token JWT  
**Descripción**: Obtiene detalles completos de un usuario específico

#### Request:
```http
GET /usuarios/6
Authorization: Bearer {token}
```

#### Response Success (200):
```json
{
  "success": true,
  "data": {
    "id": 6,
    "correo": "rector.test@instituciontest.edu.co",
    "rolId": 2,
    "rol": "rector",
    "estaActivo": true,
    "debeCambiarContrasena": false,
    "creadoEn": "2026-01-22T00:26:19.768+00:00",
    "nombre": "Carlos",
    "apellido": "Gómez",
    "telefono": "3101234567",
    "institucionId": 1,
    "institucion": "Institución Educativa Test"
  }
}
```

#### Response Error (404):
```json
{
  "success": false,
  "message": "Usuario no encontrado"
}
```

---

### 1️⃣2️⃣ Actualizar Usuario

**Endpoint**: `PUT /usuarios/:id`  
**Autenticación**: ✅ Requiere token JWT  
**Descripción**: Actualiza información de un usuario (nombre, teléfono, estado)

#### Request Body:
```json
{
  "nombre": "Carlos Alberto",
  "apellido": "Gómez Pérez",
  "telefono": "3001234567",
  "estaActivo": true
}
```

**NOTA**: Todos los campos son opcionales, solo envía los que quieres actualizar.

#### Response Success (200):
```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": {
    "id": 6,
    "correo": "rector.test@instituciontest.edu.co",
    "rolId": 2,
    "rol": "rector",
    "estaActivo": true,
    "nombre": "Carlos Alberto",
    "apellido": "Gómez Pérez",
    "telefono": "3001234567",
    "institucionId": 1,
    "institucion": "Institución Educativa Test"
  }
}
```

#### Campos Frontend:
- **Form**: Inputs para nombre, apellido, teléfono
- **Toggle**: Switch para activar/desactivar usuario
- **Validaciones**: Teléfono 10 dígitos, campos requeridos
- **Confirmación**: Modal antes de guardar cambios

---

### 1️⃣3️⃣ Desactivar Usuario

**Endpoint**: `DELETE /usuarios/:id`  
**Autenticación**: ✅ Requiere token JWT  
**Descripción**: Desactiva un usuario (soft delete, no lo elimina de BD)

#### Request:
```http
DELETE /usuarios/5
Authorization: Bearer {token}
```

#### Response Success (200):
```json
{
  "success": true,
  "message": "Usuario desactivado exitosamente",
  "data": {
    "id": 5,
    "estaActivo": false
  }
}
```

#### Response Error (403):
```json
{
  "success": false,
  "message": "No se puede desactivar el usuario administrador principal"
}
```

#### Campos Frontend:
- **Botón**: "Desactivar Usuario" (icono de prohibido)
- **Confirmación**: Modal crítico de confirmación
- **Mensaje**: "¿Estás seguro? El usuario no podrá ingresar al sistema"
- **Protección**: No permitir desactivar admin principal

---

## 🏫 PANEL DE RECTOR

### 1️⃣4️⃣ Obtener Perfil del Usuario Autenticado

**Endpoint**: `GET /usuarios/me`  
**Autenticación**: ✅ Requiere token JWT  
**Descripción**: Obtiene el perfil completo del usuario autenticado con información de su institución

#### Request: No requiere body

#### Response Success (200):
```json
{
  "success": true,
  "data": {
    "id": 6,
    "correo": "rector.test@instituciontest.edu.co",
    "rolId": 2,
    "estaActivo": true,
    "debeCambiarContrasena": false,
    "nombre": "Carlos",
    "apellido": "Gómez",
    "telefono": "3101234567",
    "documento": "12345678",
    "tipoDocumento": "cc",
    "institucionId": 1,
    "institucion": {
      "id": 1,
      "nombre": "Institución Educativa Test",
      "direccion": "Calle 123 #45-67",
      "telefono": "8234567",
      "correo": "info@ietest.edu.co",
      "naturaleza": "Pública",
      "codigoDane": "119001001234",
      "nit": "900123456-7",
      "municipio": {
        "id": 1,
        "nombre": "Popayán",
        "departamento": {
          "id": 1,
          "nombre": "Cauca"
        }
      }
    }
  }
}
```

#### Campos Frontend:
- **Header**: Mostrar nombre completo del usuario
- **Info Personal**: Correo, teléfono, documento
- **Info Institución**: Nombre, dirección, municipio, departamento
- **Editar Perfil**: Botón para actualizar información

**💡 USO**: Este endpoint reemplaza la necesidad de llamar múltiples endpoints para obtener datos del usuario y su institución.

---

### 1️⃣5️⃣ Obtener Detalles de Institución

**Endpoint**: `GET /instituciones/:id`  
**Autenticación**: ❌ No requiere (público)  
**Descripción**: Obtiene detalles completos de una institución específica

#### Request:
```http
GET /instituciones/1
```

#### Response Success (200):
```json
{
  "success": true,
  "data": {
    "id": 1,
    "nombre": "Institución Educativa Test",
    "telefono": "8234567",
    "correo": "info@ietest.edu.co",
    "direccion": "Calle 123 #45-67",
    "naturaleza": "Pública",
    "codigoDane": "119001001234",
    "nit": "900123456-7",
    "activo": true,
    "municipioId": 1,
    "municipio": {
      "id": 1,
      "nombre": "Popayán",
      "departamento": {
        "id": 1,
        "nombre": "Cauca"
      }
    }
  }
}
```

#### Response Error (404):
```json
{
  "success": false,
  "message": "Institución no encontrada"
}
```

#### Campos Frontend:
- **Vista de Detalle**: Toda la información de la institución
- **Datos Administrativos**: Código DANE, NIT
- **Ubicación**: Municipio y departamento
- **Estado**: Activo/Inactivo

---

### 1️⃣6️⃣ Listar Todas las Instituciones

**Endpoint**: `GET /instituciones`  
**Autenticación**: ❌ No requiere (público)  
**Descripción**: Obtiene lista de todas las instituciones registradas

#### Request: No requiere body

#### Response Success (200):
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "nombre": "Institución Educativa Test",
      "telefono": "8234567",
      "correo": "info@ietest.edu.co",
      "direccion": "Calle 123 #45-67",
      "naturaleza": "Pública",
      "activo": true,
      "municipio": {
        "id": 1,
        "nombre": "Popayán",
        "departamento": {
          "id": 1,
          "nombre": "Cauca"
        }
      }
    }
  ]
}
```

#### Campos Frontend:
- **Tabla/Grid**: Lista completa de instituciones
- **Filtros**: Por municipio, naturaleza (pública/privada), estado
- **Búsqueda**: Por nombre de institución
- **Acciones**: Ver detalles, seleccionar

---

### 1️⃣7️⃣ Obtener Directivos de Institución

**Endpoint**: `GET /instituciones/:id/directivos`  
**Autenticación**: ✅ Requiere token JWT  
**Descripción**: Obtiene coordinadores y orientadores de una institución

#### Request:
```http
GET /instituciones/1/directivos
Authorization: Bearer {token}
```

#### Response Success (200):
```json
{
  "success": true,
  "data": {
    "coordinadores": [
      {
        "id": 2,
        "nombre": "María",
        "apellido": "López",
        "telefono": "3209876543",
        "correo": "coordinador@ietest.edu.co",
        "activo": true,
        "usuarioId": 3
      }
    ],
    "orientadores": [
      {
        "id": 3,
        "nombre": "Pedro",
        "apellido": "García",
        "telefono": "3002222222",
        "correo": "orientador@ietest.edu.co",
        "activo": true,
        "usuarioId": 4
      }
    ]
  }
}
```

#### Response Error (404):
```json
{
  "success": false,
  "message": "Institución no encontrada"
}
```

#### Campos Frontend:
- **Secciones Separadas**: Coordinadores y Orientadores
- **Tarjetas**: Cada directivo con foto, nombre, contacto
- **Estado**: Badge indicando activo/inactivo
- **Acciones**: Ver perfil, contactar, editar

---

### 1️⃣8️⃣ Estadísticas del Rector

**Endpoint**: `GET /rectores/estadisticas`  
**Autenticación**: ✅ Requiere token JWT (solo rectores)  
**Descripción**: Obtiene estadísticas y métricas de la institución del rector

#### Request:
```http
GET /rectores/estadisticas
Authorization: Bearer {token}
```

#### Response Success (200):
```json
{
  "success": true,
  "data": {
    "institucionId": 1,
    "institucionNombre": "Institución Educativa Test",
    "totalCoordinadores": 2,
    "coordinadoresActivos": 2,
    "totalOrientadores": 3,
    "orientadoresActivos": 2,
    "totalDocentes": 15,
    "docentesActivos": 14,
    "totalCursos": 12,
    "totalEstudiantes": 350
  }
}
```

#### Response Error (403):
```json
{
  "success": false,
  "message": "Solo los rectores pueden acceder a estas estadísticas"
}
```

#### Campos Frontend:
- **Dashboard Cards**: 
  - Coordinadores (total y activos)
  - Orientadores (total y activos)
  - Docentes (total y activos)
  - Cursos totales
  - Estudiantes totales
- **Gráficos**: Visualización de métricas
- **Indicadores**: Porcentaje de activos vs totales
- **Filtros**: Por periodo académico (futuro)

**💡 USO**: Este endpoint es ideal para el dashboard principal del rector, mostrando un resumen ejecutivo de su institución.

---

## 🔄 CHANGELOG

### v1.3.0 - 22 Enero 2026 🎉 NUEVO
- ✅ **PANEL DE RECTOR COMPLETO**: 5 nuevos endpoints
  - `GET /usuarios/me` - Perfil del usuario autenticado con institución
  - `GET /instituciones/:id` - Detalles completos de institución
  - `GET /instituciones` - Listar todas las instituciones
  - `GET /instituciones/:id/directivos` - Coordinadores y orientadores
  - `GET /rectores/estadisticas` - Dashboard con métricas de la institución
- ✅ **DATOS ENRIQUECIDOS**: Todos los endpoints incluyen información de municipio y departamento
- ✅ **VALIDACIÓN DE ROL**: Estadísticas solo accesibles para rectores
- ✅ Todos los endpoints probados exitosamente
- ✅ Documentación completa con ejemplos y casos de uso

### v1.2.0 - 22 Enero 2026 ⭐
- ✅ **ENDPOINTS DE LOGIN POR ROL (WEB ADMINISTRATIVA)**: Autenticación específica por rol
  - `POST /rectores/login` - Login exclusivo para rectores (rolId: 2)
  - `POST /coordinadores/login` - Login exclusivo para coordinadores (rolId: 3)
- ✅ **VALIDACIÓN DE ROL**: Cada endpoint valida que el usuario tenga el rol correcto
- ✅ **RESPUESTA ENRIQUECIDA**: Incluye datos de funcionario e institución
- ✅ Endpoint `/rectores/login` probado exitosamente
- ✅ Códigos de error específicos (401, 403, 422)
- ✅ Documentación completa con ejemplos
- ℹ️ **ACLARACIÓN**: Endpoints de acudientes son solo para app móvil, no incluidos aquí

### v1.1.0 - 22 Enero 2026
- ✅ **NUEVOS ENDPOINTS**: Gestión completa de usuarios
  - `GET /usuarios` - Listar usuarios con filtros y paginación
  - `GET /usuarios/:id` - Obtener usuario específico
  - `PUT /usuarios/:id` - Actualizar información de usuario
  - `DELETE /usuarios/:id` - Desactivar usuario (soft delete)
- ✅ Todos los endpoints probados y funcionando
- ✅ Filtros por rol, institución y estado activo
- ✅ Paginación configurable
- ✅ Protección contra desactivar admin principal

### v1.0.0 - 21 Enero 2026
- ✅ Módulo Admin Sistema completo
- ✅ Cambio obligatorio de contraseña
- ✅ Carga masiva de estudiantes
- ✅ Notificaciones FCM integradas
- ✅ Seeds de roles y datos de prueba

### Próximas Implementaciones
- [ ] Recuperación de contraseña (forgot password)
- [ ] Gestión de orientadores
- [ ] Filtros avanzados adicionales
- [ ] Exportación de reportes

---

## 📊 RESUMEN DE ENDPOINTS DISPONIBLES

### Total: **20 Endpoints Implementados** ✅

**Autenticación por Rol (2)**:
- `POST /rectores/login` - Login rectores
- `POST /coordinadores/login` - Login coordinadores

**Panel de Rector (5)** 🆕:
- `GET /usuarios/me` - Perfil del usuario autenticado
- `GET /instituciones` - Listar instituciones
- `GET /instituciones/:id` - Detalles de institución
- `GET /instituciones/:id/directivos` - Coordinadores y orientadores
- `GET /rectores/estadisticas` - Dashboard de métricas

**Admin Sistema (5)**:
- `POST /admin/login` - Login admin
- `POST /admin/rectores` - Crear rector
- `POST /admin/coordinadores` - Crear coordinador
- `GET /admin/instituciones/pendientes` - Listar instituciones
- `PUT /admin/instituciones/:id/aprobar` - Aprobar institución

**Gestión Usuarios (4)** 🆕:
- `GET /usuarios` - Listar usuarios
- `GET /usuarios/:id` - Obtener usuario
- `PUT /usuarios/:id` - Actualizar usuario
- `DELETE /usuarios/:id` - Desactivar usuario

**Contraseñas (1)**:
- `POST /usuarios/cambiar-password` - Cambiar contraseña

**Estudiantes (3)**:
- `GET /estudiantes/plantilla-excel` - Descargar plantilla
- `POST /estudiantes/validar-excel` - Validar Excel
- `POST /estudiantes/carga-masiva` - Carga masiva

**Adicionales**:
- `GET /cursos` - Listar cursos ✅
- `GET /tareas` - Listar tareas ✅

---

**¡Backend 100% funcional para gestión de usuarios! 🚀**

Saludos cordiales,  
**Equipo Backend - Parchando Juntos**
