# 📱 BACKEND - ENDPOINTS APP MÓVIL ACUDIENTE

> **Fecha de creación**: 22 de enero de 2026  
> **Proyecto**: PARCHANDO JUNTOS - Cátedra de Familia  
> **Framework**: AdonisJS 6 + TypeScript + PostgreSQL  
> **Cliente**: App Android (Kotlin/Jetpack Compose)

---

## 📋 RESUMEN EJECUTIVO

Este documento detalla **TODOS** los endpoints requeridos para la aplicación móvil del **Acudiente/Padre de Familia**. Está organizado por épica y HU para facilitar el seguimiento.

**Historias de Usuario cubiertas**: HU-22 a HU-42 (21 HU totales)  
**Endpoints totales requeridos**: ~35 endpoints

---

## 🎯 ÉPICA EP-07: Autenticación y Gestión de Perfil

### 🔐 HU-22: Iniciar sesión en app móvil

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/auth/login/movil` | Login de acudiente |

```typescript
// POST /auth/login/movil
// Request
{
  "documento": "12345678",      // Número de documento (usuario)
  "password": "12345678"        // Contraseña (inicialmente = documento)
}

// Response 200 OK
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "documento": "12345678",
    "firstName": "María",
    "lastName": "González",
    "phone": "3101234567",
    "email": "maria@email.com",
    "roleId": "acudiente",
    "mustChangePassword": true,
    "lastLogin": "2026-01-22T10:30:00Z"
  },
  "estudiantes": [
    {
      "id": 10,
      "firstName": "Carlos",
      "lastName": "González",
      "documento": "1234567890",
      "curso": { "id": 3, "name": "5° A", "grado": "Quinto" },
      "institucion": { "id": 1, "name": "IE San José" },
      "parentesco": "Madre",
      "esPrincipal": true
    }
  ]
}

// Response 401 Unauthorized
{
  "success": false,
  "message": "Documento o contraseña incorrectos"
}
```

**Checklist implementación:**
- [ ] Validar documento y password
- [ ] Verificar que roleId = 'acudiente'
- [ ] Generar JWT token (7 días expiración)
- [ ] Actualizar lastLogin en BD
- [ ] Incluir flag mustChangePassword en respuesta
- [ ] Incluir lista de estudiantes vinculados con sus cursos e instituciones
- [ ] Registrar en auditoría (IP, user-agent, timestamp)

---

### 📖 HU-23: Onboarding (No requiere backend)

> ⚠️ **Implementación 100% en cliente (SharedPreferences)**  
> El backend NO necesita endpoints para esta HU.

---

### 🔑 HU-24: Cambiar contraseña obligatoriamente

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/auth/cambiar-password` | Cambio de contraseña |

```typescript
// POST /auth/cambiar-password
// Headers: Authorization: Bearer {token}
// Request
{
  "currentPassword": "12345678",
  "newPassword": "MiNueva123!",
  "confirmPassword": "MiNueva123!"
}

// Response 200 OK
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}

// Response 400 Bad Request
{
  "success": false,
  "errors": [
    "La contraseña actual es incorrecta",
    "La nueva contraseña no puede ser tu número de documento",
    "La nueva contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial"
  ]
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Validar currentPassword contra hash en BD
- [ ] Validar newPassword !== documento del usuario
- [ ] Validar newPassword !== currentPassword
- [ ] Validar requisitos: 8+ chars, 1 mayúscula, 1 número, 1 especial
- [ ] Actualizar password con hash
- [ ] Actualizar mustChangePassword = false
- [ ] Registrar en auditoría

---

### 🔄 HU-25: Recuperar contraseña olvidada

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/auth/recuperar/solicitar` | Solicitar código OTP |
| `POST` | `/auth/recuperar/verificar` | Verificar código OTP |
| `POST` | `/auth/recuperar/restablecer` | Establecer nueva contraseña |

```typescript
// POST /auth/recuperar/solicitar
// Request
{
  "contacto": "3101234567"  // Teléfono o email
}

// Response 200 OK
{
  "success": true,
  "message": "Código enviado a tu teléfono",
  "metodo": "sms",           // "sms" o "email"
  "expiraEn": 900            // Segundos (15 minutos)
}

// Response 404 Not Found
{
  "success": false,
  "message": "No encontramos una cuenta con ese dato"
}
```

