import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import jwt from 'jsonwebtoken'

import Acudiente from '#models/acudiente'
import Asignacion from '#models/asignacion'
import Docente from '#models/docente'
import Funcionario from '#models/funcionario'
import Role from '#models/role'
import Usuario from '#models/usuario'
import env from '#start/env'
import db from '@adonisjs/lucid/services/db'

export default class AcudienteController {
  private async getDocenteCursoIds(usuario: Usuario): Promise<number[] | null> {
    const rol = await Role.find(usuario.rolId)
    const nombreRol = (rol?.nombre ?? '').toLowerCase()
    if (nombreRol !== 'docente') {
      return null
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

  async misTareas(ctx: HttpContext) {
    const { response } = ctx
    const usuario = (ctx as any).jwtUser as Usuario | undefined

    if (!usuario) {
      return response.unauthorized({ message: 'No autenticado' })
    }

    const acudiente = await Acudiente.query().where('usuario_id', usuario.id).first()
    if (!acudiente) {
      return response.notFound({ message: 'Acudiente no encontrado para este usuario' })
    }

    await acudiente.load('estudiantes')
    const cursoIds = [...new Set(acudiente.estudiantes.map((e) => e.cursoId))]

    if (!cursoIds.length) {
      return response.ok({ estudiantes: acudiente.estudiantes, asignaciones: [] })
    }

    const asignaciones = await Asignacion.query()
      .whereIn('curso_id', cursoIds)
      .orWhereHas('cursos', (q) => {
        q.whereIn('cursos.id', cursoIds)
      })
      .orderBy('id', 'desc')

    return response.ok({ estudiantes: acudiente.estudiantes, asignaciones })
  }

  async resetPassword({ request, response }: HttpContext) {
    const numeroDocumento = String(
      request.input('numeroDocumento') ?? request.input('numero_documento') ?? ''
    ).trim()

    if (!numeroDocumento) {
      return response.badRequest({ message: 'numeroDocumento es requerido' })
    }

    const normalize = (value: string) => value.replace(/\D+/g, '')
    const documentoNormalizado = normalize(numeroDocumento)

    const acudiente = await Acudiente.query()
      .where('numero_documento', documentoNormalizado)
      .first()

    if (!acudiente) {
      return response.notFound({ message: 'Acudiente no encontrado con ese número de documento' })
    }

    const usuario = await Usuario.find(acudiente.usuarioId)
    if (!usuario) {
      return response.notFound({ message: 'Usuario no encontrado para este acudiente' })
    }

    // Resetear la contraseña al número de documento (forzando algoritmo scrypt)
    usuario.contrasenaHash = await hash.use('scrypt').make(documentoNormalizado)
    // NO marcar cambio obligatorio para acudientes
    usuario.debeCambiarContrasena = false
    await usuario.save()

    const usuarioRecargado = await Usuario.findOrFail(usuario.id)
    const verifyAfterSave = await hash.use('scrypt').verify(usuarioRecargado.contrasenaHash, documentoNormalizado)

    const debug = app.inProduction
      ? undefined
      : {
          verifyAfterSave,
          hashLength: usuarioRecargado.contrasenaHash?.length,
          hashPrefix: usuarioRecargado.contrasenaHash?.slice(0, 25),
          hashSuffix: usuarioRecargado.contrasenaHash?.slice(-10),
          numeroDocumentoLength: documentoNormalizado.length,
        }

    return response.ok({
      message: 'Contraseña reseteada a su número de documento',
      correo: usuarioRecargado.correo,
      debug,
    })
  }

  async login({ request, response }: HttpContext) {
    const numeroDocumento = String(request.input('numeroDocumento') ?? request.input('correo') ?? '').trim()
    const contrasena = String(request.input('contrasena') ?? '').trim()

    if (!numeroDocumento || !contrasena) {
      return response.badRequest({ message: 'numeroDocumento y contrasena son requeridos' })
    }

    const normalize = (value: string) => value.replace(/\D+/g, '')
    const documentoNormalizado = normalize(numeroDocumento)

    // Buscar acudiente por número de documento
    const acudientes = await Acudiente.query().where('numero_documento', documentoNormalizado)
    const acudiente = acudientes.length === 1 ? acudientes[0] : null

    if (acudientes.length > 1) {
      const debug = app.inProduction
        ? undefined
        : {
            numeroDocumento: documentoNormalizado,
            coincidencias: acudientes.map((a) => ({
              acudienteId: a.id,
              usuarioId: a.usuarioId,
              nombres: a.nombres,
              apellidos: a.apellidos,
            })),
          }

      return response.conflict({
        message: 'Hay más de un acudiente con el mismo número de documento. Debes corregir datos duplicados.',
        debug,
      })
    }

    if (!acudiente) {
      return response.unauthorized({ message: 'Número de documento no encontrado' })
    }

    let usuario = await Usuario.find(acudiente.usuarioId)
    
    if (!usuario) {
      return response.unauthorized({ message: 'Usuario no encontrado' })
    }

    let ok = await hash.use('scrypt').verify(usuario.contrasenaHash, contrasena)

    // Si la contraseña no coincide, verificar si está usando su documento como contraseña (primera vez)
    if (!ok) {
      const matchesDocumento = normalize(contrasena) === documentoNormalizado

      if (matchesDocumento) {
        // Primera vez que ingresa - hashear el documento como contraseña
        usuario.contrasenaHash = await hash.use('scrypt').make(documentoNormalizado)
        // NO marcar cambio obligatorio para acudientes
        usuario.debeCambiarContrasena = false
        await usuario.save()

        const usuarioRecargado = await Usuario.findOrFail(usuario.id)
        usuario = usuarioRecargado
        ok = true
      }
    }

    if (!ok) {
      const debug = app.inProduction
        ? undefined
        : {
            hashLength: usuario.contrasenaHash?.length,
            hashPrefix: usuario.contrasenaHash?.slice(0, 25),
            usuarioId: usuario.id,
            contrasenaLength: contrasena.length,
            contrasenaNormalizedLength: normalize(contrasena).length,
            numeroDocumentoLength: documentoNormalizado.length,
            contrasenaLast4: normalize(contrasena).slice(-4),
            numeroDocumentoLast4: documentoNormalizado.slice(-4),
          }

      return response.unauthorized({ message: 'Contraseña incorrecta', debug })
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
        estaActivo: usuario.estaActivo,
        debeCambiarContrasena: usuario.debeCambiarContrasena,
      },
    })
  }

