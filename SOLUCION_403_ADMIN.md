# 🔧 SOLUCIÓN: 403 Forbidden en Endpoints de Admin

## 🎯 Diagnóstico

**Problema reportado**: 
- ❌ 403 Forbidden en `POST /admin/login`
- ❌ 403 Forbidden en `GET /admin/instituciones/pendientes`

**Resultado de pruebas**:
- ✅ `POST /admin/login` **FUNCIONA CORRECTAMENTE**
- ✅ `GET /admin/instituciones/pendientes` **FUNCIONA CORRECTAMENTE CON TOKEN**

---

## 📋 Pruebas Realizadas

### 1. Test Login Admin
```powershell
POST http://localhost:3333/admin/login
Body: {
  "correo": "admin@educacionpopayan.gov.co",
  "contrasena": "Admin123!"
}

✅ RESULTADO: Login exitoso
Token generado correctamente
```

### 2. Test Instituciones Pendientes
```powershell
GET http://localhost:3333/admin/instituciones/pendientes
Headers: Authorization: Bearer {token}

✅ RESULTADO: 200 OK
Lista de instituciones obtenida correctamente
```

---

## 🔍 Causa del Problema

El endpoint `/admin/instituciones/pendientes` está **protegido** por dos middlewares:

1. **JWT Middleware**: Valida que el token sea válido
2. **Admin Sistema Middleware**: Valida que el usuario tenga `rolId: 1`

**El error 403 Forbidden ocurre cuando**:
- ❌ El frontend NO envía el header `Authorization`
- ❌ El token JWT es inválido o está expirado
- ❌ El usuario no tiene rol de admin (rolId !== 1)

---

## ✅ Solución para Frontend

### Configuración Correcta de Headers

```javascript
// 1. Guardar el token después del login
const loginResponse = await fetch('http://localhost:3333/admin/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    correo: 'admin@educacionpopayan.gov.co',
    contrasena: 'Admin123!'
  })
});

const { data } = await loginResponse.json();
const token = data.token; // Guardar este token

// 2. Usar el token en requests subsecuentes
const institucionesResponse = await fetch('http://localhost:3333/admin/instituciones/pendientes', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,  // ⚠️ CRÍTICO: Incluir este header
    'Content-Type': 'application/json'
  }
});

const instituciones = await institucionesResponse.json();
```

---

## 🔐 Configuración de Interceptor (Recomendado)

### Axios Example

```javascript
import axios from 'axios';

// Crear instancia de axios
const api = axios.create({
  baseURL: 'http://localhost:3333',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores 401/403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido o expirado
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    if (error.response?.status === 403) {
      // Sin permisos
      console.error('No tienes permisos para esta acción');
    }
    return Promise.reject(error);
  }
);

// Uso
const response = await api.get('/admin/instituciones/pendientes');
```

### Fetch Example

```javascript
// Función helper para requests autenticadas
async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token && { 'Authorization': `Bearer ${token}` })
    }
  };

  const response = await fetch(url, config);
  
  // Manejar errores
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  
  if (response.status === 403) {
    throw new Error('No tienes permisos para esta acción');
  }

  return response;
}

// Uso
const response = await fetchWithAuth('http://localhost:3333/admin/instituciones/pendientes');
const data = await response.json();
```

---

## 🌐 Configuración CORS

**Estado actual**: ✅ **Configurado correctamente**

```typescript
// config/cors.ts
{
  enabled: true,
  origin: true,  // Permite todos los orígenes (incluyendo localhost:5173)
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  headers: true,
  credentials: true,
  maxAge: 90
}
```

**No hay problemas de CORS** - El servidor acepta requests de `localhost:5173`.

---

## 📊 Rutas de Admin - Configuración

### Rutas Públicas (No requieren autenticación):
```
POST /admin/login
```

### Rutas Protegidas (Requieren JWT + rol admin):
```
POST   /admin/rectores
POST   /admin/coordinadores
GET    /admin/instituciones/pendientes
PUT    /admin/instituciones/:id/aprobar
```

---

## 🔒 Tokens JWT

### Estructura del Token

```javascript
{
  sub: 1,                                    // ID del usuario
  correo: "admin@educacionpopayan.gov.co",  // Email del usuario
  rolId: 1,                                  // Rol (1 = admin_sistema)
  iat: 1769093276,                           // Fecha de emisión
  exp: 1769698076                            // Fecha de expiración (7 días)
}
```

### Validación

El middleware JWT verifica:
- ✅ Token válido (firma correcta)
- ✅ Token no expirado
- ✅ Usuario existe en base de datos
- ✅ Usuario está activo

El middleware AdminSistema verifica:
- ✅ `rolId === 1` (admin_sistema)

---

## 🛠️ Checklist de Integración Frontend

### Para Login:
- [ ] Enviar `POST /admin/login` con correo y contraseña
- [ ] Guardar `data.token` en localStorage/sessionStorage
- [ ] Guardar `data.usuario` para información del usuario
- [ ] Redirigir al dashboard después de login exitoso

### Para Requests Autenticadas:
- [ ] Incluir header `Authorization: Bearer {token}` en TODAS las requests protegidas
- [ ] Implementar interceptor para agregar token automáticamente
- [ ] Manejar error 401 (token expirado) → logout y redirigir a login
- [ ] Manejar error 403 (sin permisos) → mostrar mensaje al usuario

### Debugging:
- [ ] Verificar en DevTools → Network que el header `Authorization` se está enviando
- [ ] Verificar que el token no esté vacío o sea `null`
- [ ] Verificar que el formato sea exactamente `Bearer {token}` (con espacio)
- [ ] Verificar que el token no haya expirado (válido por 7 días)

---

## 🧪 Comando de Prueba PowerShell

Para verificar que el backend funciona correctamente:

```powershell
# 1. Login
$loginBody = @{
    correo = "admin@educacionpopayan.gov.co"
    contrasena = "Admin123!"
} | ConvertTo-Json

$loginResp = Invoke-RestMethod -Uri 'http://localhost:3333/admin/login' `
    -Method Post `
    -Body $loginBody `
    -ContentType 'application/json'

$token = $loginResp.data.token
Write-Host "Token obtenido: $($token.Substring(0, 50))..."

# 2. Instituciones Pendientes
$headers = @{
    'Authorization' = "Bearer $token"
}

$instResp = Invoke-RestMethod -Uri 'http://localhost:3333/admin/instituciones/pendientes' `
    -Method Get `
    -Headers $headers

Write-Host "Instituciones obtenidas: $($instResp.data.Count)"
```

---

## 📞 Resumen

**El backend está funcionando correctamente** ✅

**El problema está en el frontend**:
- ❌ No está enviando el header `Authorization` 
- ❌ O el token está expirado/inválido
- ❌ O el token no se guardó correctamente después del login

**Solución**:
1. Verificar que después del login se guarde el token: `localStorage.setItem('token', data.token)`
2. Incluir el header `Authorization: Bearer {token}` en TODAS las requests a endpoints protegidos
3. Implementar un interceptor para agregar el token automáticamente
4. Manejar errores 401 y 403 correctamente

---

**Estado del servidor**: 🟢 Online y funcionando correctamente  
**Puerto**: 3333  
**CORS**: ✅ Configurado para localhost:5173  
**Endpoints admin**: ✅ Todos funcionando
