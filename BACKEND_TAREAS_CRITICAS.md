# 🔴 BACKEND - TAREAS CRÍTICAS PENDIENTES

> **Fecha de creación**: 21 de enero de 2026  
> **Proyecto**: PARCHANDO JUNTOS - Cátedra de Familia  
> **Framework**: AdonisJS 6 + TypeScript + PostgreSQL  
> **⚠️ IMPORTANTE**: Este documento solo incluye implementaciones de servicios/controladores. **NO se modificará el esquema de base de datos**.

---

## 📋 RESUMEN EJECUTIVO

Este documento enumera las 5 características críticas faltantes en el backend que bloquean la implementación completa del frontend. Todas las tareas se pueden completar **sin modificar migraciones** ya que las tablas necesarias ya existen.

**Estado actual**: ~50 endpoints implementados, 23 modelos, 16 controladores  
**Bloqueadores críticos identificados**: 5 funcionalidades core sin implementar

---

## 🎯 PRIORIDAD 1 - BLOQUEADORES CRÍTICOS (Sprint Actual)

### 🔐 1. ENDPOINTS DE GESTIÓN ADMIN_SISTEMA

**HU Bloqueadas**: HU-01, HU-02, HU-03, HU-04  
**Impacto**: Frontend no puede implementar panel de administración institucional

#### ✅ Checklist de Implementación

- [ ] **Crear controlador `AdminInstitutionsController`**
  - Ubicación: `app/controllers/admin_institutions_controller.ts`
  - Responsabilidad: Gestión de instituciones, rectores y coordinadores

- [ ] **Implementar autenticación admin_sistema**
  ```typescript
  // POST /admin/login
  - [ ] Validar credenciales de admin_sistema (email + password)
  - [ ] Verificar que role_id === 'admin_sistema'
  - [ ] Generar JWT token con expiración 7 días
  - [ ] Retornar token + perfil del admin
  ```

- [ ] **Implementar registro de rectores**
  ```typescript
  // POST /admin/rectores
  - [ ] Validar que usuario autenticado sea admin_sistema (middleware auth)
  - [ ] Validar campos requeridos: email, password, firstName, lastName, institution_id
  - [ ] Verificar formato password (8+ chars, 1 mayúscula, 1 número, 1 especial)
  - [ ] Asignar role_id = 'rector' (debe existir en tabla roles)
  - [ ] Crear registro en tabla users con hashedPassword
  - [ ] Marcar must_change_password = true
  - [ ] Retornar rector creado (sin password)
  ```

- [ ] **Implementar registro de coordinadores**
  ```typescript
  // POST /admin/coordinadores
  - [ ] Validar que usuario autenticado sea admin_sistema (middleware auth)
  - [ ] Validar campos requeridos: email, password, firstName, lastName, institution_id
  - [ ] Verificar formato password (8+ chars, 1 mayúscula, 1 número, 1 especial)
  - [ ] Asignar role_id = 'coordinador' (debe existir en tabla roles)
  - [ ] Crear registro en tabla users con hashedPassword
  - [ ] Marcar must_change_password = true
  - [ ] Retornar coordinador creado (sin password)
  ```

- [ ] **Implementar listado de instituciones para aprobación**
  ```typescript
  // GET /admin/instituciones/pendientes
  - [ ] Filtrar instituciones con is_approved = false
  - [ ] Incluir relación con rector (eager load)
  - [ ] Ordenar por fecha de creación (desc)
  - [ ] Retornar lista con datos de institución + rector
  ```

- [ ] **Implementar aprobación de instituciones**
  ```typescript
  // PUT /admin/instituciones/:id/aprobar
  - [ ] Validar que institución existe
  - [ ] Actualizar is_approved = true
  - [ ] Actualizar approved_at = new Date()
  - [ ] Retornar institución actualizada
  ```

- [ ] **Agregar rutas al archivo de rutas**
  ```typescript
  // start/routes.ts
  - [ ] Agregar grupo /admin con middleware auth + adminSistema
  - [ ] POST /admin/login (sin middleware)
  - [ ] POST /admin/rectores (con middleware)
  - [ ] POST /admin/coordinadores (con middleware)
  - [ ] GET /admin/instituciones/pendientes (con middleware)
  - [ ] PUT /admin/instituciones/:id/aprobar (con middleware)
  ```

- [ ] **Crear middleware de verificación admin_sistema**
  ```typescript
  // app/middleware/admin_sistema_middleware.ts
  - [ ] Verificar que auth.user existe
  - [ ] Verificar que auth.user.roleId === 'admin_sistema'
  - [ ] Si no es admin, retornar 403 Forbidden
  ```