  async logout({ response }: HttpContext) {
    return response.ok({ message: 'Logout exitoso' })
  }

  async index({ response }: HttpContext) {
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

  async show({ params, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const rawId = String(params.id)
    let targetId: number | null = null

    if (rawId.toLowerCase() === 'me') {
      if (!usuario) return response.unauthorized({ message: 'No autenticado' })
      const me = await Acudiente.query().where('usuario_id', usuario.id).first()
      if (!me) return response.notFound({ message: 'Acudiente no encontrado para este usuario' })
      targetId = me.id
    } else {
      const n = Number(rawId)
      if (Number.isNaN(n)) return response.badRequest({ message: 'acudienteId inválido' })
      targetId = n
    }

    if (usuario) {
      const ok = await this.docentePuedeAccederAcudiente(usuario, targetId)
      if (!ok) {
        return response.forbidden({ message: 'Acceso denegado' })
      }
    }

    const acudiente = await Acudiente.find(targetId)
    if (!acudiente) {
      return response.notFound({ message: 'Acudiente no encontrado' })
    }

    return response.ok(acudiente)
  }

  async store({ request, response }: HttpContext) {
    const telefono = String(request.input('telefono') ?? '').trim()
    const numeroDocumento = String(request.input('numeroDocumento') ?? request.input('numero_documento') ?? '').trim()

    const payload = {
      nombres: request.input('nombres'),
      apellidos: request.input('apellidos'),
      tipoDocumento: request.input('tipoDocumento') ?? request.input('tipo_documento'),
      numeroDocumento,
      telefono,
      telefonoAlternativo: request.input('telefonoAlternativo') ?? request.input('telefono_alternativo'),
      correo: request.input('correo'),
      direccion: request.input('direccion'),
      parentesco: request.input('parentesco'),
      ocupacion: request.input('ocupacion'),
      tipoTrabajo: request.input('tipoTrabajo') ?? request.input('tipo_trabajo'),
      nivelEducativo: request.input('nivelEducativo') ?? request.input('nivel_educativo'),
      aportaEconomia: request.input('aportaEconomia') ?? request.input('aporta_economia'),
      horarioTrabajo: request.input('horarioTrabajo') ?? request.input('horario_trabajo'),
    }

    if (!telefono || !numeroDocumento) {
      return response.badRequest({ message: 'telefono y numeroDocumento son requeridos' })
    }

    const acudienteExistentePorTelefono = await Acudiente.query().where('telefono', telefono).first()
    if (acudienteExistentePorTelefono) {
      return response.conflict({ message: 'Este usuario ya existe: el telefono ya está registrado' })
    }

    const acudienteExistentePorDocumento = await Acudiente.query().where('numero_documento', numeroDocumento).first()
    if (acudienteExistentePorDocumento) {
      return response.conflict({ message: 'Este usuario ya existe: el numero de documento ya está registrado' })
    }

    const rolAcudiente = await Role.query().whereILike('nombre', 'acudiente').first()
    if (!rolAcudiente) {
      return response.badRequest({ message: 'No existe el rol acudiente' })
    }

    const usuarioExistente = await Usuario.query().where('correo', telefono).first()
    if (usuarioExistente) {
      return response.conflict({ message: 'Ya existe un usuario con ese telefono (correo)' })
    }

    // Validar jerarquía: si se proporciona institucionId, debe existir un rector
    const institucionId = request.input('institucionId') ?? request.input('institucion_id')
    if (institucionId) {
      const tieneRector = await Funcionario.query()
        .where('institucion_id', institucionId)
        .where('rol_id', 2)
        .first()

      if (!tieneRector) {
        return response.status(400).json({
          success: false,
          message: 'Debe crear primero un rector para la institución antes de asignar acudientes',
        })
      }
    }

    const usuario = await Usuario.create({
      correo: telefono,
      contrasenaHash: numeroDocumento,
      estaActivo: true,
      debeCambiarContrasena: true,
      rolId: rolAcudiente.id,
    })

    const ok = await hash.verify(usuario.contrasenaHash, numeroDocumento)
    if (!ok) {
      const debug = app.inProduction
        ? undefined
        : {
            hashLength: usuario.contrasenaHash?.length,
            hashPrefix: usuario.contrasenaHash?.slice(0, 25),
            telefono,
            numeroDocumentoLength: numeroDocumento.length,
          }

      return response.internalServerError({
        message: 'Error verificando contraseña generada (posible truncamiento en BD)',
        debug,
      })
    }

    const acudiente = await Acudiente.create({
      ...payload,
      usuarioId: usuario.id,
    })

    return response.created({ acudiente, usuario: { id: usuario.id, correo: usuario.correo } })
  }

  async update({ params, request, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const rawId = String(params.id)
    let targetId: number | null = null
    if (rawId.toLowerCase() === 'me') {
      if (!usuario) return response.unauthorized({ message: 'No autenticado' })
      const me = await Acudiente.query().where('usuario_id', usuario.id).first()
      if (!me) return response.notFound({ message: 'Acudiente no encontrado para este usuario' })
      targetId = me.id
    } else {
      const n = Number(rawId)
      if (Number.isNaN(n)) return response.badRequest({ message: 'acudienteId inválido' })
      targetId = n
    }

    if (usuario) {
      const ok = await this.docentePuedeAccederAcudiente(usuario, targetId)
      if (!ok) {
        return response.forbidden({ message: 'Acceso denegado' })
      }
    }

    const acudiente = await Acudiente.find(targetId)
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

    return response.ok(acudiente)
  }

  async destroy({ params, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const rawId = String(params.id)
    let targetId: number | null = null
    if (rawId.toLowerCase() === 'me') {
      if (!usuario) return response.unauthorized({ message: 'No autenticado' })
      const me = await Acudiente.query().where('usuario_id', usuario.id).first()
      if (!me) return response.notFound({ message: 'Acudiente no encontrado para este usuario' })
      targetId = me.id
    } else {
      const n = Number(rawId)
      if (Number.isNaN(n)) return response.badRequest({ message: 'acudienteId inválido' })
      targetId = n
    }

    if (usuario) {
      const ok = await this.docentePuedeAccederAcudiente(usuario, targetId)
      if (!ok) {
        return response.forbidden({ message: 'Acceso denegado' })
      }
    }

    const acudiente = await Acudiente.find(targetId)
    if (!acudiente) {
      return response.notFound({ message: 'Acudiente no encontrado' })
    }

    await acudiente.delete()
    return response.ok({ message: 'Acudiente eliminado' })
  }
}
