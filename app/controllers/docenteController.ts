
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import jwt from 'jsonwebtoken'

import Acudiente from '#models/acudiente'
import Curso from '#models/curso'
import Docente from '#models/docente'
import Estudiante from '#models/estudiante'
import Funcionario from '#models/funcionario'
import Role from '#models/role'
import Usuario from '#models/usuario'
import env from '#start/env'

export default class DocenteController {
  private async getDocenteCursoIds(usuario: Usuario): Promise<number[] | null> {
    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol === 'orientador') {
      // Orientador: acceso sin restricción a rutas de docente
      return null
    }
    if (nombreRol !== 'docente') {
      // Cualquier otro rol: sin acceso (listas vacías / bloqueos)
      return []
    }

    const docente = await Docente.query().where('usuario_id', usuario.id).first()
    if (!docente) {
      return []
    }

    const rows = await db.from('docente_curso').where('docente_id', docente.id).select('curso_id')
    const cursoIds = rows.map((r) => Number(r.curso_id)).filter((id) => !Number.isNaN(id))
    return [...new Set(cursoIds)]
  }

  private async docentePuedeAccederAcudiente(usuario: Usuario, acudienteId: number): Promise<boolean> {
    const cursoIds = await this.getDocenteCursoIds(usuario)
    if (!Array.isArray(cursoIds)) {
      return true
    }

    if (!cursoIds.length) {
      return false
    }

    const row = await db
      .from('estudiante_acudiente as ea')
      .join('estudiantes', 'ea.estudiante_id', 'estudiantes.id')
      .where('ea.acudiente_id', acudienteId)
      .whereIn('estudiantes.curso_id', cursoIds)
      .first()

    return Boolean(row)
  }
  async login({ request, response }: HttpContext) {
    const correo = String(request.input('correo') ?? '').trim()
    const contrasena = String(request.input('contrasena') ?? '').trim()

    if (!correo || !contrasena) {
      return response.badRequest({ message: 'correo y contrasena son requeridos' })
    }

    const usuario = await Usuario.query().where('correo', correo).first()
    if (!usuario) {
      return response.unauthorized({ message: 'Usuario no existe' })
    }

    const ok = await hash.verify(usuario.contrasenaHash, contrasena)
    if (!ok) {
      const debug = app.inProduction
        ? undefined
        : {
            hashLength: usuario.contrasenaHash?.length,
            hashPrefix: usuario.contrasenaHash?.slice(0, 25),
          }

      return response.unauthorized({ message: 'Credenciales inválidas', debug })
    }

    const secret = env.get('JWT_SECRET', env.get('APP_KEY'))
    const accessToken = jwt.sign(
      {
        sub: usuario.id,
        correo: usuario.correo,
        rolId: usuario.rolId,
      },
      secret,
      { expiresIn: '7d' }
    )

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
      },
    })
  }

  async logout({ response }: HttpContext) {
    return response.ok({ message: 'Logout exitoso' })
  }

  async index({ response }: HttpContext) {
    const docentes = await Docente.query().orderBy('id', 'desc')
    return response.ok(docentes)
  }

  async show({ params, response }: HttpContext) {
    const docente = await Docente.find(params.id)
    if (!docente) {
      return response.notFound({ message: 'Docente no encontrado' })
    }

    return response.ok(docente)
  }

  async store({ request, response }: HttpContext) {
    const correo = String(request.input('correo') ?? '').trim()
    const contrasena = String(request.input('contrasena') ?? '').trim()
    const telefono = String(request.input('telefono') ?? '').trim()
    const numeroDocumento = String(request.input('numeroDocumento') ?? request.input('numero_documento') ?? '').trim()

    const cursoIds = request.input('cursoIds') ?? request.input('curso_ids')
    if (cursoIds !== undefined && !Array.isArray(cursoIds)) {
      return response.badRequest({ message: 'cursoIds debe ser un arreglo de ids' })
    }

    if (!correo || !telefono || !numeroDocumento) {
      return response.badRequest({ message: 'correo, telefono y numeroDocumento son requeridos' })
    }

    // Contraseña: usar la enviada o generar temporal
    const passwordTemporal = `Docente${new Date().getFullYear()}!`
    const passwordFinal = contrasena || passwordTemporal
    const usaPasswordTemporal = !contrasena

    if (Array.isArray(cursoIds) && cursoIds.length) {
      const cursos = await Curso.query().whereIn('id', cursoIds)
      if (cursos.length !== cursoIds.length) {
        return response.badRequest({ message: 'Uno o más cursoIds no existen' })
      }
    }

    const docenteExistentePorDocumento = await Docente.query().where('numero_documento', numeroDocumento).first()
    if (docenteExistentePorDocumento) {
      return response.conflict({ message: 'Este usuario ya existe: el numero de documento ya está registrado' })
    }

    const docenteExistentePorTelefono = await Docente.query().where('telefono', telefono).first()
    if (docenteExistentePorTelefono) {
      return response.conflict({ message: 'Este usuario ya existe: el telefono ya está registrado' })
    }

    const docenteExistentePorCorreo = await Docente.query().where('correo', correo).first()
    if (docenteExistentePorCorreo) {
      return response.conflict({ message: 'Este usuario ya existe: el correo ya está registrado' })
    }

    const rolDocente = await Role.query().whereILike('nombre', 'docente').first()
    if (!rolDocente) {
      return response.badRequest({ message: 'No existe el rol docente' })
    }

    const usuarioExistente = await Usuario.query().where('correo', correo).first()
    if (usuarioExistente) {
      return response.conflict({ message: 'Este usuario ya existe: el correo ya está registrado' })
    }

    // Validar que exista rector en la institución antes de crear docente
    const institucionId = request.input('institucionId') ?? request.input('institucion_id')
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
          debeCambiarContrasena: usaPasswordTemporal, // Solo si usa temporal
          rolId: rolDocente.id,
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
        institucionId: request.input('institucionId') ?? request.input('institucion_id'),
        usuarioId: usuario.id,
      }

      const docente = await Docente.create(payload, { client: trx })

      if (Array.isArray(cursoIds) && cursoIds.length) {
        await docente.related('cursos').attach(cursoIds, trx)
      }

      return { docente, usuario }
    })

    return response.created({
      docente: result.docente,
      usuario: { id: result.usuario.id, correo: result.usuario.correo },
      passwordTemporal: usaPasswordTemporal ? passwordFinal : undefined,
      debeCambiarContrasena: usaPasswordTemporal,
    })
  }

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

    return response.ok(docente)
  }

  async destroy({ params, response }: HttpContext) {
    const docente = await Docente.find(params.id)
    if (!docente) {
      return response.notFound({ message: 'Docente no encontrado' })
    }

    await docente.delete()
    return response.ok({ message: 'Docente eliminado' })
  }

  // ========================================
  // GESTIÓN DE ESTUDIANTES (EDICIÓN LIMITADA)
  // ========================================

  /**
   * Listar estudiantes de los cursos del docente
   * GET /docentes/estudiantes
   */
  async listarEstudiantes({ response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const cursoIds = usuario ? await this.getDocenteCursoIds(usuario) : null

    const query = Estudiante.query().orderBy('id', 'desc')
    if (Array.isArray(cursoIds)) {
      if (!cursoIds.length) {
        return response.ok([])
      }
      query.whereIn('curso_id', cursoIds)
    }

    const estudiantes = await query
    return response.ok(estudiantes)
  }

  /**
   * Ver un estudiante específico (solo si pertenece a sus cursos)
   * GET /docentes/estudiantes/:id
   */
  async verEstudiante({ params, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ message: 'Estudiante no encontrado' })
    }

    if (usuario) {
      const cursoIds = await this.getDocenteCursoIds(usuario)
      if (Array.isArray(cursoIds) && !cursoIds.includes(estudiante.cursoId)) {
        return response.forbidden({ message: 'Acceso denegado' })
      }
    }

    return response.ok(estudiante)
  }

  /**
   * Editar información de un estudiante (solo si pertenece a sus cursos)
   * PUT /docentes/estudiantes/:id
   */
  async editarEstudiante({ params, request, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ message: 'Estudiante no encontrado' })
    }

    if (usuario) {
      const cursoIds = await this.getDocenteCursoIds(usuario)
      if (Array.isArray(cursoIds) && !cursoIds.includes(estudiante.cursoId)) {
        return response.forbidden({ message: 'Acceso denegado: este estudiante no pertenece a tus cursos' })
      }
    }

    const payload = request.only([
      'nombres',
      'apellidos',
      'tipoDocumento',
      'numeroDocumento',
      'fechaNacimiento',
      'sexo',
      'grupoSanguineo',
      'rh',
      'paisNacimiento',
      'ciudadNacimiento',
      'estrato',
      'etnia',
      'eps',
    ])

    estudiante.merge(payload)
    await estudiante.save()

    return response.ok({
      message: 'Estudiante actualizado correctamente',
      estudiante
    })
  }

  // ========================================
  // GESTIÓN DE ACUDIENTES (EDICIÓN LIMITADA)
  // ========================================

  /**
   * Listar acudientes de los estudiantes de los cursos del docente
   * GET /docentes/acudientes
   */
  async listarAcudientes({ response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    if (!usuario) {
      const acudientes = await Acudiente.query().orderBy('id', 'desc')
      return response.ok(acudientes)
    }

    const cursoIds = await this.getDocenteCursoIds(usuario)
    if (Array.isArray(cursoIds)) {
      if (!cursoIds.length) {
        return response.ok([])
      }

      const acudientes = await db
        .from('acudientes')
        .join('estudiante_acudiente as ea', 'acudientes.id', 'ea.acudiente_id')
        .join('estudiantes', 'ea.estudiante_id', 'estudiantes.id')
        .whereIn('estudiantes.curso_id', cursoIds)
        .distinct('acudientes.*')
        .orderBy('acudientes.id', 'desc')

      return response.ok(acudientes)
    }

    const acudientes = await Acudiente.query().orderBy('id', 'desc')
    return response.ok(acudientes)
  }

  /**
   * Ver un acudiente específico (solo si está relacionado con estudiantes de sus cursos)
   * GET /docentes/acudientes/:id
   */
  async verAcudiente({ params, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    if (usuario) {
      const ok = await this.docentePuedeAccederAcudiente(usuario, Number(params.id))
      if (!ok) {
        return response.forbidden({ message: 'Acceso denegado: este acudiente no está relacionado con tus estudiantes' })
      }
    }

    const acudiente = await Acudiente.find(params.id)
    if (!acudiente) {
      return response.notFound({ message: 'Acudiente no encontrado' })
    }

    return response.ok(acudiente)
  }

  /**
   * Editar información de un acudiente (solo si está relacionado con estudiantes de sus cursos)
   * PUT /docentes/acudientes/:id
   */
  async editarAcudiente({ params, request, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    if (usuario) {
      const ok = await this.docentePuedeAccederAcudiente(usuario, Number(params.id))
      if (!ok) {
        return response.forbidden({ message: 'Acceso denegado: este acudiente no está relacionado con tus estudiantes' })
      }
    }

    const acudiente = await Acudiente.find(params.id)
    if (!acudiente) {
      return response.notFound({ message: 'Acudiente no encontrado' })
    }

    const payload = request.only([
      'nombres',
      'apellidos',
      'tipoDocumento',
      'numeroDocumento',
      'telefono',
      'telefonoAlternativo',
      'correo',
      'direccion',
      'parentesco',
      'ocupacion',
      'tipoTrabajo',
      'nivelEducativo',
      'aportaEconomia',
      'horarioTrabajo',
    ])

    acudiente.merge(payload)
    await acudiente.save()

    return response.ok({
      message: 'Acudiente actualizado correctamente',
      acudiente
    })
  }
}