```typescript
// POST /auth/recuperar/verificar
// Request
{
  "contacto": "3101234567",
  "codigo": "123456"
}

// Response 200 OK
{
  "success": true,
  "token": "reset_token_temporal_xyz123"  // Token para paso 3
}

// Response 400 Bad Request
{
  "success": false,
  "message": "El código ha expirado. Solicita uno nuevo"
}

// Response 429 Too Many Requests
{
  "success": false,
  "message": "Demasiados intentos. Solicita un nuevo código"
}
```

```typescript
// POST /auth/recuperar/restablecer
// Request
{
  "token": "reset_token_temporal_xyz123",
  "newPassword": "MiNueva123!",
  "confirmPassword": "MiNueva123!"
}

// Response 200 OK
{
  "success": true,
  "message": "Contraseña restablecida. Ya puedes iniciar sesión"
}
```

**Checklist implementación:**
- [ ] Generar código OTP de 6 dígitos aleatorios
- [ ] Guardar código + expiración (15 min) en tabla otp_codes o caché
- [ ] Integrar con servicio SMS (Twilio/AWS SNS) o email (SendGrid)
- [ ] Máximo 3 intentos por código
- [ ] Invalidar código después de uso exitoso
- [ ] Generar token temporal para paso 3
- [ ] Validar requisitos de nueva contraseña

---

### 👨‍👧‍👦 HU-26: Cambiar entre hijos vinculados

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/acudientes/mis-estudiantes` | Lista de hijos vinculados |

```typescript
// GET /acudientes/mis-estudiantes
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "data": [
    {
      "id": 10,
      "firstName": "Carlos",
      "lastName": "González",
      "documento": "1234567890",
      "foto": "https://storage.../carlos.jpg",  // null si no tiene
      "curso": {
        "id": 3,
        "name": "5° A",
        "grado": "Quinto",
        "jornada": "Mañana"
      },
      "institucion": {
        "id": 1,
        "name": "IE San José"
      },
      "parentesco": "Madre",
      "esPrincipal": true
    },
    {
      "id": 15,
      "firstName": "Laura",
      "lastName": "González",
      "documento": "1234567891",
      "foto": null,
      "curso": {
        "id": 7,
        "name": "3° B",
        "grado": "Tercero",
        "jornada": "Mañana"
      },
      "institucion": {
        "id": 1,
        "name": "IE San José"
      },
      "parentesco": "Madre",
      "esPrincipal": false
    }
  ]
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Buscar relaciones en tabla estudiante_acudiente
- [ ] Incluir datos del estudiante, curso e institución (eager load)
- [ ] Ordenar: principal primero, luego alfabético

---

### 👤 HU-27: Ver perfil del estudiante

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/estudiantes/:id/perfil` | Perfil completo del estudiante |

```typescript
// GET /estudiantes/10/perfil
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "data": {
    "id": 10,
    "firstName": "Carlos",
    "lastName": "González",
    "documento": "1234567890",
    "tipoDocumento": "TI",
    "fechaNacimiento": "2015-03-15",
    "edad": 10,
    "sexo": "M",
    "foto": "https://storage.../carlos.jpg",
    "datosMedicos": {
      "grupoSanguineo": "O",
      "rh": "+",
      "eps": "Nueva EPS"
    },
    "datosAcademicos": {
      "institucion": "IE San José",
      "curso": "5° A",
      "grado": "Quinto",
      "jornada": "Mañana"
    },
    "estadisticas": {
      "totalTareas": 10,
      "tareasCompletadas": 8,
      "promedio": 4.3,
      "escala": "Alto"
    }
  }
}

