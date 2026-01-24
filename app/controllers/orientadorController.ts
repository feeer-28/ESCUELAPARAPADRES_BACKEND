import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import Funcionario from '#models/funcionario'
import Usuario from '#models/usuario'
import { DateTime } from 'luxon'

export default class OrientadorController {
  /**
   * Listar orientadores de la institución
   * GET /orientadores
   */
  async index({ response, jwtUser }: HttpContext) {
    // Obtener institución del usuario logueado
    let institucionId: number | null = null

    if (jwtUser) {
      const funcionario = await Funcionario.query().where('usuario_id', jwtUser.id).first()
      institucionId = funcionario?.institucionId || null
    }

    const query = db
      .from('funcionarios as f')
      .leftJoin('usuarios as u', 'f.usuario_id', 'u.id')
      .where('f.rol_id', 4) // rolId 4 = orientador
      .whereNull('f.eliminado_en')
      .select(
        'f.id',
        'f.nombre as firstName',
        'f.apellido as lastName',
        'u.correo as email',
        'f.telefono as phone',
        'u.esta_activo as activo',
        'u.debe_cambiar_contrasena as mustChangePassword',
        'u.ultimo_ingreso as ultimoIngreso'
      )

    if (institucionId) {
      query.where('f.institucion_id', institucionId)
    }

    const orientadores = await query.orderBy('f.nombre')

    return response.ok({ success: true, data: orientadores })
  }

  /**
   * Obtener detalle de un orientador
   * GET /orientadores/:id
   */
  async show({ params, response }: HttpContext) {
    const orientador = await db
      .from('funcionarios as f')
      .leftJoin('usuarios as u', 'f.usuario_id', 'u.id')
      .where('f.id', params.id)
      .where('f.rol_id', 4)
      .select(
        'f.id',
        'f.nombre as firstName',
        'f.apellido as lastName',
        'u.correo as email',
        'f.telefono as phone',
        'f.direccion as address',
        'f.correo_institucional',
        'u.esta_activo as activo',
        'f.institucion_id'
      )
      .first()

    if (!orientador) {
      return response.notFound({ success: false, message: 'Orientador no encontrado' })
    }

    return response.ok({ success: true, data: orientador })
  }

  /**
   * Crear un nuevo orientador
   * POST /orientadores
   */
  async store({ request, response, jwtUser }: HttpContext) {
    const {
      firstName,
      lastName,
      // tipoDocumento y documento se reciben pero no se usan actualmente
      email,
      phone,
      address,
      contrasena, // Opcional: si no se envía, se genera una temporal
    } = request.only([
      'firstName',
      'lastName',
      'tipoDocumento',
      'documento',
      'email',
      'phone',
      'address',
      'contrasena',
    ])

    // Validaciones básicas
    if (!firstName || !lastName || !email || !phone) {
      return response.badRequest({
        success: false,
        message: 'Campos requeridos: firstName, lastName, email, phone',
      })
    }

    // Verificar email único
    const existeEmail = await Usuario.query().where('correo', email).first()
    if (existeEmail) {
      return response.conflict({ success: false, message: 'El correo ya está registrado' })
    }

    // Obtener institución del coordinador/rector
    let institucionId: number | null = null
    if (jwtUser) {
      const funcionario = await Funcionario.query().where('usuario_id', jwtUser.id).first()
      institucionId = funcionario?.institucionId || null
    }

    // Generar contraseña: usar la enviada o generar temporal
    const passwordFinal = contrasena || `Orient${new Date().getFullYear()}!`
    const usaPasswordTemporal = !contrasena
    const contrasenaHash = await hash.make(passwordFinal)

    // Crear usuario
    const usuario = await Usuario.create({
      correo: email,
      contrasenaHash,
      rolId: 4, // Orientador
      estaActivo: true,
      debeCambiarContrasena: usaPasswordTemporal, // Solo debe cambiar si es temporal
    })

    // Crear funcionario (orientador)
    const orientador = await Funcionario.create({
      nombre: firstName,
      apellido: lastName,
      telefono: phone,
      direccion: address,
      correoInstitucional: email,
      rolId: 4,
      usuarioId: usuario.id,
      institucionId,
    })

    return response.created({
      success: true,
      message: usaPasswordTemporal 
        ? 'Orientador registrado. Credenciales temporales generadas.' 
        : 'Orientador registrado con contraseña personalizada.',
      data: {
        id: orientador.id,
        email,
        passwordTemporal: usaPasswordTemporal ? passwordFinal : undefined,
        debeCambiarContrasena: usaPasswordTemporal,
      },
    })
  }

  /**
   * Actualizar orientador
   * PUT /orientadores/:id
   */
  async update({ params, request, response }: HttpContext) {
    const orientador = await Funcionario.query()
      .where('id', params.id)
      .where('rol_id', 4)
      .first()

    if (!orientador) {
      return response.notFound({ success: false, message: 'Orientador no encontrado' })
    }

    const { firstName, lastName, phone, address } = request.only([
      'firstName',
      'lastName',
      'phone',
      'address',
    ])

    if (firstName) orientador.nombre = firstName
    if (lastName) orientador.apellido = lastName
    if (phone) orientador.telefono = phone
    if (address) orientador.direccion = address

    await orientador.save()

    return response.ok({ success: true, message: 'Orientador actualizado correctamente' })
  }

  /**
   * Desactivar orientador (soft delete)
   * DELETE /orientadores/:id
   */
  async destroy({ params, response }: HttpContext) {
    const orientador = await Funcionario.query()
      .where('id', params.id)
      .where('rol_id', 4)
      .first()

    if (!orientador) {
      return response.notFound({ success: false, message: 'Orientador no encontrado' })
    }

    // Soft delete funcionario
    orientador.eliminadoEn = DateTime.now()
    await orientador.save()

    // Desactivar usuario
    if (orientador.usuarioId) {
      await Usuario.query().where('id', orientador.usuarioId).update({ esta_activo: false })
    }

    return response.ok({ success: true, message: 'Orientador desactivado correctamente' })
  }
}
