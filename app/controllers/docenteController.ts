import type { HttpContext } from '@adonisjs/core/http'
import Docente from '#models/docente'
import Usuario from '#models/usuario'
import Funcionario from '#models/funcionario'
import Role from '#models/role'
import Curso from '#models/curso'
import db from '@adonisjs/lucid/services/db'

export default class DocenteController {
  /**
   * Login de docente
   */
  async login({ request, response }: HttpContext) {
    const { correo, contrasena } = request.only(['correo', 'contrasena'])

    if (!correo || !contrasena) {
      return response.badRequest({
        success: false,
        message: 'Correo y contraseña son requeridos'
      })
    }

    try {
      const usuario = await Usuario.verifyCredentials(correo, contrasena)

      if (!usuario.estaActivo) {
        return response.unauthorized({
          success: false,
          message: 'Usuario inactivo'
        })
      }

      // 🔥 Buscar información del docente para obtener institucionId
      let institucionId = null
      let docenteInfo = null

      if (usuario.rolId === 5) { // Si es docente
        docenteInfo = await Docente.query()
          .where('usuario_id', usuario.id)
          .first()
        
        if (docenteInfo) {
          institucionId = docenteInfo.institucionId
        }
      }

      const accessToken = await Usuario.accessTokens.create(usuario, {
        expiresIn: '7d'
      })

      return response.ok({
        message: 'Login exitoso',
        authorization: `Bearer ${accessToken}`,
        access_token: accessToken,
        token_type: 'Bearer',
        usuario: {
          id: usuario.id,
          correo: usuario.correo,
          rolId: usuario.rolId,
          debeCambiarContrasena: usuario.debeCambiarContrasena,
          institucionId: institucionId, // 🔥 Agregar institucionId
          docente: docenteInfo ? {
            id: docenteInfo.id,
            nombres: docenteInfo.nombres,
            apellidos: docenteInfo.apellidos
          } : null
        },
      })
    } catch (error) {
      return response.unauthorized({
        success: false,
        message: 'Credenciales inválidas'
      })
    }
  }

  /**
   * Logout de docente
   */
  async logout({ response }: HttpContext) {
    return response.ok({ message: 'Logout exitoso' })
  }

  /**
   * Listar todos los docentes
   */
  async index({ response, auth }: HttpContext) {
    const usuario = auth.user
    let institucionId: number | null = null

    if (usuario) {
      const rol = await Role.find(usuario.rolId)
      const nombreRol = (rol?.nombre ?? '').toLowerCase()

      if (nombreRol === 'orientador') {
        const func = await Funcionario.query().where('usuario_id', usuario.id).first()
        institucionId = func?.institucionId ?? null
      } else if (nombreRol === 'docente') {
        const docente = await Docente.query().where('usuario_id', usuario.id).first()
        institucionId = docente?.institucionId ?? null
      }
    }

    let query = Docente.query().preload('usuario').orderBy('id', 'desc')

    if (institucionId) {
      query = query.where('institucion_id', institucionId)
    }

    const docentes = await query

    const docentesConInfo = await Promise.all(
      docentes.map(async (docente) => {
        const cursosAsignados = await db
          .from('docente_curso as dc')
          .join('cursos as c', 'dc.curso_id', 'c.id')
          .where('dc.docente_id', docente.id)
          .select('c.id', 'c.nombre', 'dc.es_director')
          .orderBy('c.nombre')

        const estado = docente.usuario?.estaActivo ? 'Activo' : 'Inactivo'

        return {
          id: docente.id,
          nombre: docente.nombres,
          apellido: docente.apellidos,
          nombres: docente.nombres,
          apellidos: docente.apellidos,
          correo: docente.usuario?.correo || docente.correo || 'Sin correo',
          telefono: docente.telefono,
          cursos: cursosAsignados,
          cantidadCursos: cursosAsignados.length,
          estado,
          esDirector: cursosAsignados.some((c: any) => c.es_director),
          docenteInstitucionId: docente.institucionId,
          userInstitucionId: institucionId,
          pasa: docente.institucionId === institucionId,
          Docente: `${docente.nombres} ${docente.apellidos}`,
          Correo: docente.usuario?.correo || docente.correo || 'Sin correo',
          Teléfono: docente.telefono,
          Cursos: cursosAsignados.map((c: any) => c.nombre).join(', ') || 'Sin cursos',
          Estado: estado,
          Acciones: ''
        }
      })
    )

    return response.ok(docentesConInfo)
  }

  /**
   * Mostrar un docente específico
   */
  async show({ params, response }: HttpContext) {
    const docente = await Docente.find(params.id)

    if (!docente) {
      return response.notFound({ message: 'Docente no encontrado' })
    }

    return response.ok(docente)
  }

