import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import Funcionario from '#models/funcionario'
import Docente from '#models/docente'
import Usuario from '#models/usuario'
import Institucion from '#models/institucion'
import Periodo from '#models/periodo'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'

export default class RectoresController {
  /**
   * Obtener estadísticas del rector
   * GET /rectores/estadisticas
   */
  async estadisticas({ response, jwtUser }: HttpContext) {
    try {
      // Verificar que jwtUser existe y es rector
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        })
      }

      if (jwtUser.rolId !== 2) {
        return response.status(403).json({
          success: false,
          message: 'Solo los rectores pueden acceder a estas estadísticas',
        })
      }

      // Obtener el funcionario con su institución (los rectores están en funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser.id)
        .preload('institucion')
        .firstOrFail()

      const institucionId = rector.institucionId

      if (!institucionId) {
        return response.status(400).json({
          success: false,
          message: 'Rector no tiene institución asignada',
        })
      }

      // Contar coordinadores (rolId: 3) usando SQL directo
      const coordinadoresResult = await db
        .from('funcionarios as f')
        .join('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId)
        .where('u.rol_id', 3)
        .count('* as total')
      
      const coordinadoresActivosResult = await db
        .from('funcionarios as f')
        .join('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId)
        .where('u.rol_id', 3)
        .where('u.esta_activo', true)
        .count('* as total')

      // Contar orientadores (rolId: 4)
      const orientadoresResult = await db
        .from('funcionarios as f')
        .join('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId)
        .where('u.rol_id', 4)
        .count('* as total')
      
      const orientadoresActivosResult = await db
        .from('funcionarios as f')
        .join('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId)
        .where('u.rol_id', 4)
        .where('u.esta_activo', true)
        .count('* as total')

      // Contar docentes (rolId: 5)
      const docentesResult = await db
        .from('funcionarios as f')
        .join('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId)
        .where('u.rol_id', 5)
        .count('* as total')
      
      const docentesActivosResult = await db
        .from('funcionarios as f')
        .join('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId)
        .where('u.rol_id', 5)
        .where('u.esta_activo', true)
        .count('* as total')

      // Contar cursos de la institución
      const cursosResult = await db
        .from('cursos')
        .where('institucion_id', institucionId)
        .count('* as total')

      // Contar estudiantes de todos los cursos de la institución
      const estudiantesResult = await db
        .from('estudiantes as e')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('c.institucion_id', institucionId)
        .count('* as total')

      return response.status(200).json({
        success: true,
        data: {
          institucionId,
          institucionNombre: rector.institucion?.nombre,
          totalCoordinadores: Number(coordinadoresResult[0]?.total || 0),
          coordinadoresActivos: Number(coordinadoresActivosResult[0]?.total || 0),
          totalOrientadores: Number(orientadoresResult[0]?.total || 0),
          orientadoresActivos: Number(orientadoresActivosResult[0]?.total || 0),
          totalDocentes: Number(docentesResult[0]?.total || 0),
          docentesActivos: Number(docentesActivosResult[0]?.total || 0),
          totalCursos: Number(cursosResult[0]?.total || 0),
          totalEstudiantes: Number(estudiantesResult[0]?.total || 0),
        },
      })
    } catch (error) {
      console.error('Error al obtener estadísticas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message,
      })
    }
  }

  /**
   * Crear un coordinador en la institución del rector
   * POST /rectores/coordinadores
   */
  async crearCoordinador({ request, response, jwtUser }: HttpContext) {
    try {
      // Verificar que jwtUser existe y es rector
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        })
      }

      if (jwtUser.rolId !== 2) {
        return response.status(403).json({
          success: false,
          message: 'Solo los rectores pueden crear coordinadores en su institución',
        })
      }

      // Obtener la institución del rector (desde funcionarios)
      console.log('=== DEBUG CREAR COORDINADOR ===')
      console.log('👤 JWT User ID:', jwtUser.id)
      console.log('👤 JWT User Rol:', jwtUser.rolId)
      
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser.id)
        .preload('institucion')
        .firstOrFail()

      console.log('🏢 Rector encontrado:', rector.id)
      console.log('🏢 Rector institucionId:', rector.institucionId)
      console.log('🏢 Institución preload:', rector.institucion?.nombre || 'SIN INSTITUCIÓN')

      const institucionId = rector.institucionId

      // Validar que la institución existe y está activa
      const institucion = await Institucion.find(institucionId)
      if (!institucion) {
        return response.status(404).json({
          success: false,
          message: 'Institución no encontrada',
        })
      }

      const { 
        correo, 
        contrasena, 
        nombre, 
        apellido, 
        telefono,
        tipoDocumento,
        numeroDocumento,
        direccion,
        areaQueOrienta,
        centroInteres
      } = request.only([
        'correo',
        'contrasena',
        'nombre',
        'apellido',
        'telefono',
        'tipoDocumento',
        'numeroDocumento',
        'direccion',
        'areaQueOrienta',
        'centroInteres'
      ])

      // Validar campos requeridos
      if (!correo || !nombre || !apellido) {
        return response.status(400).json({
          success: false,
          message: 'Los campos correo, nombre y apellido son requeridos',
          errors: {
            required: ['correo', 'nombre', 'apellido'],
          },
        })
      }

      // Si no se proporciona contraseña, usar la temporal por defecto
      const contrasenaFinal = contrasena || 'Temp123456'

      // Validar formato de contraseña (solo si se proporciona y no es la temporal)
      if (contrasena && contrasena !== 'Temp123456') {
        // Validación básica: mínimo 6 caracteres
        if (contrasena.length < 6) {
          return response.status(400).json({
            success: false,
            message: 'La contraseña debe tener al menos 6 caracteres',
          })
        }
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(correo)) {
        return response.status(400).json({
          success: false,
          message: 'El formato del correo es inválido',
        })
      }

      // Verificar que el correo no esté registrado
      const existeCorreo = await Usuario.findBy('correo', correo)
      if (existeCorreo) {
        return response.status(400).json({
          success: false,
          message: 'El correo ya está registrado',
          error: 'EMAIL_EXISTS'
        })
      }

      // Validar formato de contraseña (solo si se proporciona)
      if (contrasena && contrasena !== 'Temp123456') {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
        if (!passwordRegex.test(contrasena)) {
          return response.status(400).json({
            success: false,
            message:
              'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)',
          })
        }
      }

      // Crear usuario para el coordinador
      const usuario = await Usuario.create({
        correo,
        contrasenaHash: contrasenaFinal, // El modelo hashea automáticamente
        rolId: 3, // Coordinador
        estaActivo: true,
        debeCambiarContrasena: true,
      })

      // Crear funcionario (coordinador)
      const coordinador = await Funcionario.create({
        nombre,
        apellido,
        telefono: telefono || '',
        correoInstitucional: correo,
        direccion: direccion || '',
        rolId: 3, // Coordinador
        usuarioId: usuario.id,
        institucionId: institucionId
      })

      return response.status(201).json({
        success: true,
        message: 'Coordinador creado exitosamente',
        data: {
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            rolId: usuario.rolId,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
          },
          coordinador: {
            id: coordinador.id,
            nombre: coordinador.nombre,
            apellido: coordinador.apellido,
            telefono: coordinador.telefono,
            institucionId: coordinador.institucionId,
            institucionNombre: institucion.nombre,
          },
          credenciales: {
            correo,
            contrasena: contrasenaFinal,
            mensaje: contrasena === 'Temp123456' 
              ? '🔑 CONTRASEÑA TEMPORAL - Se recomienda cambiarla en el primer login'
              : '🔑 CONTRASEÑA PERSONALIZADA - Guardar estas credenciales',
            esTemporal: contrasena === 'Temp123456'
          }
        },
      })
    } catch (error) {
      console.error('Error al crear coordinador:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear coordinador',
        error: error.message,
      })
    }
  }

  /**
   * Listar coordinadores de la institución del rector
   * GET /rectores/coordinadores
   */
  async listarCoordinadores({ response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = rector.institucionId

      // Obtener coordinadores de la institución
      const coordinadores = await Funcionario.query()
        .where('institucion_id', institucionId)
        .where('rol_id', 3) // coordinador
        .preload('usuario', (query) => {
          query.preload('rol')
        })
        .preload('institucion')

      const coordinadoresFormateados = coordinadores.map((coord) => ({
        id: coord.id,
        nombre: coord.nombre,
        apellido: coord.apellido,
        telefono: coord.telefono,
        usuarioId: coord.usuarioId,
        correo: coord.usuario?.correo,
        estaActivo: coord.usuario?.estaActivo,
        institucionId: coord.institucionId,
        institucion: coord.institucion?.nombre,
      }))

      return response.status(200).json({
        success: true,
        data: coordinadoresFormateados,
        total: coordinadoresFormateados.length,
      })
    } catch (error) {
      console.error('Error al listar coordinadores:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar coordinadores',
        error: error.message,
      })
    }
  }

  /**
   * Listar orientadores de la institución del rector
   * GET /rectores/orientadores
   */
  async listarOrientadores({ response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = rector.institucionId

      // Obtener orientadores de la institución
      const orientadores = await Funcionario.query()
        .where('institucion_id', institucionId)
        .where('rol_id', 4) // orientador
        .preload('usuario', (query) => {
          query.preload('rol')
        })
        .preload('institucion')

      const orientadoresFormateados = orientadores.map((orient) => ({
        id: orient.id,
        nombre: orient.nombre,
        apellido: orient.apellido,
        telefono: orient.telefono,
        usuarioId: orient.usuarioId,
        correo: orient.usuario?.correo,
        estaActivo: orient.usuario?.estaActivo,
        institucionId: orient.institucionId,
        institucion: orient.institucion?.nombre,
      }))

      return response.status(200).json({
        success: true,
        data: orientadoresFormateados,
        total: orientadoresFormateados.length,
      })
    } catch (error) {
      console.error('Error al listar orientadores:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar orientadores',
        error: error.message,
      })
    }
  }

  /**
   * Listar docentes de la institución del rector
   * GET /rectores/docentes
   */
  async listarDocentes({ response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = rector.institucionId

      // Obtener docentes de la institución (usando tabla docentes)
      const docentes = await db
        .from('docentes as d')
        .leftJoin('usuarios as u', 'd.usuario_id', 'u.id')
        .where('d.institucion_id', institucionId)
        .select(
          'd.id',
          'd.nombres as nombre',
          'd.apellidos as apellido',
          'd.telefono',
          'd.numero_documento as documento',
          'd.usuario_id as usuarioId',
          'u.correo',
          'u.esta_activo as estaActivo'
        )

      return response.status(200).json({
        success: true,
        data: docentes,
        total: docentes.length,
      })
    } catch (error) {
      console.error('Error al listar docentes:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar docentes',
        error: error.message,
      })
    }
  }

  /**
   * Listar cursos de la institución del rector
   * GET /rectores/cursos
   */
  async listarCursos({ response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = rector.institucionId

      // Obtener cursos de la institución
      const cursos = await db
        .from('cursos as c')
        .leftJoin('grados as g', 'c.grado_id', 'g.id')
        .where('c.institucion_id', institucionId)
        .select(
          'c.id',
          'c.nombre',
          'c.jornada',
          'c.grado_id as gradoId',
          'g.nombre as gradoNombre'
        )
        .orderBy('g.nombre', 'asc')
        .orderBy('c.nombre', 'asc')

      // Contar estudiantes por curso
      const cursosConEstudiantes = await Promise.all(
        cursos.map(async (curso) => {
          const estudiantesCount = await db
            .from('estudiantes')
            .where('curso_id', curso.id)
            .count('* as total')

          return {
            ...curso,
            totalEstudiantes: Number(estudiantesCount[0]?.total || 0),
          }
        })
      )

      return response.status(200).json({
        success: true,
        data: cursosConEstudiantes,
        total: cursosConEstudiantes.length,
      })
    } catch (error) {
      console.error('Error al listar cursos:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar cursos',
        error: error.message,
      })
    }
  }

  /**
   * Ver datos de la institución del rector
   * GET /rectores/mi-institucion
   */
  async miInstitucion({ response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .preload('institucion', (query) => {
          query.preload('municipio', (municipioQuery) => {
            municipioQuery.preload('departamento')
          })
        })
        .firstOrFail()

      const institucion = rector.institucion

      if (!institucion) {
        return response.status(404).json({
          success: false,
          message: 'Institución no encontrada',
        })
      }

      return response.status(200).json({
        success: true,
        data: {
          id: institucion.id,
          nombre: institucion.nombre,
          telefono: institucion.telefono,
          correo: institucion.correo,
          direccion: institucion.direccion,
          codigoDane: institucion.codigoDane,
          nit: institucion.nit,
          municipioId: institucion.municipioId,
          municipio: institucion.municipio?.nombre,
          departamento: institucion.municipio?.departamento?.nombre,
          rectorNombre: institucion.rectorNombre,
          rectorDocumento: institucion.rectorDocumento,
          rectorCorreo: institucion.rectorCorreo,
          rectorTelefono: institucion.rectorTelefono,
        },
      })
    } catch (error) {
      console.error('Error al obtener institución:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener institución',
        error: error.message,
      })
    }
  }

  /**
   * Actualizar datos de la institución del rector
   * PUT /rectores/mi-institucion
   * Solo puede editar: teléfono, correo, dirección, datos del rector
   */
  async actualizarMiInstitucion({ request, response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucion = await Institucion.findOrFail(rector.institucionId)

      // Campos que el rector puede editar
      const {
        telefono,
        correo,
        direccion,
        rectorNombre,
        rectorDocumento,
        rectorCorreo,
        rectorTelefono,
      } = request.only([
        'telefono',
        'correo',
        'direccion',
        'rectorNombre',
        'rectorDocumento',
        'rectorCorreo',
        'rectorTelefono',
      ])

      // Actualizar solo los campos permitidos
      if (telefono !== undefined) institucion.telefono = telefono
      if (correo !== undefined) institucion.correo = correo
      if (direccion !== undefined) institucion.direccion = direccion
      if (rectorNombre !== undefined) institucion.rectorNombre = rectorNombre
      if (rectorDocumento !== undefined) institucion.rectorDocumento = rectorDocumento
      if (rectorCorreo !== undefined) institucion.rectorCorreo = rectorCorreo
      if (rectorTelefono !== undefined) institucion.rectorTelefono = rectorTelefono

      await institucion.save()

      return response.status(200).json({
        success: true,
        message: 'Institución actualizada exitosamente',
        data: {
          id: institucion.id,
          nombre: institucion.nombre,
          telefono: institucion.telefono,
          correo: institucion.correo,
          direccion: institucion.direccion,
          rectorNombre: institucion.rectorNombre,
          rectorDocumento: institucion.rectorDocumento,
          rectorCorreo: institucion.rectorCorreo,
          rectorTelefono: institucion.rectorTelefono,
        },
      })
    } catch (error) {
      console.error('Error al actualizar institución:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar institución',
        error: error.message,
      })
    }
  }

  /**
   * Listar períodos académicos de la institución del rector
   * GET /rectores/periodos
   */
  async listarPeriodos({ response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = rector.institucionId

      // Obtener períodos de la institución
      const periodos = await Periodo.query()
        .where('institucion_id', institucionId)
        .orderBy('fecha_inicio', 'desc')

      return response.status(200).json({
        success: true,
        data: periodos.map((periodo) => ({
          id: periodo.id,
          nombre: periodo.nombre,
          fechaInicio: periodo.fechaInicio.toFormat('yyyy-MM-dd'),
          fechaFin: periodo.fechaFin.toFormat('yyyy-MM-dd'),
          estaActivo: periodo.estaActivo,
          estado: periodo.estaActivo ? 'activo' : 'inactivo',
          institucionId: periodo.institucionId,
        })),
        total: periodos.length,
      })
    } catch (error) {
      console.error('Error al listar períodos:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar períodos',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      })
    }
  }

  /**
   * Crear período académico en la institución del rector
   * POST /rectores/periodos
   */
  async crearPeriodo({ request, response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = rector.institucionId

      const { nombre, fechaInicio, fechaFin, estaActivo, estado } = request.only([
        'nombre',
        'fechaInicio',
        'fechaFin',
        'estaActivo',
        'estado',
      ])

      // Validar campos requeridos
      if (!nombre || !fechaInicio || !fechaFin) {
        return response.status(400).json({
          success: false,
          message: 'Los campos nombre, fechaInicio y fechaFin son requeridos',
        })
      }

      // Determinar el valor de estaActivo (aceptar tanto booleano como string)
      let estaActivoValue = true
      if (estaActivo !== undefined) {
        estaActivoValue = estaActivo
      } else if (estado !== undefined) {
        estaActivoValue = estado === 'activo'
      }

      // Crear período
      const periodo = await Periodo.create({
        nombre,
        fechaInicio,
        fechaFin,
        institucionId,
        estaActivo: estaActivoValue,
      })

      // Recargar para obtener las fechas como DateTime
      await periodo.refresh()

      return response.status(201).json({
        success: true,
        message: 'Período creado exitosamente',
        data: {
          id: periodo.id,
          nombre: periodo.nombre,
          fechaInicio: periodo.fechaInicio.toFormat('yyyy-MM-dd'),
          fechaFin: periodo.fechaFin.toFormat('yyyy-MM-dd'),
          estaActivo: periodo.estaActivo,
          estado: periodo.estaActivo ? 'activo' : 'inactivo',
          institucionId: periodo.institucionId,
        },
      })
    } catch (error) {
      console.error('Error al crear período:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear período',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      })
    }
  }

  /**
   * Actualizar período académico de la institución del rector
   * PUT /rectores/periodos/:id
   */
  async actualizarPeriodo({ params, request, response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = rector.institucionId

      // Buscar el período y verificar que pertenece a su institución
      const periodo = await Periodo.query()
        .where('id', params.id)
        .where('institucion_id', institucionId)
        .first()

      if (!periodo) {
        return response.status(404).json({
          success: false,
          message: `Período con ID ${params.id} no encontrado o no pertenece a su institución`,
        })
      }

      const { nombre, fechaInicio, fechaFin, estaActivo, estado } = request.only([
        'nombre',
        'fechaInicio',
        'fechaFin',
        'estaActivo',
        'estado',
      ])

      // Actualizar campos
      if (nombre !== undefined) periodo.nombre = nombre
      if (fechaInicio !== undefined) {
        periodo.fechaInicio = typeof fechaInicio === 'string' 
          ? DateTime.fromISO(fechaInicio) 
          : fechaInicio
      }
      if (fechaFin !== undefined) {
        periodo.fechaFin = typeof fechaFin === 'string'
          ? DateTime.fromISO(fechaFin)
          : fechaFin
      }
      
      // Aceptar tanto estaActivo (booleano) como estado (string "activo"/"inactivo")
      if (estaActivo !== undefined) {
        periodo.estaActivo = estaActivo
      } else if (estado !== undefined) {
        periodo.estaActivo = estado === 'activo'
      }

      await periodo.save()

      return response.status(200).json({
        success: true,
        message: 'Período actualizado exitosamente',
        data: {
          id: periodo.id,
          nombre: periodo.nombre,
          fechaInicio: periodo.fechaInicio.toFormat('yyyy-MM-dd'),
          fechaFin: periodo.fechaFin.toFormat('yyyy-MM-dd'),
          estaActivo: periodo.estaActivo,
          estado: periodo.estaActivo ? 'activo' : 'inactivo',
          institucionId: periodo.institucionId,
        },
      })
    } catch (error) {
      console.error('Error al actualizar período:', error)
      
      if (error.code === 'E_ROW_NOT_FOUND') {
        return response.status(404).json({
          success: false,
          message: 'Período no encontrado',
          error: error.message,
        })
      }

      return response.status(500).json({
        success: false,
        message: 'Error al actualizar período',
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      })
    }
  }

  /**
   * Eliminar período académico de la institución del rector
   * DELETE /rectores/periodos/:id
   */
  async eliminarPeriodo({ params, response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del rector (desde funcionarios)
      const rector = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = rector.institucionId

      // Buscar el período y verificar que pertenece a su institución
      const periodo = await Periodo.query()
        .where('id', params.id)
        .where('institucion_id', institucionId)
        .firstOrFail()

      await periodo.delete()

      return response.status(200).json({
        success: true,
        message: 'Período eliminado exitosamente',
      })
    } catch (error) {
      console.error('Error al eliminar período:', error)
      
      // Manejar error de restricción de clave foránea
      if (error.code === '23503') {
        return response.status(409).json({
          success: false,
          message: 'No se puede eliminar el período porque tiene asignaciones o calificaciones asociadas',
          error: 'FOREIGN_KEY_CONSTRAINT',
        })
      }

      return response.status(500).json({
        success: false,
        message: 'Error al eliminar período',
        error: error.message,
      })
    }
  }
}
