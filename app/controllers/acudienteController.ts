import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import jwt from 'jsonwebtoken'

import Acudiente from '#models/acudiente'
import Asignacion from '#models/asignacion'
import Docente from '#models/docente'
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
    const telefono = String(request.input('telefono') ?? '').trim()
    const numeroDocumento = String(
      request.input('numeroDocumento') ?? request.input('numero_documento') ?? ''
    ).trim()

    if (!telefono || !numeroDocumento) {
      return response.badRequest({ message: 'telefono y numeroDocumento son requeridos' })
    }

    const acudiente = await Acudiente.query()
      .where('telefono', telefono)
      .andWhere('numero_documento', numeroDocumento)
      .first()

    if (!acudiente) {
      return response.notFound({ message: 'Acudiente no encontrado con esos datos' })
    }

    const usuario = await Usuario.find(acudiente.usuarioId)
    if (!usuario) {
      return response.notFound({ message: 'Usuario no encontrado para este acudiente' })
    }

    const plainPassword = numeroDocumento
    usuario.contrasenaHash = plainPassword
    usuario.debeCambiarContrasena = true
    await usuario.save()

    const usuarioRecargado = await Usuario.findOrFail(usuario.id)
    const verifyAfterSave = await hash.verify(usuarioRecargado.contrasenaHash, numeroDocumento)

    const debug = app.inProduction
      ? undefined
      : {
          verifyAfterSave,
          hashLength: usuarioRecargado.contrasenaHash?.length,
          hashPrefix: usuarioRecargado.contrasenaHash?.slice(0, 25),
          hashSuffix: usuarioRecargado.contrasenaHash?.slice(-10),
          plainPasswordLength: plainPassword.length,
          telefono,
          numeroDocumentoLength: numeroDocumento.length,
        }

    if (!verifyAfterSave) {
      return response.internalServerError({
        message: 'Reset ejecutado pero la verificación falló (posible dato diferente o problema de persistencia)',
        debug,
      })
    }

    return response.ok({ message: 'Contraseña reseteada', correo: usuarioRecargado.correo, debug })
  }

  async login({ request, response }: HttpContext) {
    const correo = String(request.input('correo') ?? '').trim()
    const contrasena = String(request.input('contrasena') ?? '').trim()

    if (!correo || !contrasena) {
      return response.badRequest({ message: 'correo y contrasena son requeridos' })
    }

    const normalize = (value: string) => value.replace(/\D+/g, '')

    let usuario: Usuario | null = null
    let foundBy: 'acudiente.telefono' | 'usuario.correo' | null = null

    const acudientes = await Acudiente.query().where('telefono', correo)
    const acudiente = acudientes.length === 1 ? acudientes[0] : null

    if (acudientes.length > 1) {
      const debug = app.inProduction
        ? undefined
        : {
            telefono: correo,
            coincidencias: acudientes.map((a) => ({
              acudienteId: a.id,
              usuarioId: a.usuarioId,
              numeroDocumentoLength: a.numeroDocumento?.length,
              numeroDocumentoLast4: a.numeroDocumento ? normalize(a.numeroDocumento).slice(-4) : undefined,
            })),
          }

      return response.conflict({
        message: 'Hay más de un acudiente con el mismo telefono. Debes corregir datos duplicados.',
        debug,
      })
    }

    if (acudiente) {
      usuario = await Usuario.find(acudiente.usuarioId)
      foundBy = 'acudiente.telefono'
    }

    if (!usuario) {
      usuario = await Usuario.query().where('correo', correo).first()
      foundBy = usuario ? 'usuario.correo' : null
    }

    if (!usuario) {
      return response.unauthorized({ message: 'Usuario no existe' })
    }

    let ok = await hash.verify(usuario.contrasenaHash, contrasena)

    let matchesDocumento: boolean | undefined = undefined
    let verifyAfterRehash: boolean | undefined = undefined

    if (!ok && acudiente && foundBy === 'acudiente.telefono') {
      matchesDocumento = normalize(contrasena) === normalize(acudiente.numeroDocumento)

      if (matchesDocumento) {
        usuario.contrasenaHash = acudiente.numeroDocumento
        usuario.debeCambiarContrasena = true
        await usuario.save()

        const usuarioRecargado = await Usuario.findOrFail(usuario.id)
        usuario = usuarioRecargado
        verifyAfterRehash = await hash.verify(usuario.contrasenaHash, acudiente.numeroDocumento)
        ok = verifyAfterRehash

        if (verifyAfterRehash === false) {
          const debug = app.inProduction
            ? undefined
            : {
                foundBy,
                usuarioId: usuario.id,
                verifyAfterRehash,
                matchesDocumento,
                hashLength: usuario.contrasenaHash?.length,
                hashPrefix: usuario.contrasenaHash?.slice(0, 25),
                hashSuffix: usuario.contrasenaHash?.slice(-10),
              }

          return response.internalServerError({
            message: 'La verificación falló incluso después de sincronizar la contraseña. Revisar datos en BD.',
            debug,
          })
        }
      }
    }

    if (!ok) {
      const debug = app.inProduction
        ? undefined
        : {
            hashLength: usuario.contrasenaHash?.length,
            hashPrefix: usuario.contrasenaHash?.slice(0, 25),
            foundBy,
            usuarioId: usuario.id,
            contrasenaLength: contrasena.length,
            contrasenaNormalizedLength: normalize(contrasena).length,
            numeroDocumentoLength: acudiente?.numeroDocumento?.length,
            numeroDocumentoNormalizedLength: acudiente?.numeroDocumento ? normalize(acudiente.numeroDocumento).length : undefined,
            matchesDocumento,
            contrasenaLast4: normalize(contrasena).slice(-4),
            numeroDocumentoLast4: acudiente?.numeroDocumento ? normalize(acudiente.numeroDocumento).slice(-4) : undefined,
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