// Response 403 Forbidden (estudiante no vinculado al acudiente)
{
  "success": false,
  "message": "No tienes permiso para ver este estudiante"
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Verificar que estudiante está vinculado al acudiente autenticado
- [ ] Calcular edad desde fechaNacimiento
- [ ] Calcular estadísticas del período activo
- [ ] Incluir datos médicos (pueden ser null)

---

## 🎯 ÉPICA EP-08: Visualización y Envío de Tareas

### 📋 HU-28: Ver lista de tareas asignadas

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/estudiantes/:id/tareas` | Tareas asignadas al estudiante |

```typescript
// GET /estudiantes/10/tareas?periodo=1
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "data": [
    {
      "id": 100,
      "asignacionId": 50,
      "titulo": "Árbol Genealógico Familiar",
      "descripcionCorta": "Construye tu árbol genealógico...",
      "categoria": "Identidad Familiar",
      "fechaPublicacion": "2026-01-15",
      "fechaVencimiento": "2026-01-25",
      "diasRestantes": 3,
      "frecuencia": "Única",
      "estado": "pendiente",      // pendiente, entregada, calificada, vencida
      "tipoCalificacion": "manual",
      "esUrgente": true           // <= 3 días para vencer
    },
    {
      "id": 101,
      "asignacionId": 51,
      "titulo": "Recetas de la Abuela",
      "descripcionCorta": "Cocina con tu familia una receta...",
      "categoria": "Tradiciones",
      "fechaPublicacion": "2026-01-10",
      "fechaVencimiento": "2026-01-20",
      "diasRestantes": -2,
      "frecuencia": "Mensual",
      "estado": "vencida",
      "tipoCalificacion": "automatica",
      "esUrgente": false
    }
  ],
  "meta": {
    "periodo": { "id": 1, "nombre": "Período 1 - 2026" },
    "total": 10,
    "pendientes": 3,
    "entregadas": 5,
    "calificadas": 2,
    "ultimaSincronizacion": "2026-01-22T10:30:00Z"
  }
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Verificar vinculación acudiente-estudiante
- [ ] Filtrar por período académico activo (o parámetro)
- [ ] Calcular estado de cada tarea (pendiente/entregada/calificada/vencida)
- [ ] Calcular diasRestantes (negativo si vencida)
- [ ] Calcular esUrgente (true si <= 3 días)
- [ ] Ordenar por fecha vencimiento ASC
- [ ] Incluir meta con estadísticas

---

### 🔍 HU-29: Filtrar tareas por estado

> ⚠️ **Implementación 100% en cliente (filtrado local)**  
> El endpoint de HU-28 retorna todas las tareas, el cliente filtra localmente.

---

### 📄 HU-30: Ver detalle completo de tarea

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/asignaciones/:id/detalle` | Detalle de tarea asignada |

```typescript
// GET /asignaciones/50/detalle
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "data": {
    "id": 50,
    "tarea": {
      "id": 100,
      "titulo": "Árbol Genealógico Familiar",
      "descripcion": "Construye junto a tu familia un árbol genealógico que incluya al menos 3 generaciones. Investiga nombres, fechas importantes y anécdotas familiares. Esta actividad fortalece la identidad y el sentido de pertenencia familiar.",
      "categoria": "Identidad Familiar",
      "tipoCalificacion": "manual",
      "archivosAdjuntos": [
        {
          "id": 1,
          "nombre": "plantilla_arbol.pdf",
          "tipo": "application/pdf",
          "tamaño": 245000,
          "url": "https://storage.../plantilla_arbol.pdf"
        }
      ],
      "enlaces": [
        {
          "titulo": "Video: Cómo hacer un árbol genealógico",
          "url": "https://youtube.com/watch?v=xyz"
        }
      ]
    },
    "fechaPublicacion": "2026-01-15",
    "fechaVencimiento": "2026-01-25",
    "diasRestantes": 3,
    "frecuencia": "Única",
    "estado": "pendiente",
    "entrega": null,              // null si no ha entregado
    "calificacion": null          // null si no está calificada
  }
}

// Si ya tiene entrega:
{
  "entrega": {
    "id": 200,
    "descripcion": "Realizamos el árbol con fotos de mis abuelos...",
    "fechaEntrega": "2026-01-20T15:30:00Z",
    "archivos": [
      {
        "id": 5,
        "nombre": "arbol_familia.jpg",
        "tipo": "image/jpeg",
        "url": "https://storage.../arbol_familia.jpg"
      }
    ],
    "puedeEditar": true     // false si vencida o calificada
  }
}