**Archivos a crear/modificar**:
- ✏️ `app/controllers/admin_institutions_controller.ts` (crear)
- ✏️ `app/middleware/admin_sistema_middleware.ts` (crear)
- ✏️ `start/routes.ts` (modificar - agregar rutas /admin/*)
- ✏️ `app/validators/admin_rector_validator.ts` (crear)
- ✏️ `app/validators/admin_coordinador_validator.ts` (crear)

**Dependencias**:
- ✅ Tabla `users` (existe)
- ✅ Tabla `institutions` (existe)
- ⚠️ **REQUERIDO**: Seed de rol `admin_sistema` en tabla `roles` (ver sección Prioridad 2)

---

### 📊 2. CARGA MASIVA DE ESTUDIANTES POR EXCEL

**HU Bloqueadas**: HU-14  
**Impacto**: Rectores/Coordinadores no pueden cargar listas de estudiantes de forma eficiente

#### ✅ Checklist de Implementación

- [ ] **Instalar dependencia xlsx**
  ```bash
  npm install xlsx
  npm install -D @types/node
  ```

- [ ] **Crear servicio de procesamiento Excel**
  ```typescript
  // app/services/excel_upload_service.ts
  - [ ] Método parseExcelFile(buffer: Buffer) que retorne array de estudiantes
  - [ ] Validar columnas requeridas: nombre, apellido, documento, fecha_nacimiento, correo
  - [ ] Validar formatos: email válido, fecha válida, documento único
  - [ ] Detectar duplicados dentro del archivo
  - [ ] Retornar { validRows, invalidRows, errors }
  ```

- [ ] **Crear endpoint de descarga de plantilla**
  ```typescript
  // GET /estudiantes/plantilla-excel
  - [ ] Generar archivo Excel con columnas: nombre, apellido, documento, fecha_nacimiento, correo
  - [ ] Incluir fila de ejemplo
  - [ ] Configurar headers para descarga
  - [ ] Retornar archivo .xlsx con nombre "plantilla_estudiantes.xlsx"
  ```

- [ ] **Crear endpoint de validación previa**
  ```typescript
  // POST /estudiantes/validar-excel
  - [ ] Recibir archivo Excel (multipart/form-data)
  - [ ] Parsear Excel usando servicio
  - [ ] Validar estructura y datos
  - [ ] NO insertar en BD todavía
  - [ ] Retornar preview: { totalRows, validRows, invalidRows, errors }
  ```

- [ ] **Crear endpoint de carga masiva**
  ```typescript
  // POST /estudiantes/carga-masiva
  - [ ] Recibir archivo Excel + institution_id + course_id
  - [ ] Validar que usuario tiene permiso (rector/coordinador de la institución)
  - [ ] Parsear Excel usando servicio
  - [ ] Iniciar transacción de BD
  - [ ] Insertar estudiantes válidos en tabla students
  - [ ] Relacionar con curso (course_students)
  - [ ] Si hay error, hacer rollback completo
  - [ ] Retornar resumen: { insertados, rechazados, errores }
  ```

- [ ] **Actualizar controlador de estudiantes**
  ```typescript
  // app/controllers/students_controller.ts
  - [ ] Agregar método downloadTemplate()
  - [ ] Agregar método validateExcel()
  - [ ] Agregar método bulkUpload()
  ```

- [ ] **Agregar rutas al archivo de rutas**
  ```typescript
  // start/routes.ts
  - [ ] GET /estudiantes/plantilla-excel (rector, coordinador)
  - [ ] POST /estudiantes/validar-excel (rector, coordinador)
  - [ ] POST /estudiantes/carga-masiva (rector, coordinador)
  ```

- [ ] **Configurar límite de tamaño de archivo**
  ```typescript
  // config/bodyparser.ts
  - [ ] Configurar multipart.maxSize = 10mb
  - [ ] Configurar multipart.types = ['xlsx', 'xls']
  ```

**Archivos a crear/modificar**:
- ✏️ `app/services/excel_upload_service.ts` (crear)
- ✏️ `app/controllers/students_controller.ts` (modificar - agregar 3 métodos)
- ✏️ `start/routes.ts` (modificar - agregar 3 rutas)
- ✏️ `config/bodyparser.ts` (modificar - configurar multipart)
- ✏️ `app/validators/bulk_upload_validator.ts` (crear)

**Dependencias**:
- ✅ Tabla `students` (existe)
- ✅ Tabla `course_students` (existe)
- ✅ Modelo `Student` (existe)
- 📦 Paquete npm `xlsx` (instalar)

---

### 🔑 3. CAMBIO OBLIGATORIO DE CONTRASEÑA AL PRIMER LOGIN

**HU Bloqueadas**: HU-06 (afecta todos los roles)  
**Impacto**: Sistema no cumple requisitos de seguridad MinTIC

#### ✅ Checklist de Implementación

- [ ] **Verificar campo must_change_password en modelo User**
  ```typescript
  // app/models/user.ts
  - [ ] Confirmar que existe @column() mustChangePassword: boolean
  - [ ] Si no existe, agregarlo (default: false)
  ```

- [ ] **Modificar respuesta de login para incluir flag**
  ```typescript
  // app/controllers/auth_controller.ts - método login()
  - [ ] Después de generar token JWT
  - [ ] Incluir en respuesta: { token, user: { ...userData, mustChangePassword } }
  - [ ] Frontend detectará flag y redirigirá a cambio de contraseña
  ```

- [ ] **Crear endpoint de cambio de contraseña**
  ```typescript
  // POST /usuarios/cambiar-password
  - [ ] Middleware auth (usuario debe estar autenticado)
  - [ ] Recibir: currentPassword, newPassword, confirmPassword
  - [ ] Validar que currentPassword es correcto
  - [ ] Validar que newPassword cumple requisitos de seguridad
  - [ ] Validar que newPassword !== currentPassword
  - [ ] Validar que newPassword === confirmPassword
  - [ ] Hashear nueva contraseña
  - [ ] Actualizar user.password = hashedPassword
  - [ ] Actualizar user.mustChangePassword = false
  - [ ] Retornar success message
  ```

- [ ] **Crear middleware de verificación de cambio obligatorio**
  ```typescript
  // app/middleware/require_password_change_middleware.ts
  - [ ] Verificar que auth.user existe
  - [ ] Si auth.user.mustChangePassword === true
  - [ ] Permitir solo acceso a /usuarios/cambiar-password y /logout
  - [ ] Bloquear todas las demás rutas con 403 + mensaje explicativo
  ```

- [ ] **Aplicar middleware a rutas protegidas**
  ```typescript
  // start/routes.ts
  - [ ] Agregar middleware requirePasswordChange a todas las rutas protegidas
  - [ ] EXCEPTO /usuarios/cambiar-password y /logout
  ```

- [ ] **Crear validador de contraseña segura**
  ```typescript
  // app/validators/password_change_validator.ts
  - [ ] Validar longitud mínima 8 caracteres
  - [ ] Validar al menos 1 mayúscula
  - [ ] Validar al menos 1 número
  - [ ] Validar al menos 1 carácter especial (!@#$%^&*)
  - [ ] Mensajes de error claros en español
  ```

- [ ] **Actualizar seeds para marcar usuarios con cambio obligatorio**
  ```typescript
  // database/seeders/user_seeder.ts
  - [ ] Al crear rectores/coordinadores vía admin
  - [ ] Establecer mustChangePassword = true
  - [ ] Admin_sistema puede tener mustChangePassword = false (opcional)
  ```

**Archivos a crear/modificar**:
- ✏️ `app/models/user.ts` (verificar/agregar campo mustChangePassword)
- ✏️ `app/controllers/auth_controller.ts` (modificar login() para incluir flag)
- ✏️ `app/controllers/users_controller.ts` (agregar método changePassword())
- ✏️ `app/middleware/require_password_change_middleware.ts` (crear)
- ✏️ `start/routes.ts` (agregar ruta POST /usuarios/cambiar-password y middleware)
- ✏️ `app/validators/password_change_validator.ts` (crear)

**Dependencias**:
- ✅ Tabla `users` (existe)
- ✅ Modelo `User` (existe)
- ⚠️ Campo `must_change_password` en tabla users (verificar si existe)

---

### 👥 4. ENDPOINTS DE GESTIÓN RECTOR/COORDINADOR

**HU Bloqueadas**: HU-09, HU-10  
**Impacto**: Rectores/Coordinadores no pueden crear orientadores ni docentes, bloqueando funcionamiento académico

#### ✅ Checklist de Implementación

- [ ] **Crear controlador `InstitutionStaffController`**
  - Ubicación: `app/controllers/institution_staff_controller.ts`
  - Responsabilidad: Gestión de orientadores y docentes por rector/coordinador

- [ ] **Implementar registro de orientadores**
  ```typescript
  // POST /instituciones/:id/orientadores
  - [ ] Middleware auth (rector o coordinador autenticado)
  - [ ] Validar que usuario pertenece a la institución
  - [ ] Validar campos: email, password, firstName, lastName, phone, address
  - [ ] Verificar formato password seguro
  - [ ] Asignar role_id = 'orientador'
  - [ ] Crear en tabla users con institutionId
  - [ ] Marcar must_change_password = true
  - [ ] Retornar orientador creado (sin password)
  ```

- [ ] **Implementar registro de docentes**
  ```typescript
  // POST /instituciones/:id/docentes
  - [ ] Middleware auth (rector o coordinador autenticado)
  - [ ] Validar que usuario pertenece a la institución
  - [ ] Validar campos: email, password, firstName, lastName, phone
  - [ ] Validar campo opcional: courseIds (array de IDs de cursos)
  - [ ] Verificar formato password seguro
  - [ ] Asignar role_id = 'docente'
  - [ ] Crear en tabla users con institutionId
  - [ ] Si hay courseIds, crear relaciones en teacher_courses
  - [ ] Marcar must_change_password = true
  - [ ] Retornar docente creado con cursos asignados
  ```

- [ ] **Implementar asignación de cursos a docente**
  ```typescript
  // POST /docentes/:id/cursos
  - [ ] Middleware auth (rector o coordinador)
  - [ ] Validar que docente pertenece a la institución del usuario
  - [ ] Recibir: courseIds (array), isDirector (boolean por curso)
  - [ ] Validar que cursos existan y pertenezcan a la institución
  - [ ] Verificar restricción: un director por curso
  - [ ] Crear/actualizar relaciones en teacher_courses
  - [ ] Retornar docente con cursos actualizados
  ```

- [ ] **Implementar listado de orientadores**
  ```typescript
  // GET /instituciones/:id/orientadores
  - [ ] Middleware auth (rector, coordinador, orientador)
  - [ ] Validar que usuario pertenece a la institución
  - [ ] Filtrar users donde roleId = 'orientador' AND institutionId = :id
  - [ ] Retornar lista con datos básicos (sin passwords)
  ```

- [ ] **Implementar listado de docentes con cursos**
  ```typescript
  // GET /instituciones/:id/docentes
  - [ ] Middleware auth (rector, coordinador, orientador)
  - [ ] Validar que usuario pertenece a la institución
  - [ ] Filtrar users donde roleId = 'docente' AND institutionId = :id
  - [ ] Incluir relación con cursos asignados (eager load)
  - [ ] Indicar si es director de curso
  - [ ] Retornar lista con cursos por docente
  ```

- [ ] **Implementar eliminación de asignación de curso**
  ```typescript
  // DELETE /docentes/:id/cursos/:courseId
  - [ ] Middleware auth (rector, coordinador)
  - [ ] Validar que docente pertenece a la institución
  - [ ] Eliminar relación en teacher_courses
  - [ ] Si era director, actualizar isDirector = false
  - [ ] Retornar confirmación
  ```

- [ ] **Crear middleware de verificación institucional**
  ```typescript
  // app/middleware/institution_access_middleware.ts
  - [ ] Verificar que auth.user existe
  - [ ] Verificar que institutionId del recurso = auth.user.institutionId
  - [ ] Si no coincide, retornar 403 Forbidden
  - [ ] Permite admin_sistema acceder a todas las instituciones
  ```

- [ ] **Agregar rutas al archivo de rutas**
  ```typescript
  // start/routes.ts
  - [ ] POST /instituciones/:id/orientadores (rector, coordinador)
  - [ ] POST /instituciones/:id/docentes (rector, coordinador)
  - [ ] GET /instituciones/:id/orientadores (rector, coordinador, orientador)
  - [ ] GET /instituciones/:id/docentes (rector, coordinador, orientador)
  - [ ] POST /docentes/:id/cursos (rector, coordinador)
  - [ ] DELETE /docentes/:id/cursos/:courseId (rector, coordinador)
  ```

**Archivos a crear/modificar**:
- ✏️ `app/controllers/institution_staff_controller.ts` (crear)
- ✏️ `app/middleware/institution_access_middleware.ts` (crear)
- ✏️ `start/routes.ts` (modificar - agregar rutas /instituciones/:id/*)
- ✏️ `app/validators/orientador_validator.ts` (crear)
- ✏️ `app/validators/docente_validator.ts` (crear)
- ✏️ `app/validators/course_assignment_validator.ts` (crear)

**Dependencias**:
- ✅ Tabla `users` (existe)
- ✅ Tabla `institutions` (existe)
- ✅ Tabla `courses` (existe)
- ✅ Tabla `teacher_courses` o relación similar (verificar)
- ⚠️ **REQUERIDO**: Roles 'orientador' y 'docente' en tabla `roles` (ver sección Prioridad 2)

---

## 🎯 PRIORIDAD 2 - IMPORTANTES (Sprint Siguiente)

### 🗂️ 4. SEED COMPLETO DE ROLES

**HU Afectadas**: Todas (sistema depende de roles correctos)  
**Impacto**: No se pueden crear usuarios con roles rector, coordinador, admin_sistema

#### ✅ Checklist de Implementación

- [ ] **Verificar roles existentes en BD**
  ```sql
  SELECT * FROM roles;
  -- Verificar cuáles de estos 6 roles existen:
  -- admin_sistema, rector, coordinador, orientador, docente, acudiente
  ```

- [ ] **Crear/actualizar seeder de roles**
  ```typescript
  // database/seeders/role_seeder.ts
  - [ ] Crear array con los 6 roles requeridos
  - [ ] Para cada rol: { id, name, description }
  - [ ] Usar updateOrCreate para evitar duplicados
  - [ ] Roles a crear:
    - admin_sistema: "Administrador del sistema (Secretaría de Educación)"
    - rector: "Rector de institución educativa"
    - coordinador: "Coordinador académico"
    - orientador: "Orientador escolar"
    - docente: "Docente"
    - acudiente: "Acudiente/Padre de familia"
  ```

- [ ] **Ejecutar seeder en desarrollo**
  ```bash
  node ace db:seed --files=database/seeders/role_seeder.ts
  ```

- [ ] **Verificar que roles se crearon correctamente**
  ```sql
  SELECT * FROM roles ORDER BY id;
  -- Debe retornar 6 filas
  ```

- [ ] **Actualizar documentación de despliegue**
  ```markdown
  // README.md o DEPLOY.md
  - [ ] Agregar paso: "Ejecutar seeder de roles antes de crear usuarios"
  - [ ] Comando: npm run db:seed role_seeder
  ```

**Archivos a crear/modificar**:
- ✏️ `database/seeders/role_seeder.ts` (crear o actualizar)
- ✏️ `README.md` o `DEPLOY.md` (agregar instrucciones de seeding)

**Dependencias**:
- ✅ Tabla `roles` (existe)
- ✅ Modelo `Role` (existe)

---

### 🔔 5. ENVÍO REAL DE NOTIFICACIONES PUSH FCM

**HU Afectadas**: HU-25, HU-26, HU-27, HU-28  
**Impacto**: Usuarios no reciben notificaciones en tiempo real de eventos importantes

#### ✅ Checklist de Implementación

- [ ] **Instalar Firebase Admin SDK**
  ```bash
  npm install firebase-admin
  ```

- [ ] **Configurar Firebase en el proyecto**
  ```typescript
  // config/firebase.ts
  - [ ] Crear configuración de Firebase Admin
  - [ ] Leer credenciales desde variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY
  - [ ] Inicializar app de Firebase
  - [ ] Exportar instancia de messaging
  ```

- [ ] **Crear servicio de notificaciones**
  ```typescript
  // app/services/notification_service.ts
  - [ ] Método sendToUser(userId, title, body, data)
    - Buscar fcm_token del usuario en tabla users
    - Si no tiene token, retornar sin enviar
    - Usar Firebase messaging.send() con token
    - Manejar tokens inválidos (actualizar/eliminar)
  
  - [ ] Método sendToMultipleUsers(userIds, title, body, data)
    - Buscar fcm_tokens de múltiples usuarios
    - Usar Firebase messaging.sendMulticast() para envío batch
    - Manejar tokens inválidos
  
  - [ ] Método sendTopicNotification(topic, title, body, data)
    - Enviar a topic específico (ej: "rector_alerts")
    - Usar Firebase messaging.send() con topic
  ```

- [ ] **Integrar envío en eventos existentes**
  ```typescript
  // app/controllers/asignaciones_controller.ts
  - [ ] Al crear asignación nueva (método store())
  - [ ] Obtener estudiantes del curso
  - [ ] Llamar notificationService.sendToMultipleUsers()
  - [ ] Payload: { title: "Nueva tarea", body: asignacion.title, taskId }
  
  // app/controllers/calificaciones_controller.ts
  - [ ] Al crear calificación (método store())
  - [ ] Obtener estudiante de la entrega
  - [ ] Llamar notificationService.sendToUser()
  - [ ] Payload: { title: "Calificación publicada", body: nota, taskId }
  
  // app/controllers/admin_institutions_controller.ts (crear en P1)
  - [ ] Al aprobar institución (método approve())
  - [ ] Obtener rector de la institución
  - [ ] Llamar notificationService.sendToUser()
  - [ ] Payload: { title: "Institución aprobada", body: institutionName }
  ```

- [ ] **Mantener endpoint de registro de token (ya existe)**
  ```typescript
  // POST /notificaciones/token
  - [ ] ✅ Ya existe en el backend actual
  - [ ] Verificar que actualiza correctamente users.fcm_token
  ```

- [ ] **Crear endpoint de prueba de notificación**
  ```typescript
  // POST /notificaciones/test (solo en desarrollo)
  - [ ] Recibir userId y mensaje de prueba
  - [ ] Enviar notificación de prueba usando servicio
  - [ ] Retornar resultado (éxito/error)
  ```

- [ ] **Manejar errores de tokens inválidos**
  ```typescript
  // app/services/notification_service.ts
  - [ ] Capturar error "messaging/invalid-registration-token"
  - [ ] Actualizar user.fcm_token = null en BD
  - [ ] Registrar en logs para debugging
  ```

**Archivos a crear/modificar**:
- ✏️ `config/firebase.ts` (crear)
- ✏️ `app/services/notification_service.ts` (crear)
- ✏️ `app/controllers/asignaciones_controller.ts` (modificar método store())
- ✏️ `app/controllers/calificaciones_controller.ts` (modificar método store())
- ✏️ `app/controllers/admin_institutions_controller.ts` (modificar método approve() cuando se cree en P1)
- ✏️ `.env` (agregar FIREBASE_SERVICE_ACCOUNT_KEY)
- ✏️ `.env.example` (documentar variable FIREBASE_SERVICE_ACCOUNT_KEY)

**Dependencias**:
- ✅ Tabla `users` con campo `fcm_token` (existe)
- ✅ Endpoint POST /notificaciones/token (existe)
- 📦 Paquete npm `firebase-admin` (instalar)
- 🔑 Service Account Key de Firebase (obtener de Firebase Console)

---

## 📦 RESUMEN DE DEPENDENCIAS EXTERNAS

### Paquetes NPM a Instalar

```bash
# Para carga masiva de Excel
npm install xlsx
npm install -D @types/node

# Para notificaciones push
npm install firebase-admin
```

### Variables de Entorno a Configurar

```env
# .env (agregar estas líneas)

# Firebase Admin SDK para notificaciones push
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
# O alternativamente usar archivo:
# FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
```

### Servicios Externos Requeridos

- **Firebase Cloud Messaging (FCM)**: 
  - Crear proyecto en Firebase Console
  - Habilitar Cloud Messaging
  - Descargar Service Account Key (JSON)
  - Configurar en variable de entorno

---

## ✅ CRITERIOS DE ACEPTACIÓN GLOBALES

Antes de marcar cualquier tarea como completada, verificar:

- [ ] **Código compilado sin errores de TypeScript**
- [ ] **Rutas agregadas correctamente en `start/routes.ts`**
- [ ] **Middlewares aplicados correctamente (auth, role checks)**
- [ ] **Validadores creados con mensajes en español**
- [ ] **Manejo de errores con try-catch y mensajes descriptivos**
- [ ] **Respuestas JSON consistentes con estructura: `{ success, data, message, errors }`**
- [ ] **Códigos HTTP correctos (200, 201, 400, 401, 403, 404, 500)**
- [ ] **Transacciones de BD para operaciones críticas (carga masiva)**
- [ ] **Logs de errores usando Logger de AdonisJS**
- [ ] **Probado en Postman/Insomnia con casos exitosos y de error**
- [ ] **Documentación de endpoint actualizada (si existe)**

---

## 🚀 PLAN DE IMPLEMENTACIÓN SUGERIDO

### Sprint 1 (Semana 1-2): Bloqueadores Críticos P1

**Día 1-3**: Gestión Admin Sistema
- Implementar AdminInstitutionsController completo
- Crear middleware admin_sistema
- Agregar rutas y validadores
- Probar flujo completo: login admin → crear rector → crear coordinador

**Día 4-6**: Carga Masiva Excel
- Instalar xlsx y crear servicio de parsing
- Implementar 3 endpoints (plantilla, validar, cargar)
- Probar con archivo Excel de 50+ estudiantes
- Verificar transacciones y rollback

**Día 7-8**: Cambio Obligatorio de Contraseña
- Modificar login para incluir flag mustChangePassword
- Crear endpoint /usuarios/cambiar-password
- Implementar middleware de verificación
- Probar flujo completo con nuevo rector

**Día 9-11**: Gestión Rector/Coordinador (Orientadores y Docentes)
- Implementar InstitutionStaffController
- Crear middleware institution_access
- Endpoints para orientadores y docentes
- Asignación de cursos a docentes
- Probar flujo: rector crea orientador → rector crea docente → asigna cursos

**Día 12**: Testing y Fixes
- Pruebas de integración de las 3 funcionalidades
- Corrección de bugs encontrados
- Preparar para despliegue

### Sprint 2 (Semana 3): Importantes P2

**Día 1-2**: Seed de Roles
- Crear/actualizar role_seeder.ts
- Ejecutar en dev y verificar
- Actualizar documentación de despliegue

**Día 3-5**: Notificaciones Push FCM
- Configurar Firebase Admin SDK
- Crear NotificationService
- Integrar en eventos de asignaciones y calificaciones
- Probar envío real desde app móvil

**Día 6-7**: Testing y Documentación
- Pruebas end-to-end de notificaciones
- Actualizar README con nuevas variables de entorno
- Documentar endpoints nuevos

---

## 📊 MÉTRICAS DE PROGRESO

### Tareas Totales: 65

**Prioridad 1 (Críticas)**: 50 tareas
- Gestión Admin: 13 tareas
- Carga Masiva: 12 tareas
- Cambio Password: 10 tareas
- Gestión Rector/Coordinador: 15 tareas

**Prioridad 2 (Importantes)**: 15 tareas
- Seed Roles: 5 tareas
- FCM Notificaciones: 10 tareas
65
### Estado Actual: 0/50 ✅ (0%)

---

## 🔗 DOCUMENTOS RELACIONADOS

- [Análisis Backend Actual](./ANALISIS_BACKEND.md)
- [Requerimientos Funcionales](./docs/requerimientos/02_requerimientos_funcionales.md)
- [Historias de Usuario](./docs/requerimientos/04_historias_usuario.md)
- [Schema Base de Datos](./DB_SCHEMA_CATEDRA_FAMILIA.sql)

---

## 📝 NOTAS FINALES

### ⚠️ Recordatorios Importantes

1. **NO modificar migraciones/schema**: Todas las tablas necesarias ya existen
2. **Usar transacciones**: Para operaciones que modifican múltiples registros (carga masiva)
3. **Validar permisos**: Cada endpoint debe verificar que el usuario tiene el rol correcto
4. **Passwords seguros**: Aplicar reglas MinTIC en todos los endpoints de creación de usuarios
5. **Testing exhaustivo**: Probar casos exitosos y de error antes de marcar completado

### 💡 Sugerencias de Optimización

- Considerar implementar **rate limiting** en endpoints públicos
- Agregar **caché Redis** para listados de instituciones/cursos frecuentes
- Implementar **logging estructurado** con contexto de usuario en cada request
- Crear **health check endpoint** (`GET /health`) para monitoreo

---

## 🧪 FLUJO DE TESTING - ADMIN_SISTEMA

### Requisitos Previos
- Backend corriendo en `http://localhost:3333`
- Seed de roles ejecutado (6 roles)
- Admin_sistema creado en BD

### 1️⃣ Login Admin Sistema
```bash
POST /admin/login
{
  "email": "admin@educacionpopayan.gov.co",
  "password": "Admin123!"
}

# Respuesta esperada:
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "admin@educacionpopayan.gov.co",
    "roleId": "admin_sistema",
    "mustChangePassword": false
  }
}
```
**✅ Guardar el token para siguiente paso**

### 2️⃣ Crear Rector
```bash
POST /admin/rectores
Authorization: Bearer {token_del_paso_1}
{
  "email": "rector@institucion1.edu.co",
  "password": "Rector123!",
  "firstName": "Carlos",
  "lastName": "Gómez",
  "institutionId": 1
}

# Respuesta esperada:
{
  "success": true,
  "data": {
    "id": 2,
    "email": "rector@institucion1.edu.co",
    "roleId": "rector",
    "mustChangePassword": true,
    "institutionId": 1
  }
}
```

### 3️⃣ Login Rector (Verificar Cambio Password)
```bash
POST /auth/login
{
  "email": "rector@institucion1.edu.co",
  "password": "Rector123!"
}

# Respuesta esperada:
{
  "token": "eyJhbGc...",
  "user": {
    "mustChangePassword": true  # ⚠️ Debe ser true
  }
}
```

### 4️⃣ Cambiar Password (Rector)
```bash
POST /usuarios/cambiar-password
Authorization: Bearer {token_rector}
{
  "currentPassword": "Rector123!",
  "newPassword": "MiNueva123!",
  "confirmPassword": "MiNueva123!"
}

# Respuesta esperada:
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

### 5️⃣ Login Rector con Nueva Password
```bash
POST /auth/login
{
  "email": "rector@institucion1.edu.co",
  "password": "MiNueva123!"
}

# Respuesta esperada:
{
  "user": {
    "mustChangePassword": false  # ✅ Ahora debe ser false
  }
}
```

### 6️⃣ Crear Coordinador (Como Admin)
```bash
POST /admin/coordinadores
Authorization: Bearer {token_admin}
{
  "email": "coordinador@institucion1.edu.co",
  "password": "Coord123!",
  "firstName": "María",
  "lastName": "López",
  "institutionId": 1
}

# Respuesta esperada: Status 201 Created
```

### 7️⃣ Listar Instituciones Pendientes (Como Admin)
```bash
GET /admin/instituciones/pendientes
Authorization: Bearer {token_admin}

# Respuesta esperada:
{
  "data": [
    {
      "id": 5,
      "name": "IE Nueva Institución",
      "isApproved": false,
      "rector": { "firstName": "Juan", "email": "..." }
    }
  ]
}
```

### 8️⃣ Aprobar Institución (Como Admin)
```bash
PUT /admin/instituciones/5/aprobar
Authorization: Bearer {token_admin}

# Respuesta esperada:
{
  "success": true,
  "data": {
    "id": 5,
    "isApproved": true,
    "approvedAt": "2026-01-21T10:30:00Z"
  }
}
```

### 9️⃣ Cargar Estudiantes Excel (Como Rector)
```bash
# Primero descargar plantilla
GET /estudiantes/plantilla-excel
Authorization: Bearer {token_rector}
# Retorna archivo plantilla_estudiantes.xlsx

# Validar archivo antes de cargar
POST /estudiantes/validar-excel
Authorization: Bearer {token_rector}
Content-Type: multipart/form-data
archivo: [file.xlsx]

# Respuesta esperada:
{
  "totalRows": 50,
  "validRows": 48,
  "invalidRows": 2,
  "errors": ["Fila 15: Email inválido", "Fila 32: Documento duplicado"]
}

# Carga masiva final
POST /estudiantes/carga-masiva
Authorization: Bearer {token_rector}
Content-Type: multipart/form-data
archivo: [file.xlsx]
institutionId: 1
courseId: 3

# Respuesta esperada:
{
  "success": true,
  "insertados": 48,
  "rechazados": 2
}
```

### 🔟 Crear Orientador (Como Rector)
```bash
POST /instituciones/1/orientadores
Authorization: Bearer {token_rector}
{
  "email": "orientador@institucion1.edu.co",
  "password": "Orient123!",
  "firstName": "Laura",
  "lastName": "Martínez",
  "phone": "3201234567",
  "address": "Calle 5 #10-20"
}

# Respuesta esperada:
- [ ] Rector puede crear orientador
- [ ] Orientador creado tiene `mustChangePassword = true`
- [ ] Rector puede crear docente
- [ ] Docente puede ser asignado a múltiples cursos
- [ ] Rector puede marcar docente como director de curso
- [ ] Solo un docente puede ser director por curso
- [ ] Orientador y docente quedan vinculados a institutionId correcto
{
  "success": true,
  "data": {
    "id": 10,
    "email": "orientador@institucion1.edu.co",
    "roleId": "orientador",
    "mustChangePassword": true,
    "institutionId": 1
  }
}
```

### 1️⃣1️⃣ Crear Docente con Cursos (Como Rector)
```bash
POST /instituciones/1/docentes
Authorization: Bearer {token_rector}
{
  "email": "docente1@institucion1.edu.co",
  "password": "Docen123!",
  "firstName": "Pedro",
  "lastName": "González",
  "phone": "3151234567",
  "courseIds": [3, 5]
}

# Respuesta esperada:
{
  "success": true,
  "data": {
    "id": 11,
    "email": "docente1@institucion1.edu.co",
    "roleId": "docente",
    "mustChangePassword": true,
    "institutionId": 1,
    "courses": [
      { "id": 3, "name": "5° A", "isDirector": false },
      { "id": 5, "name": "6° B", "isDirector": false }
    ]
  }
}
```

### 1️⃣2️⃣ Asignar Docente como Director de Curso
```bash
POST /docentes/11/cursos
Authorization: Bearer {token_rector}
{
  "courseAssignments": [
    { "courseId": 3, "isDirector": true },
    { "courseId": 5, "isDirector": false }
  ]
}

# Respuesta esperada:
{
  "success": true,
  "message": "Docente asignado como director del curso 5° A"
}
```

### ✅ Checklist de Verificación

- [ ] Admin puede loguearse
- [ ] Admin puede crear rector
- [ ] Rector creado tiene `mustChangePassword = true`
- [ ] Rector puede cambiar su password
- [ ] Después del cambio, `mustChangePassword = false`
- [ ] Admin puede crear coordinador
- [ ] Admin puede listar instituciones pendientes
- [ ] Admin puede aprobar instituciones
- [ ] Rector puede descargar plantilla Excel
- [ ] Rector puede validar archivo Excel
- [ ] Rector puede cargar estudiantes masivamente
- [ ] Transacción hace rollback si hay errores

---

**Última actualización**: 21 de enero de 2026  
**Mantenido por**: Equipo Backend  
**Estado**: 🚧 En desarrollo
