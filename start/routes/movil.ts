/*
|--------------------------------------------------------------------------
| Rutas para la App Móvil del Acudiente
|--------------------------------------------------------------------------
| Versión: 1.0
| Endpoints: EP-07 a EP-10 (HU-22 a HU-42)
|--------------------------------------------------------------------------
*/

import router from '@adonisjs/core/services/router'
const MovilController = () => import('#controllers/movilController')
const MovilEntregasController = () => import('#controllers/movil/entregasController')

// Grupo base para endpoints móviles
router
  .group(() => {
    // ============================================================
    // EP-07: AUTENTICACIÓN Y GESTIÓN DE PERFIL
    // ============================================================

    /**
     * POST /auth/login/movil
     * HU-22: Login específico para la app móvil del acudiente
     * Input: { documento: string, password: string }
     * Output: { token, user, estudiantes[] }
     */
    router.post('/auth/login/movil', [MovilController, 'loginMovil'])

    // Endpoints de debug - SOLO disponibles en desarrollo
    if (process.env.NODE_ENV !== 'production') {
      /**
       * POST /debug/acudiente - TEMPORAL para debugging  
       */
      router.post('/debug/acudiente', [MovilController, 'debugAcudiente'])

      /**
       * POST /debug/resetear - TEMPORAL para resetear contraseña
       */
      router.post('/debug/resetear', [MovilController, 'resetearContrasena'])

      /**
       * POST /debug/test-hash - TEMPORAL para probar hash
       */
      router.post('/debug/test-hash', [MovilController, 'testHash'])
    }

    /**
     * POST /auth/cambiar-password
     * HU-24: Cambio de contraseña (obligatorio al primer inicio de sesión)
     * Auth: Bearer Token
     * Input: { currentPassword, newPassword, confirmPassword }
     */
    router.post('/auth/cambiar-password', [MovilController, 'cambiarPassword'])

    /**
     * POST /auth/recuperar/solicitar
     * HU-25: Paso 1 - Solicitar código OTP por SMS/Email
     * Input: { contacto: string (teléfono o email) }
     */
    router.post('/auth/recuperar/solicitar', [MovilController, 'recuperarSolicitar'])

    /**
     * POST /auth/recuperar/verificar
     * HU-25: Paso 2 - Verificar código OTP
     * Input: { contacto, codigo }
     */
    router.post('/auth/recuperar/verificar', [MovilController, 'recuperarVerificar'])

    /**
     * POST /auth/recuperar/restablecer
     * HU-25: Paso 3 - Establecer nueva contraseña
     * Input: { token, newPassword, confirmPassword }
     */
    router.post('/auth/recuperar/restablecer', [MovilController, 'recuperarRestablecer'])

    // ============================================================
    // RUTAS PROTEGIDAS (Requieren autenticación)
    // ============================================================
    router
      .group(() => {
        // --------------------------------------------------------
        // EP-07: GESTIÓN DE ESTUDIANTES
        // --------------------------------------------------------

        /**
         * GET /acudientes/mis-estudiantes
         * HU-26: Lista de hijos vinculados al acudiente
         * Output: Array de estudiantes con curso e institución
         */
        router.get('/acudientes/mis-estudiantes', [MovilController, 'misEstudiantes'])

        /**
         * GET /estudiantes
         * Alias para app móvil - mismo que /acudientes/mis-estudiantes
         * Con prefijo /api/movil se convierte en /api/movil/estudiantes
         */
        router.get('/estudiantes', [MovilController, 'misEstudiantes'])

        /**
         * GET /estudiantes/:id/perfil
         * HU-27: Perfil completo de un estudiante
         * Output: Datos personales, médicos, académicos, estadísticas
         */
        router.get('/estudiantes/:id/perfil', [MovilController, 'perfilEstudiante'])

        // --------------------------------------------------------
        // EP-08: VISUALIZACIÓN Y ENVÍO DE TAREAS
        // --------------------------------------------------------

        /**
         * GET /estudiantes/:id/tareas
         * HU-28: Lista de tareas asignadas a un estudiante
         * Query: ?periodo=1 (opcional, default: período activo)
         * Output: Tareas con estado (pendiente, entregada, calificada, vencida)
         */
        router.get('/estudiantes/:id/tareas', [MovilController, 'tareasEstudiante'])
        // Alias con prefijo /movil
        router.get('/movil/estudiantes/:id/tareas', [MovilController, 'tareasEstudiante'])

        /**
         * GET /asignaciones/:id/detalle
         * HU-30: Detalle completo de una tarea/asignación
         * Output: Tarea, fechas, estado, entrega (si existe), calificación
         */
        router.get('/asignaciones/:id/detalle', [MovilController, 'detalleAsignacion'])
        // Alias con prefijo /movil
        router.get('/movil/asignaciones/:id/detalle', [MovilController, 'detalleAsignacion'])

        /**
         * POST /asignaciones/:id/entregas
         * HU-31: Enviar evidencia de una tarea
         * Input: { estudianteId, descripcion, archivos[] }
         */
        router.post('/asignaciones/:id/entregas', [MovilEntregasController, 'enviarEntrega'])
        // Alias con prefijo /movil
        router.post('/movil/asignaciones/:id/entregas', [MovilEntregasController, 'enviarEntrega'])

        /**
         * POST /asignaciones/:id/entregas/sync
         * HU-32: Sincronizar entrega creada en modo offline
         * Input: { estudianteId, descripcion, archivos[], timestampLocal }
         * TODO: Implementar método sincronizarEntrega en MovilController
         */
        // router.post('/asignaciones/:id/entregas/sync', [MovilController, 'sincronizarEntrega'])
        // // Alias con prefijo /movil
        // router.post('/movil/asignaciones/:id/entregas/sync', [MovilController, 'sincronizarEntrega'])

        /**
         * PUT /entregas/:id
         * HU-33: Editar entrega antes de la fecha límite
         * Input: { descripcion?, archivosNuevos[]?, archivosEliminar[]? }
         */
        router.put('/entregas/:id', [MovilEntregasController, 'editarEntrega'])
        // Alias con prefijo /movil
        router.put('/movil/entregas/:id', [MovilEntregasController, 'editarEntrega'])

        /**
         * GET /estudiantes/:id/tareas/sync
         * HU-34: Datos para caché offline (sincronización delta)
         * Query: ?ultimaSync=2026-01-20T10:00:00Z
         * TODO: Implementar método sincronizarTareas en MovilController
         */
        // router.get('/estudiantes/:id/tareas/sync', [MovilController, 'sincronizarTareas'])

        // --------------------------------------------------------
        // EP-09: CALIFICACIONES Y RETROALIMENTACIÓN
        // --------------------------------------------------------

        /**
         * GET /estudiantes/:id/historial
         * HU-36: Historial de entregas por período
         * Query: ?periodo=1 (opcional)
         * Output: Entregas con calificaciones, estadísticas
         */
        router.get('/estudiantes/:id/historial', [MovilController, 'historialEstudiante'])

        /**
         * GET /estudiantes/:id/estadisticas
         * HU-37: Estadísticas de desempeño del estudiante
         * Query: ?periodo=1 (opcional)
         * Output: Métricas de cumplimiento y rendimiento
         */
        router.get('/estudiantes/:id/estadisticas', [MovilController, 'estadisticasEstudiante'])

        // --------------------------------------------------------
        // EP-10: NOTIFICACIONES
        // --------------------------------------------------------

        /**
         * POST /notificaciones/token
         * HU-38: Registrar token FCM para push notifications
         * Input: { fcmToken, dispositivo?, sistemaOperativo? }
         */
        router.post('/notificaciones/token', [MovilController, 'registrarTokenFCM'])

        /**
         * GET /notificaciones
         * HU-38: Listar notificaciones del usuario
         * Query: ?page=1&limit=20
         */
        router.get('/notificaciones', [MovilController, 'listarNotificaciones'])

        /**
         * PUT /notificaciones/:id/leer
         * HU-39: Marcar notificación individual como leída
         */
        router.put('/notificaciones/:id/leer', [MovilController, 'marcarLeida'])

        /**
         * PUT /notificaciones/leer-todas
         * HU-39: Marcar todas las notificaciones como leídas
         */
        router.put('/notificaciones/leer-todas', [MovilController, 'marcarTodasLeidas'])

        /**
         * DELETE /notificaciones/:id
         * Eliminar una notificación individual
         */
        router.delete('/notificaciones/:id', [MovilController, 'eliminarNotificacion'])

        /**
         * DELETE /notificaciones
         * Eliminar todas las notificaciones del usuario
         */
        router.delete('/notificaciones', [MovilController, 'eliminarTodasNotificaciones'])

        // --------------------------------------------------------
        // PREFERENCIAS DE USUARIO
        // --------------------------------------------------------

        /**
         * GET /usuarios/preferencias
         * HU-40: Obtener preferencias de notificaciones
         */
        router.get('/usuarios/preferencias', [MovilController, 'obtenerPreferencias'])

        /**
         * PUT /usuarios/preferencias
         * HU-40: Actualizar preferencias de notificaciones
         * Input: { notificaciones: { nuevasTareas, calificaciones, recordatorios } }
         */
        router.put('/usuarios/preferencias', [MovilController, 'actualizarPreferencias'])
      })
      .use(async (ctx, next) => {
        // Middleware de autenticación JWT para rutas protegidas
        const { default: jwt } = await import('jsonwebtoken')
        const { default: env } = await import('#start/env')
        const { default: Usuario } = await import('#models/usuario')

        const authHeader = ctx.request.header('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
          return ctx.response.status(401).json({
            success: false,
            message: 'Token de autenticación requerido',
          })
        }

        const token = authHeader.substring(7)
        try {
          const jwtSecret = env.get('JWT_SECRET') || env.get('APP_KEY')
          const decoded = jwt.verify(token, jwtSecret) as any

          // Cargar el usuario completo desde la BD
          const usuario = await Usuario.find(decoded.sub)
          if (!usuario) {
            return ctx.response.status(401).json({
              success: false,
              message: 'Usuario no encontrado',
            })
          }

          ctx.jwtUser = usuario
          await next()
        } catch {
          return ctx.response.status(401).json({
            success: false,
            message: 'Token inválido o expirado',
          })
        }
      })

    // ============================================================
    // RUTAS PÚBLICAS (Sin autenticación)
    // ============================================================

    /**
     * GET /soporte/info
     * HU-42: Información de contacto de soporte
     */
    router.get('/soporte/info', [MovilController, 'infoSoporte'])
  })
  .prefix('/api/movil')

// ============================================================
// COMPATIBILIDAD (Bug Fix: App llama a /api/acudientes/...)
// ============================================================
router.group(() => {
  router.get('/acudientes/mis-estudiantes', [MovilController, 'misEstudiantes'])
  router.get('/estudiantes', [MovilController, 'misEstudiantes'])
}).prefix('/api')
  .use(async (ctx, next) => {
    const { default: jwt } = await import('jsonwebtoken')
    const { default: env } = await import('#start/env')
    const { default: Usuario } = await import('#models/usuario')

    const authHeader = ctx.request.header('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return ctx.response.status(401).json({ success: false, message: 'Token requerido' })
    }

    const token = authHeader.substring(7)
    try {
      const jwtSecret = env.get('JWT_SECRET') || env.get('APP_KEY')
      const decoded = jwt.verify(token, jwtSecret) as any
      const usuario = await Usuario.find(decoded.sub)

      if (!usuario) {
        return ctx.response.status(401).json({ success: false, message: 'Usuario no encontrado' })
      }

      (ctx as any).jwtUser = usuario
      await next()
    } catch {
      return ctx.response.status(401).json({ success: false, message: 'Token inválido' })
    }
  })