  /**
   * Crear un nuevo docente (Orientador o Admin)
   */
  async store(ctx: HttpContext) {
    console.log('=== DEBUG CREAR DOCENTE POR ORIENTADOR ===')
    
    const jwtUser = (ctx as any).jwtUser || ctx.auth?.user
    
    if (!jwtUser) {
      return ctx.response.unauthorized({
        success: false,
        message: 'No autenticado'
      })
    }

    const request = ctx.request
    const response = ctx.response

    const correo = String(request.input('correo') ?? '').trim()
    const contrasena = String(request.input('contrasena') ?? '').trim()
    const telefono = String(request.input('telefono') ?? '').trim()
    const numeroDocumento = String(request.input('numeroDocumento') ?? request.input('numero_documento') ?? '').trim()

    if (!correo || !telefono || !numeroDocumento) {
      return response.badRequest({ message: 'correo, telefono y numeroDocumento son requeridos' })
    }

    // Contraseña: usar la enviada o generar temporal
    const passwordTemporal = `Docente${new Date().getFullYear()}!`
    const passwordFinal = contrasena || passwordTemporal
    const usaPasswordTemporal = !contrasena

    // Obtener institución del orientador o admin
    let institucionId: number | null = null
    let institucionNombre: string = 'No asignada'
    let creadorNombre: string = 'Desconocido'

    try {
      const rol = await Role.find(jwtUser.rolId)
      
      if (rol?.id === 1) {
        // Admin sistema
        institucionId = request.input('institucionId') ?? request.input('institucion_id') ?? null
        institucionNombre = institucionId ? 'Asignada por admin' : 'Sin asignar'
        creadorNombre = 'Admin Sistema'
      } else {
        // Orientador - usar su institución
        const funcionario = await Funcionario.query()
          .where('usuario_id', jwtUser.id)
          .preload('institucion')
          .first()

        if (!funcionario || !funcionario.institucionId) {
          return response.badRequest({
            success: false,
            message: 'El orientador no tiene una institución asignada'
          })
        }

        institucionId = funcionario.institucionId
        institucionNombre = funcionario.institucion?.nombre || 'Sin nombre'
        creadorNombre = `${funcionario.nombre} ${funcionario.apellido}`
      }
    } catch (error) {
      return response.internalServerError({
        success: false,
        message: 'Error al obtener la institución del creador'
      })
    }

    // Validar que exista rector en la institución
    if (institucionId) {
      const tieneRector = await Funcionario.query()
        .where('institucion_id', institucionId)
        .where('rol_id', 2)
        .first()

      if (!tieneRector) {
        return response.status(400).json({
          success: false,
          message: 'Debe crear primero un rector para la institución antes de asignar docentes',
        })
      }
    }

    const result = await db.transaction(async (trx) => {
      const usuario = await Usuario.create(
        {
          correo,
          contrasenaHash: passwordFinal,
          estaActivo: true,
          debeCambiarContrasena: usaPasswordTemporal,
          rolId: 5, // Rol docente
        },
        { client: trx }
      )

      const payload = {
        nombres: request.input('nombres'),
        apellidos: request.input('apellidos'),
        tipoDocumento: request.input('tipoDocumento') ?? request.input('tipo_documento'),
        numeroDocumento,
        telefono,
        telefonoEmergencia: request.input('telefonoEmergencia') ?? request.input('telefono_emergencia'),
        personaEmergencia: request.input('personaEmergencia') ?? request.input('persona_emergencia'),
        correo,
        direccion: request.input('direccion'),
        esDirectorGrado: Boolean(request.input('esDirectorGrado') ?? request.input('es_director_grado') ?? false),
        gradoAsignado: request.input('gradoAsignado') ?? request.input('grado_asignado'),
        areaQueOrienta: request.input('areaQueOrienta') ?? request.input('area_que_orienta'),
        centroInteres: request.input('centroInteres') ?? request.input('centro_interes'),
        institucionId: institucionId,
        usuarioId: usuario.id,
      }

      const docente = await Docente.create(payload, { client: trx })
      return { docente, usuario }
    })

    return response.created({
      success: true,
      message: usaPasswordTemporal 
        ? 'Docente registrado. Credenciales temporales generadas.' 
        : 'Docente registrado con contraseña personalizada.',
      data: {
        docente: result.docente,
        usuario: { id: result.usuario.id, correo: result.usuario.correo },
        passwordTemporal: usaPasswordTemporal ? passwordFinal : undefined,
        debeCambiarContrasena: usaPasswordTemporal,
        institucion: {
          id: institucionId,
          nombre: institucionNombre
        },
        creadoPor: creadorNombre
      }
    })
  }

  /**
   * Actualizar un docente
   */
  async update({ params, request, response }: HttpContext) {
    const docente = await Docente.find(params.id)

    if (!docente) {
      return response.notFound({ message: 'Docente no encontrado' })
    }

    const payload = request.only([
      'nombres',
      'apellidos',
      'tipoDocumento',
      'numeroDocumento',
      'telefono',
      'telefonoEmergencia',
      'personaEmergencia',
      'correo',
      'direccion',
      'esDirectorGrado',
      'gradoAsignado',
      'areaQueOrienta',
      'centroInteres',
      'institucionId',
    ])

    docente.merge(payload)
    await docente.save()

    return response.ok({
      message: 'Docente actualizado correctamente',
      docente
    })
  }

  /**
   * Eliminar un docente
   */
  async destroy({ params, response }: HttpContext) {
    const docente = await Docente.find(params.id)

    if (!docente) {
      return response.notFound({ message: 'Docente no encontrado' })
    }

    await docente.delete()

    return response.ok({ message: 'Docente eliminado' })
  }
}
