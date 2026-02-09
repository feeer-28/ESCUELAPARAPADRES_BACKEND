import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import hash from '@adonisjs/core/services/hash'
import Funcionario from '#models/funcionario'
import Role from '#models/role'
import Usuario from '#models/usuario'
import { DateTime } from 'luxon'

export default class OrientadorController {
  private async userEsOrientador(jwtUser: any): Promise<boolean> {
    if (!jwtUser) return false
    const rol = await Role.find(jwtUser.rolId)
    return (rol?.nombre ?? '').toLowerCase() === 'orientador'
  }

  private async getOrientadorRoleId(): Promise<number | null> {
    const rol = await Role.query().whereRaw('LOWER(nombre) = ?', ['orientador']).first()
    return rol?.id ?? null
  }

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
      .leftJoin('roles as r', 'f.rol_id', 'r.id')
      .whereRaw('LOWER(r.nombre) = ?', ['orientador'])
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
      .leftJoin('roles as r', 'f.rol_id', 'r.id')
      .where('f.id', params.id)
      .whereRaw('LOWER(r.nombre) = ?', ['orientador'])
      .select(
        'f.id',
        'f.rol_id as rolId',
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

    const rol = await Role.find(orientador.rolId)
    if ((rol?.nombre ?? '').toLowerCase() !== 'orientador') {
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

    // Validar que exista rector en la institución antes de crear orientador
    if (institucionId) {
      const tieneRector = await Funcionario.query()
        .where('institucion_id', institucionId)
        .where('rol_id', 2)
        .first()

      if (!tieneRector) {
        return response.status(400).json({
          success: false,
          message: 'Debe crear primero un rector para la institución antes de asignar orientadores',
        })
      }
    }

    const orientadorRolId = await this.getOrientadorRoleId()
    if (!orientadorRolId) {
      return response.internalServerError({
        success: false,
        message: 'No existe el rol orientador en la tabla roles',
      })
    }

    // Generar contraseña: usar la enviada o generar temporal
    const passwordFinal = contrasena || `Orient${new Date().getFullYear()}!`
    const usaPasswordTemporal = !contrasena
    const contrasenaHash = await hash.make(passwordFinal)

    // Crear usuario
    const usuario = await Usuario.create({
      correo: email,
      contrasenaHash,
      rolId: orientadorRolId,
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
      rolId: orientadorRolId,
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
      .first()

    if (!orientador) {
      return response.notFound({ success: false, message: 'Orientador no encontrado' })
    }

    const rol = await Role.find(orientador.rolId)
    if ((rol?.nombre ?? '').toLowerCase() !== 'orientador') {
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
      .first()

    if (!orientador) {
      return response.notFound({ success: false, message: 'Orientador no encontrado' })
    }

    const rol = await Role.find(orientador.rolId)
    if ((rol?.nombre ?? '').toLowerCase() !== 'orientador') {
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

  /**
   * Listar acudientes/padres de familia de la institución
   * GET /orientadores/acudientes
   */
  async listarAcudientes({ response, jwtUser }: HttpContext) {
    try {
      const esOrientador = await this.userEsOrientador(jwtUser)
      if (!esOrientador) {
        return response.forbidden({
          success: false,
          message: 'No autorizado: el usuario no es orientador',
        })
      }

      // Obtener la institución del orientador
      const orientador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = orientador.institucionId
      if (!institucionId) {
        return response.badRequest({
          success: false,
          message: 'El orientador no tiene institución asociada',
        })
      }

      // Obtener acudientes de la institución con sus estudiantes vinculados
      const acudientes = await db
        .from('acudientes as a')
        .join('estudiante_acudiente as ea', 'a.id', 'ea.acudiente_id')
        .join('estudiantes as e', 'ea.estudiante_id', 'e.id')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('c.institucion_id', institucionId)
        .select(
          'a.id',
          'a.nombres',
          'a.apellidos',
          'a.numero_documento',
          'a.tipo_documento',
          'a.telefono',
          'a.correo',
          'a.direccion',
          'a.ocupacion',
          'a.parentesco'
        )
        .groupBy(
          'a.id',
          'a.nombres',
          'a.apellidos',
          'a.numero_documento',
          'a.tipo_documento',
          'a.telefono',
          'a.correo',
          'a.direccion',
          'a.ocupacion',
          'a.parentesco'
        )

      // Obtener estudiantes vinculados para cada acudiente
      const acudientesConEstudiantes = await Promise.all(
        acudientes.map(async (acudiente) => {
          const estudiantes = await db
            .from('estudiantes as e')
            .join('estudiante_acudiente as ea', 'e.id', 'ea.estudiante_id')
            .join('cursos as c', 'e.curso_id', 'c.id')
            .where('ea.acudiente_id', acudiente.id)
            .where('c.institucion_id', institucionId)
            .select('e.id', 'e.nombres', 'e.apellidos', 'c.nombre as curso')

          return {
            id: acudiente.id,
            nombres: acudiente.nombres,
            apellidos: acudiente.apellidos,
            numeroDocumento: acudiente.numero_documento,
            tipoDocumento: acudiente.tipo_documento,
            telefono: acudiente.telefono,
            correo: acudiente.correo,
            direccion: acudiente.direccion,
            ocupacion: acudiente.ocupacion,
            parentesco: acudiente.parentesco,
            estudiantesVinculados: estudiantes.map((est) => ({
              id: est.id,
              nombres: est.nombres,
              apellidos: est.apellidos,
              curso: est.curso,
            })),
            totalEstudiantes: estudiantes.length,
          }
        })
      )

      return response.status(200).json({
        success: true,
        data: acudientesConEstudiantes,
        total: acudientesConEstudiantes.length,
      })
    } catch (error) {
      if ((error as any)?.code === 'E_ROW_NOT_FOUND') {
        return response.forbidden({
          success: false,
          message: 'No autorizado: el usuario no es orientador o no tiene registro de funcionario',
        })
      }
      console.error('Error al listar acudientes:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar acudientes',
        error: error.message,
      })
    }
  }

  async listarAcudientesInstitucion({ response, jwtUser }: HttpContext) {
    try {
      const esOrientador = await this.userEsOrientador(jwtUser)
      if (!esOrientador) {
        return response.forbidden({
          success: false,
          message: 'No autorizado: el usuario no es orientador',
        })
      }

      const orientador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = orientador.institucionId
      if (!institucionId) {
        return response.badRequest({
          success: false,
          message: 'El orientador no tiene institución asociada',
        })
      }

      const acudientes = await db
        .from('acudientes as a')
        .join('estudiante_acudiente as ea', 'a.id', 'ea.acudiente_id')
        .join('estudiantes as e', 'ea.estudiante_id', 'e.id')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('c.institucion_id', institucionId)
        .select(
          'a.id',
          'a.nombres',
          'a.apellidos',
          'a.numero_documento',
          'a.tipo_documento',
          'a.telefono',
          'a.correo',
          'a.direccion',
          'a.ocupacion',
          'a.parentesco'
        )
        .groupBy(
          'a.id',
          'a.nombres',
          'a.apellidos',
          'a.numero_documento',
          'a.tipo_documento',
          'a.telefono',
          'a.correo',
          'a.direccion',
          'a.ocupacion',
          'a.parentesco'
        )
        .orderBy('a.nombres')

      return response.ok({ success: true, data: acudientes, total: acudientes.length })
    } catch (error) {
      if ((error as any)?.code === 'E_ROW_NOT_FOUND') {
        return response.forbidden({
          success: false,
          message: 'No autorizado: el usuario no es orientador o no tiene registro de funcionario',
        })
      }
      console.error('Error al listar acudientes por institución:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar acudientes por institución',
        error: error.message,
      })
    }
  }

  async listarEstudiantesPorAcudiente({ params, response, jwtUser }: HttpContext) {
    try {
      const esOrientador = await this.userEsOrientador(jwtUser)
      if (!esOrientador) {
        return response.forbidden({
          success: false,
          message: 'No autorizado: el usuario no es orientador',
        })
      }

      const orientador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = orientador.institucionId
      if (!institucionId) {
        return response.badRequest({
          success: false,
          message: 'El orientador no tiene institución asociada',
        })
      }
      const acudienteId = Number(params.acudienteId ?? params.id)
      if (Number.isNaN(acudienteId)) {
        return response.badRequest({ success: false, message: 'acudienteId inválido' })
      }

      const estudiantes = await db
        .from('estudiantes as e')
        .join('estudiante_acudiente as ea', 'e.id', 'ea.estudiante_id')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('ea.acudiente_id', acudienteId)
        .where('c.institucion_id', institucionId)
        .select(
          'e.id',
          'e.nombres',
          'e.apellidos',
          'e.numero_documento',
          'e.tipo_documento',
          'e.curso_id',
          'c.nombre as curso',
          'c.grado_id'
        )
        .orderBy('e.nombres')

      return response.ok({ success: true, data: estudiantes, total: estudiantes.length })
    } catch (error) {
      if ((error as any)?.code === 'E_ROW_NOT_FOUND') {
        return response.forbidden({
          success: false,
          message: 'No autorizado: el usuario no es orientador o no tiene registro de funcionario',
        })
      }
      console.error('Error al listar estudiantes por acudiente:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar estudiantes por acudiente',
        error: error.message,
      })
    }
  }

  async listarEstudiantesInstitucion({ response, jwtUser }: HttpContext) {
    try {
      const esOrientador = await this.userEsOrientador(jwtUser)
      if (!esOrientador) {
        return response.forbidden({
          success: false,
          message: 'No autorizado: el usuario no es orientador',
        })
      }

      const orientador = await Funcionario.query().where('usuario_id', jwtUser!.id).firstOrFail()
      const institucionId = orientador.institucionId
      if (!institucionId) {
        return response.badRequest({
          success: false,
          message: 'El orientador no tiene institución asociada',
        })
      }

      const estudiantes = await db
        .from('estudiantes as e')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('c.institucion_id', institucionId)
        .select('e.*', 'c.nombre as curso', 'c.grado_id as grado_id')
        .orderBy('e.nombres')

      return response.ok({ success: true, data: estudiantes, total: estudiantes.length })
    } catch (error) {
      if ((error as any)?.code === 'E_ROW_NOT_FOUND') {
        return response.forbidden({
          success: false,
          message: 'No autorizado: el usuario no es orientador o no tiene registro de funcionario',
        })
      }

      console.error('Error al listar estudiantes por institución:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar estudiantes por institución',
        error: error.message,
      })
    }
  }
}
