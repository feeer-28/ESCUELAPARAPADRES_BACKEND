
import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import hash from '@adonisjs/core/services/hash'
import db from '@adonisjs/lucid/services/db'
import jwt from 'jsonwebtoken'

import Curso from '#models/curso'
import Docente from '#models/docente'
import Role from '#models/role'
import Usuario from '#models/usuario'
import env from '#start/env'

export default class DocenteController {
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

    if (!correo || !contrasena || !telefono || !numeroDocumento) {
      return response.badRequest({ message: 'correo, contrasena, telefono y numeroDocumento son requeridos' })
    }

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

    const result = await db.transaction(async (trx) => {
      const usuario = await Usuario.create(
        {
          correo,
          contrasenaHash: contrasena,
          estaActivo: true,
          debeCambiarContrasena: true,
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
}