// Si está calificada:
{
  "calificacion": {
    "nota": 4.5,
    "escala": "Alto",
    "notaCualitativa": "Sobresaliente",
    "retroalimentacion": "Excelente trabajo, se nota la participación de toda la familia...",
    "calificadoPor": "Prof. María García",
    "fechaCalificacion": "2026-01-21T10:00:00Z"
  }
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Verificar que estudiante de la asignación está vinculado al acudiente
- [ ] Incluir tarea completa con archivos y enlaces
- [ ] Incluir entrega si existe
- [ ] Incluir calificación si existe
- [ ] Calcular puedeEditar (no vencida AND no calificada)

---

### 📤 HU-31: Enviar evidencia de tarea

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/asignaciones/:id/entregas` | Enviar evidencia |

```typescript
// POST /asignaciones/50/entregas
// Headers: Authorization: Bearer {token}
// Content-Type: multipart/form-data

// Form Data:
// - descripcion: "Realizamos el árbol genealógico en familia..."
// - archivos[]: [file1.jpg, file2.jpg]  // Max 3 archivos, 5MB c/u

// Response 201 Created
{
  "success": true,
  "message": "Evidencia enviada correctamente",
  "data": {
    "id": 200,
    "descripcion": "Realizamos el árbol genealógico en familia...",
    "fechaEntrega": "2026-01-20T15:30:00Z",
    "archivos": [
      {
        "id": 5,
        "nombre": "arbol_familia.jpg",
        "tipo": "image/jpeg",
        "url": "https://storage.../arbol_familia.jpg"
      }
    ],
    "estado": "entregada"
  }
}

// Response 400 Bad Request
{
  "success": false,
  "errors": [
    "Debes agregar una descripción o al menos un archivo",
    "Máximo 3 archivos por entrega",
    "El archivo 'video.mp4' excede el tamaño máximo de 5MB"
  ]
}

// Response 403 Forbidden
{
  "success": false,
  "message": "Esta tarea ya está calificada, no puedes modificarla"
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Verificar vinculación acudiente-estudiante
- [ ] Validar que tarea no esté calificada
- [ ] Validar mínimo: descripción OR al menos 1 archivo
- [ ] Validar máximo 3 archivos
- [ ] Validar tamaño máximo 5MB por archivo
- [ ] Validar tipos permitidos: image/*, video/*, application/pdf
- [ ] Comprimir imágenes si son muy grandes
- [ ] Subir archivos a storage (S3, Cloudinary, etc.)
- [ ] Guardar URLs en BD
- [ ] Actualizar estado de asignación a "entregada"
- [ ] Registrar acudienteId que entregó
- [ ] Enviar notificación al docente

---

### 📶 HU-32: Enviar evidencia sin conexión (modo offline)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/asignaciones/:id/entregas/sync` | Sincronizar entrega offline |

```typescript
// POST /asignaciones/50/entregas/sync
// Headers: Authorization: Bearer {token}
// Content-Type: multipart/form-data

// Form Data:
// - descripcion: "Realizamos el árbol..."
// - archivos[]: [file1.jpg]
// - timestampLocal: "2026-01-20T15:30:00Z"  // Cuando se creó offline

// Response 201 Created
{
  "success": true,
  "message": "Entrega sincronizada correctamente",
  "data": {
    "id": 200,
    "fechaEntrega": "2026-01-20T15:30:00Z",  // Usa timestampLocal
    "sincronizado": true
  }
}
```

**Checklist implementación:**
- [ ] Mismo proceso que HU-31
- [ ] Usar timestampLocal como fechaEntrega (para respetar cuándo se hizo realmente)
- [ ] Validar que timestampLocal no sea futuro
- [ ] Manejar conflictos si ya existe entrega

---

### ✏️ HU-33: Editar entrega antes de la fecha límite

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `PUT` | `/entregas/:id` | Actualizar entrega |

```typescript
// PUT /entregas/200
// Headers: Authorization: Bearer {token}
// Content-Type: multipart/form-data

// Form Data:
// - descripcion: "Actualización: agregamos más fotos..."
// - archivosNuevos[]: [file3.jpg]
// - archivosEliminar[]: [5]  // IDs de archivos a eliminar

// Response 200 OK
{
  "success": true,
  "message": "Entrega actualizada correctamente",
  "data": {
    "id": 200,
    "descripcion": "Actualización: agregamos más fotos...",
    "fechaEntrega": "2026-01-20T15:30:00Z",
    "fechaModificacion": "2026-01-21T10:00:00Z",
    "archivos": [...]
  }
}

// Response 403 Forbidden
{
  "success": false,
  "message": "No puedes editar una entrega calificada"
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Verificar que entrega pertenece a estudiante vinculado
- [ ] Verificar que NO esté calificada
- [ ] Verificar que NO esté vencida (fecha_vencimiento > now)
- [ ] Eliminar archivos marcados en archivosEliminar
- [ ] Agregar archivos nuevos
- [ ] Actualizar fechaModificacion
- [ ] Registrar en auditoría (versión de entrega)

---

### 💾 HU-34: Ver tareas en modo offline

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/estudiantes/:id/tareas/sync` | Datos para caché offline |

```typescript
// GET /estudiantes/10/tareas/sync?ultimaSync=2026-01-20T10:00:00Z
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "data": {
    "tareasActualizadas": [...],   // Tareas nuevas o modificadas
    "tareasEliminadas": [101, 102], // IDs de tareas que ya no aplican
    "entregasActualizadas": [...],
    "calificacionesNuevas": [...],
    "timestamp": "2026-01-22T10:30:00Z"
  }
}
```

**Checklist implementación:**
- [ ] Parámetro ultimaSync para sincronización delta
- [ ] Solo retornar cambios desde ultimaSync
- [ ] Incluir tareas del período activo
- [ ] Incluir IDs de tareas eliminadas/canceladas

---

## 🎯 ÉPICA EP-09: Calificaciones y Retroalimentación

### 📊 HU-35: Ver calificación de una tarea

> ⚠️ **Ya incluido en HU-30** (endpoint `/asignaciones/:id/detalle`)  
> El detalle de la tarea incluye el objeto `calificacion` si existe.

---

### 📚 HU-36: Ver historial de entregas por período

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/estudiantes/:id/historial` | Historial de entregas |

```typescript
// GET /estudiantes/10/historial?periodo=1
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "data": {
    "periodo": {
      "id": 1,
      "nombre": "Período 1 - 2026",
      "fechaInicio": "2026-01-15",
      "fechaFin": "2026-04-15"
    },
    "entregas": [
      {
        "id": 200,
        "tarea": {
          "id": 100,
          "titulo": "Árbol Genealógico",
          "categoria": "Identidad Familiar"
        },
        "fechaEntrega": "2026-01-20T15:30:00Z",
        "estado": "calificada",
        "miniatura": "https://storage.../thumb_arbol.jpg",
        "calificacion": {
          "nota": 4.5,
          "escala": "Alto"
        }
      }
    ],
    "estadisticas": {
      "totalTareas": 10,
      "tareasCompletadas": 8,
      "porcentajeCumplimiento": 80,
      "promedio": 4.3,
      "escala": "Alto"
    }
  }
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Verificar vinculación acudiente-estudiante
- [ ] Filtrar por período (parámetro obligatorio)
- [ ] Incluir miniatura del primer archivo si existe
- [ ] Calcular estadísticas del período
- [ ] Ordenar por fecha de entrega DESC

---

### 📈 HU-37: Ver estadísticas de desempeño

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/estudiantes/:id/estadisticas` | Estadísticas por período |

```typescript
// GET /estudiantes/10/estadisticas?periodo=1
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "data": {
    "periodo": {
      "id": 1,
      "nombre": "Período 1 - 2026"
    },
    "totalTareas": 10,
    "tareasCompletadas": 8,
    "tareasPendientes": 1,
    "tareasVencidas": 1,
    "porcentajeCumplimiento": 80,
    "promedio": 4.3,
    "escala": "Alto",
    "distribucionNotas": {
      "alto": 6,     // 4.0-5.0
      "medio": 2,    // 3.0-3.9
      "bajo": 0      // 1.0-2.9
    }
  }
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Calcular todas las métricas del período
- [ ] Calcular distribución de notas

---

## 🎯 ÉPICA EP-10: Notificaciones Push y Soporte

### 🔔 HU-38: Recibir notificaciones push

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/notificaciones/token` | Registrar FCM token |
| `GET` | `/notificaciones` | Listar notificaciones |

```typescript
// POST /notificaciones/token
// Headers: Authorization: Bearer {token}
// Request
{
  "fcmToken": "dG9rZW5fZmNtX2FxdWkuLi4=",
  "dispositivo": "Samsung Galaxy A52",
  "sistemaOperativo": "Android 12"
}

// Response 200 OK
{
  "success": true,
  "message": "Token registrado correctamente"
}
```

```typescript
// GET /notificaciones?page=1&limit=20
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "data": [
    {
      "id": 500,
      "tipo": "nueva_tarea",
      "titulo": "🆕 Nueva tarea asignada",
      "mensaje": "Árbol Genealógico Familiar - Vence el 25 de enero",
      "datos": {
        "asignacionId": 50,
        "estudianteId": 10
      },
      "leida": false,
      "creadaEn": "2026-01-15T08:00:00Z"
    },
    {
      "id": 501,
      "tipo": "calificacion",
      "titulo": "📝 Tarea calificada",
      "mensaje": "Recetas de la Abuela - Nota: 4.5 (Alto)",
      "datos": {
        "entregaId": 199,
        "estudianteId": 10
      },
      "leida": true,
      "leidaEn": "2026-01-20T10:00:00Z",
      "creadaEn": "2026-01-19T14:00:00Z"
    }
  ],
  "meta": {
    "total": 15,
    "noLeidas": 3,
    "page": 1,
    "limit": 20
  }
}
```

**Tipos de notificación a implementar:**
- `nueva_tarea`: Cuando se asigna una tarea nueva
- `calificacion`: Cuando una entrega es calificada
- `recordatorio`: 3 días antes del vencimiento
- `vencida`: Cuando una tarea vence sin entregar

---

### 📬 HU-39: Gestionar centro de notificaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `PUT` | `/notificaciones/:id/leer` | Marcar como leída |
| `PUT` | `/notificaciones/leer-todas` | Marcar todas como leídas |

```typescript
// PUT /notificaciones/500/leer
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true
}
```

```typescript
// PUT /notificaciones/leer-todas
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "message": "15 notificaciones marcadas como leídas"
}
```

**Checklist implementación:**
- [ ] Middleware auth obligatorio
- [ ] Actualizar leidaEn = now()
- [ ] Actualizar leida = true

---

### ⚙️ HU-40: Configurar preferencias de notificaciones

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/usuarios/preferencias` | Obtener preferencias |
| `PUT` | `/usuarios/preferencias` | Actualizar preferencias |

```typescript
// GET /usuarios/preferencias
// Headers: Authorization: Bearer {token}

// Response 200 OK
{
  "success": true,
  "data": {
    "notificaciones": {
      "nuevasTareas": true,
      "calificaciones": true,
      "recordatorios": true
    }
  }
}
```

```typescript
// PUT /usuarios/preferencias
// Headers: Authorization: Bearer {token}
// Request
{
  "notificaciones": {
    "nuevasTareas": true,
    "calificaciones": true,
    "recordatorios": false
  }
}

// Response 200 OK
{
  "success": true,
  "message": "Preferencias actualizadas"
}
```

---

### ❓ HU-41 y HU-42: FAQs y Soporte

> ⚠️ **Implementación mayormente en cliente**
> - FAQs: Archivo JSON local en la app
> - Soporte: Intent de email/WhatsApp con datos predefinidos

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/soporte/info` | Información de contacto |

```typescript
// GET /soporte/info (público)

// Response 200 OK
{
  "success": true,
  "data": {
    "email": "parchandojuntos2025@gmail.com",
    "whatsapp": "+573107392818",
    "horarioAtencion": "Lunes a Viernes 8:00 - 17:00"
  }
}
```

---

## 📋 RESUMEN DE ENDPOINTS

### Autenticación (EP-07)
| # | Método | Endpoint | HU |
|---|--------|----------|-----|
| 1 | `POST` | `/auth/login/movil` | HU-22 |
| 2 | `POST` | `/auth/cambiar-password` | HU-24 |
| 3 | `POST` | `/auth/recuperar/solicitar` | HU-25 |
| 4 | `POST` | `/auth/recuperar/verificar` | HU-25 |
| 5 | `POST` | `/auth/recuperar/restablecer` | HU-25 |
| 6 | `GET` | `/acudientes/mis-estudiantes` | HU-26 |
| 7 | `GET` | `/estudiantes/:id/perfil` | HU-27 |

### Tareas y Entregas (EP-08)
| # | Método | Endpoint | HU |
|---|--------|----------|-----|
| 8 | `GET` | `/estudiantes/:id/tareas` | HU-28 |
| 9 | `GET` | `/asignaciones/:id/detalle` | HU-30 |
| 10 | `POST` | `/asignaciones/:id/entregas` | HU-31 |
| 11 | `POST` | `/asignaciones/:id/entregas/sync` | HU-32 |
| 12 | `PUT` | `/entregas/:id` | HU-33 |
| 13 | `GET` | `/estudiantes/:id/tareas/sync` | HU-34 |

### Calificaciones (EP-09)
| # | Método | Endpoint | HU |
|---|--------|----------|-----|
| 14 | `GET` | `/estudiantes/:id/historial` | HU-36 |
| 15 | `GET` | `/estudiantes/:id/estadisticas` | HU-37 |

### Notificaciones (EP-10)
| # | Método | Endpoint | HU |
|---|--------|----------|-----|
| 16 | `POST` | `/notificaciones/token` | HU-38 |
| 17 | `GET` | `/notificaciones` | HU-38 |
| 18 | `PUT` | `/notificaciones/:id/leer` | HU-39 |
| 19 | `PUT` | `/notificaciones/leer-todas` | HU-39 |
| 20 | `GET` | `/usuarios/preferencias` | HU-40 |
| 21 | `PUT` | `/usuarios/preferencias` | HU-40 |
| 22 | `GET` | `/soporte/info` | HU-42 |

---

## ✅ CHECKLIST DE VERIFICACIÓN POR ENDPOINT

### Criterios Globales
- [ ] Todos los endpoints (excepto login y soporte/info) requieren `Authorization: Bearer {token}`
- [ ] Todos los endpoints verifican que el acudiente solo accede a SUS estudiantes vinculados
- [ ] Respuestas consistentes: `{ success, data, message, errors }`
- [ ] Códigos HTTP correctos: 200, 201, 400, 401, 403, 404, 500
- [ ] Manejo de errores con mensajes claros en español
- [ ] Paginación en listados largos
- [ ] Compresión GZIP en respuestas
- [ ] Límite de tamaño en uploads (5MB)
- [ ] Validación de tipos MIME en archivos

---

## 📊 ESTADO DE IMPLEMENTACIÓN

| Endpoint | Estado | Notas |
|----------|--------|-------|
| `/auth/login/movil` | ⬜ Pendiente | |
| `/auth/cambiar-password` | ⬜ Pendiente | |
| `/auth/recuperar/*` | ⬜ Pendiente | Requiere SMS/Email |
| `/acudientes/mis-estudiantes` | ⬜ Pendiente | |
| `/estudiantes/:id/perfil` | ⬜ Pendiente | |
| `/estudiantes/:id/tareas` | ⬜ Pendiente | |
| `/asignaciones/:id/detalle` | ⬜ Pendiente | |
| `/asignaciones/:id/entregas` | ⬜ Pendiente | Requiere Storage |
| `/entregas/:id` | ⬜ Pendiente | |
| `/estudiantes/:id/historial` | ⬜ Pendiente | |
| `/notificaciones/*` | ⬜ Pendiente | Requiere FCM |

**Leyenda:**
- ⬜ Pendiente
- 🟡 En progreso
- ✅ Completado
- 🔴 Bloqueado

---

## 🔗 DOCUMENTOS RELACIONADOS

- [Tareas Críticas Backend](./BACKEND_TAREAS_CRITICAS.md)
- [Historias de Usuario](./docs/requerimientos/04_historias_usuario.md)
- [Schema Base de Datos](./DB_SCHEMA_CATEDRA_FAMILIA.sql)

---

**Última actualización**: 22 de enero de 2026  
**Mantenido por**: Equipo Backend  
**Estado**: 📱 Definición de API
