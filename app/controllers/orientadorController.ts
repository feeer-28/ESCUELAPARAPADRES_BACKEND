import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
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
    console.log('=== DEBUG CREAR ORIENTADOR ===')
    console.log('👤 JWT User ID:', jwtUser?.id)
    console.log('👤 JWT User Rol:', jwtUser?.rolId)
    console.log('👤 JWT User Email:', jwtUser?.correo)
    
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

    console.log('📝 Datos recibidos:', {
      firstName,
      lastName,
      email,
      phone,
      address,
      tieneContrasena: !!contrasena
    })

    // Validaciones básicas
    if (!firstName || !lastName || !email || !phone) {
      console.log('❌ Validación fallida: campos requeridos')
      return response.badRequest({
        success: false,
        message: 'Campos requeridos: firstName, lastName, email, phone',
      })
    }

    // Verificar email único
    const existeEmail = await Usuario.query().where('correo', email).first()
    if (existeEmail) {
      console.log('❌ Email ya existe:', email)
      return response.conflict({ success: false, message: 'El correo ya está registrado' })
    }

    // Obtener institución del coordinador/rector
    let institucionId: number | null = null
    let creadorNombre = 'Desconocido'
    let creadorFuncionario: any = null
    
    if (jwtUser) {
      const funcionario = await Funcionario.query()
        .where('usuario_id', jwtUser.id)
        .preload('institucion')
        .first()
      
      institucionId = funcionario?.institucionId || null
      creadorNombre = funcionario ? `${funcionario.nombre} ${funcionario.apellido}` : 'Desconocido'
      creadorFuncionario = funcionario // Guardamos la referencia para usarla después
      
      console.log('🏢 Creador encontrado:', !!funcionario)
      if (funcionario) {
        console.log('🏢 Creador ID:', funcionario.id)
        console.log('🏢 Creador Rol:', funcionario.rolId)
        console.log('🏢 Creador institucionId:', funcionario.institucionId)
        console.log('🏢 Creador nombre:', creadorNombre)
        console.log('🏢 Institución preload:', funcionario.institucion?.nombre || 'SIN INSTITUCIÓN')
      }
    }

    // Validar que exista rector en la institución antes de crear orientador
    if (institucionId) {
      const tieneRector = await Funcionario.query()
        .where('institucion_id', institucionId)
        .where('rol_id', 2)
        .first()

      console.log('👔 Verificando rector en institución:', institucionId, '→', !!tieneRector)

      if (!tieneRector) {
        console.log('❌ No hay rector en la institución')
        return response.status(400).json({
          success: false,
          message: 'Debe crear primero un rector para la institución antes de asignar orientadores',
        })
      }
    } else {
      console.log('❌ El creador no tiene institución asignada')
      return response.badRequest({
        success: false,
        message: 'El creador no tiene una institución asignada. No se puede crear el orientador.',
      })
    }

    const orientadorRolId = await this.getOrientadorRoleId()
    if (!orientadorRolId) {
      console.log('❌ No existe el rol orientador en la tabla roles')
      return response.internalServerError({
        success: false,
        message: 'No existe el rol orientador en la tabla roles',
      })
    }

    console.log('🎭 Rol orientador encontrado:', orientadorRolId)

    // Generar contraseña: usar la enviada o generar temporal
    const passwordFinal = contrasena || `Orient${new Date().getFullYear()}!`
    const usaPasswordTemporal = !contrasena

    console.log('🔐 Contraseña generada:', {
      esTemporal: usaPasswordTemporal,
      passwordLength: passwordFinal.length
    })

    // Crear usuario
    const usuario = await Usuario.create({
      correo: email,
      contrasenaHash: passwordFinal, // El modelo hashea automáticamente
      rolId: orientadorRolId,
      estaActivo: true,
      debeCambiarContrasena: usaPasswordTemporal, // Solo debe cambiar si es temporal
    })

    console.log('✅ Usuario creado:', {
      id: usuario.id,
      correo: usuario.correo,
      rolId: usuario.rolId,
      estaActivo: usuario.estaActivo,
      debeCambiarContrasena: usuario.debeCambiarContrasena
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

    console.log('🎉 ORIENTADOR CREADO CON ÉXITO:')
    console.log('👤 Orientador ID:', orientador.id)
    console.log('👤 Orientador nombre:', `${firstName} ${lastName}`)
    console.log('👤 Orientador email:', email)
    console.log('👤 Orientador teléfono:', phone)
    console.log('🏢 Institución ID:', institucionId)
    console.log('🏢 Institución nombre:', creadorFuncionario?.institucion?.nombre || 'No cargada')
    console.log('👤 Usuario ID:', usuario.id)
    console.log('👤 Creado por:', creadorNombre)
    console.log('👤 Creado por rol:', jwtUser?.rolId)
    console.log('🔐 Contraseña temporal:', usaPasswordTemporal)
    console.log('🔐 Debe cambiar contraseña:', usaPasswordTemporal)
    console.log('📅 Fecha creación:', new Date().toISOString())
    console.log('=== FIN DEBUG CREAR ORIENTADOR ===')

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
        return response.status(403).json({
          success: false,
          message: 'Solo los orientadores pueden listar estudiantes de la institución',
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

      const estudiantes = await db
        .from('estudiantes as e')
        .leftJoin('cursos as c', 'e.curso_id', 'c.id') 
        .where('c.institucion_id', institucionId)
        .select('e.*', 'c.nombre as curso', 'c.grado_id as grado_id')
        .orderBy('e.nombres')

      return response.ok({
        success: true,
        data: estudiantes,
      })
    } catch (error) {
      console.error('Error al listar estudiantes:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al listar estudiantes',
      })
    }
  }

  async listarGrados({ response, jwtUser }: HttpContext) {
    try {
      const esOrientador = await this.userEsOrientador(jwtUser)
      if (!esOrientador) {
        return response.status(403).json({
          success: false,
          message: 'Solo los orientadores pueden listar grados de su institución',
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

      const grados = await db
        .from('grados as g')
        .join('instituciones as i', 'g.institucion_id', 'i.id')
        .where('g.institucion_id', institucionId)
        .whereNull('g.eliminado_en')
        .select(
          'g.id',
          'g.nombre',
          'g.orden',
          'g.descripcion',
          'g.institucion_id'
        )
        .orderBy('g.orden')

      // Contar cursos por grado
      const gradosConCursos = await Promise.all(
        grados.map(async (grado) => {
          const totalCursos = await db
            .from('cursos')
            .where('grado_id', grado.id)
            .where('institucion_id', institucionId)
            .count('* as total')

          const totalEstudiantes = await db
            .from('estudiantes as e')
            .join('cursos as c', 'e.curso_id', 'c.id')
            .where('c.grado_id', grado.id)
            .where('c.institucion_id', institucionId)
            .count('* as total')

          return {
            ...grado,
            totalCursos: Number(totalCursos[0]?.total || 0),
            totalEstudiantes: Number(totalEstudiantes[0]?.total || 0),
          }
        })
      )

      return response.ok({
        success: true,
        data: gradosConCursos,
      })
    } catch (error) {
      console.error('Error al listar grados del orientador:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al listar grados',
      })
    }
  }

  async listarCursos({ response, jwtUser }: HttpContext) {
    try {
      const esOrientador = await this.userEsOrientador(jwtUser)
      if (!esOrientador) {
        return response.status(403).json({
          success: false,
          message: 'Solo los orientadores pueden listar cursos de su institución',
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

      const cursos = await db
        .from('cursos as c')
        .join('grados as g', 'c.grado_id', 'g.id')
        .where('c.institucion_id', institucionId)
        // .whereNull('c.eliminado_en') // 🔥 REMOVIDO - La tabla cursos no tiene este campo
        .select(
          'c.id',
          'c.nombre',
          'c.jornada',
          'c.grado_id',
          'c.institucion_id',
          'g.nombre as grado_nombre',
          'g.orden as grado_orden'
        )
        .orderBy('g.orden')
        .orderBy('c.nombre')

      // Contar estudiantes por curso
      const cursosConEstudiantes = await Promise.all(
        cursos.map(async (curso) => {
          const totalEstudiantes = await db
            .from('estudiantes')
            .where('curso_id', curso.id)
            .count('* as total')

          return {
            ...curso,
            totalEstudiantes: Number(totalEstudiantes[0]?.total || 0),
          }
        })
      )

      return response.ok({
        success: true,
        data: cursosConEstudiantes,
      })
    } catch (error) {
      console.error('Error al listar cursos del orientador:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al listar cursos',
      })
    }
  }

  async miInstitucion({ response, jwtUser }: HttpContext) {
    try {
      console.log('=== DEBUG ORIENTADOR MI INSTITUCIÓN ===')
      console.log('👤 JWT User ID:', jwtUser?.id)
      console.log('👤 JWT User Rol:', jwtUser?.rolId)
      
      const esOrientador = await this.userEsOrientador(jwtUser)
      if (!esOrientador) {
        console.log('❌ Usuario no es orientador:', jwtUser?.rolId)
        return response.status(403).json({
          success: false,
          message: 'Solo los orientadores pueden ver su institución',
        })
      }

      console.log('✅ Usuario es orientador, buscando institución...')

      const orientador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .preload('institucion', (query) => {
          query.preload('municipio', (municipioQuery) => {
            municipioQuery.preload('departamento')
          })
        })
        .firstOrFail()

      console.log('👤 Orientador encontrado:', {
        id: orientador.id,
        nombre: `${orientador.nombre} ${orientador.apellido}`,
        institucionId: orientador.institucionId
      })

      const institucion = orientador.institucion

      if (!institucion) {
        console.log('❌ Orientador sin institución asignada')
        return response.status(404).json({
          success: false,
          message: 'Institución no encontrada',
        })
      }

      console.log('🏢 Institución encontrada:', {
        id: institucion.id,
        nombre: institucion.nombre,
        municipio: institucion.municipio?.nombre
      })

      // Obtener estadísticas básicas
      const [totalGrados, totalCursos, totalEstudiantes, totalDocentes] = await Promise.all([
        db.from('grados').where('institucion_id', institucion.id).whereNull('eliminado_en').count('* as total'),
        db.from('cursos').where('institucion_id', institucion.id).count('* as total'), // 🔥 REMOVIDO eliminado_en
        db.from('estudiantes as e')
          .join('cursos as c', 'e.curso_id', 'c.id')
          .where('c.institucion_id', institucion.id)
          .count('* as total'),
        db.from('funcionarios').where('institucion_id', institucion.id).where('rol_id', 5).count('* as total'),
      ])

      const estadisticas = {
        totalGrados: Number(totalGrados[0]?.total || 0),
        totalCursos: Number(totalCursos[0]?.total || 0),
        totalEstudiantes: Number(totalEstudiantes[0]?.total || 0),
        totalDocentes: Number(totalDocentes[0]?.total || 0),
      }

      console.log('📊 Estadísticas calculadas:', estadisticas)
      console.log('=== FIN DEBUG ORIENTADOR MI INSTITUCIÓN ===')

      return response.ok({
        success: true,
        data: {
          institucion: {
            id: institucion.id,
            nombre: institucion.nombre,
            naturaleza: institucion.naturaleza,
            direccion: institucion.direccion,
            telefono: institucion.telefono,
            correo: institucion.correo,
            dane: institucion.dane,
            municipio: institucion.municipio,
            createdAt: institucion.createdAt,
          },
          estadisticas,
        },
      })
    } catch (error) {
      console.error('❌ Error al obtener institución del orientador:', error)
      return response.internalServerError({
        success: false,
        message: 'Error al obtener institución',
      })
    }
  }
}