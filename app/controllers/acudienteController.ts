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

    console.log('=== LOGIN ACUDIENTE DEBUG ===')
    console.log('📧 Correo/número documento recibido:', numeroDocumento)
    console.log('🔐 Contraseña recibida:', contrasena)
    console.log('🔑 Longitud contraseña:', contrasena.length)

    if (!numeroDocumento || !contrasena) {
      return response.badRequest({ message: 'numeroDocumento y contrasena son requeridos' })
    }

    const normalize = (value: string) => value.replace(/\D+/g, '')
    const documentoNormalizado = normalize(numeroDocumento)
    console.log('📋 Documento normalizado:', documentoNormalizado)
    console.log('📋 Longitud documento normalizado:', documentoNormalizado.length)

    // 🔥 DETECTAR SI ES CELULAR O DOCUMENTO
    let acudiente = null
    const esCelular = documentoNormalizado.length === 10 // Celular colombiano tiene 10 dígitos
    
    if (esCelular) {
      // Buscar por celular
      console.log('📱 Buscando por celular:', documentoNormalizado)
      acudiente = await Acudiente.query().where('telefono', documentoNormalizado).first()
    } else {
      // Buscar por documento
      console.log('📄 Buscando por documento:', documentoNormalizado)
      const acudientes = await Acudiente.query().where('numero_documento', documentoNormalizado)
      acudiente = acudientes.length === 1 ? acudientes[0] : null
    }

    if (!acudiente) {
      return response.unauthorized({ 
        message: esCelular ? 'Celular no encontrado' : 'Número de documento no encontrado' 
      })
    }

    let usuario = await Usuario.find(acudiente.usuarioId)
    
    if (!usuario) {
      return response.unauthorized({ message: 'Usuario no encontrado' })
    }

    let ok = await hash.use('scrypt').verify(usuario.contrasenaHash, contrasena)
    
    console.log('👤 Usuario encontrado:', !!usuario)
    console.log('📋 ID usuario:', usuario?.id)
    console.log('📧 Correo guardado:', usuario?.correo)
    console.log('🔐 Hash guardado:', usuario?.contrasenaHash?.slice(0, 50) + '...')
    console.log('✅ ¿Está activo?:', usuario?.estaActivo)
    console.log('🎭 Rol ID:', usuario?.rolId)
    console.log('🔍 Verificando contraseña...')
    console.log('✅ ¿Contraseña válida (hash)?:', ok)

    // Si la contraseña no coincide, verificar si está usando su documento como contraseña (primera vez)
    if (!ok) {
      const matchesDocumento = normalize(contrasena) === documentoNormalizado
      console.log('📋 ¿Contraseña coincide con documento normalizado?:', matchesDocumento)
      console.log('📋 Contraseña normalizada:', normalize(contrasena))
      console.log('📋 Documento normalizado:', documentoNormalizado)

      if (matchesDocumento) {
        // Primera vez que ingresa - hashear el documento como contraseña
        usuario.contrasenaHash = await hash.use('scrypt').make(documentoNormalizado)
        // NO marcar cambio obligatorio para acudientes
        usuario.debeCambiarContrasena = false
        await usuario.save()

        const usuarioRecargado = await Usuario.findOrFail(usuario.id)
        usuario = usuarioRecargado
        ok = true
        console.log('✅ Contraseña actualizada al documento normalizado')
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

  /**
   * Carga masiva de acudientes con vinculación a estudiantes
   * POST /acudientes/carga-masiva
   */
  async cargaMasiva({ request, response }: HttpContext) {
    console.log('=== DEBUG CARGA MASIVA ACUDIENTES ===')
    
    try {
      const archivo = request.file('archivo', {
        size: '10mb',
        extnames: ['xlsx', 'xls', 'csv']
      })

      if (!archivo) {
        return response.badRequest({
          success: false,
          message: 'Se requiere un archivo Excel o CSV'
        })
      }

      if (!archivo.isValid) {
        return response.badRequest({
          success: false,
          message: 'Archivo no válido',
          errors: archivo.errors
        })
      }

      // Mover archivo temporal
      const uploadsPath = app.makePath('uploads')
      const fileName = `acudientes_${Date.now()}.${archivo.extname}`
      await archivo.move(uploadsPath, { name: fileName })

      // Leer archivo Excel/CSV
      const xlsx = await import('xlsx')
      const filePath = app.makePath('uploads', fileName)
      const workbook = xlsx.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const datos = xlsx.utils.sheet_to_json(worksheet)

      console.log('📋 Registros encontrados:', datos.length)

      const resultados = {
        procesados: 0,
        exitosos: 0,
        errores: [] as Array<{ fila: number, error: string, datos: any }>
      }

      // Procesar cada fila
      for (let i = 0; i < datos.length; i++) {
        const fila = i + 2 // Excel empieza en fila 2
        const registro = datos[i] as any
        resultados.procesados++

        try {
          // 🔥 MAPEAR COLUMNAS DEL EXCEL A VARIABLES DEL SISTEMA
          const datosMapeados = {
            // Datos del acudiente
            acudiente_tipo_documento: registro['TIPO DOCUMENTO ACUDIENTE'] || registro['acudiente_tipo_documento'] || 'CC',
            acudiente_numero_documento: registro['DOCUMENTO ACUDIENTE'] || registro['acudiente_numero_documento'],
            acudiente_nombres: registro['NOMBRE ACUDIENTE'] || registro['acudiente_nombres'],
            acudiente_apellidos: registro['APELLIDO ACUDIENTE'] || registro['acudiente_apellidos'],
            acudiente_correo: registro['CORREO ACUDIENTE'] || registro['acudiente_correo'],
            acudiente_celular: registro['TELEFONO ACUDIENTE'] || registro['acudiente_celular'],
            acudiente_parentesco: registro['PARENTESCO'] || registro['acudiente_parentesco'] || 'Padre',
            
            // Datos del estudiante
            estudiante_tipo_documento: registro['TIPO DOCUMENTO ESTUDIANTE'] || registro['estudiante_tipo_documento'] || 'TI',
            estudiante_documento: registro['DOCUMENTO ESTUDIANTE'] || registro['estudiante_documento'],
            estudiante_nombres: registro['NOMBRE ESTUDIANTE'] || registro['estudiante_nombres'],
            estudiante_apellidos: registro['APELLIDO ESTUDIANTE'] || registro['estudiante_apellidos'],
            estudiante_fecha_nacimiento: registro['FECHA NACIMIENTO'] || registro['estudiante_fecha_nacimiento'],
            estudiante_sexo: registro['GENERO'] || registro['estudiante_sexo'] || 'M',
            estudiante_grado: registro['GRADO'] || registro['estudiante_grado'],
            estudiante_curso: registro['CURSO'] || registro['estudiante_curso']
          }

          console.log('📋 Datos mapeados:', datosMapeados)

          // Validar campos requeridos
          if (!datosMapeados.acudiente_nombres || !datosMapeados.acudiente_apellidos || 
              !datosMapeados.acudiente_numero_documento || !datosMapeados.acudiente_celular ||
              !datosMapeados.estudiante_documento || !datosMapeados.estudiante_nombres || 
              !datosMapeados.estudiante_apellidos || !datosMapeados.estudiante_curso) {
            resultados.errores.push({
              fila,
              error: 'Faltan campos requeridos (nombres, apellidos, documentos, teléfono, curso)',
              datos: datosMapeados
            })
            continue
          }

          // Verificar si el acudiente ya existe
          const acudienteExistente = await Acudiente.query()
            .where('numero_documento', datosMapeados.acudiente_numero_documento)
            .first()

          let acudiente: Acudiente

          if (acudienteExistente) {
            // Actualizar acudiente existente
            acudiente = acudienteExistente
            acudiente.nombres = datosMapeados.acudiente_nombres
            acudiente.apellidos = datosMapeados.acudiente_apellidos
            acudiente.tipoDocumento = datosMapeados.acudiente_tipo_documento
            acudiente.telefono = datosMapeados.acudiente_celular
            acudiente.correo = datosMapeados.acudiente_correo
            acudiente.parentesco = datosMapeados.acudiente_parentesco
            await acudiente.save()
            console.log('✅ Acudiente actualizado:', acudiente.numeroDocumento)
          } else {
            // Crear nuevo acudiente
            acudiente = await Acudiente.create({
              nombres: datosMapeados.acudiente_nombres,
              apellidos: datosMapeados.acudiente_apellidos,
              tipoDocumento: datosMapeados.acudiente_tipo_documento,
              numeroDocumento: datosMapeados.acudiente_numero_documento,
              telefono: datosMapeados.acudiente_celular,
              correo: datosMapeados.acudiente_correo,
              parentesco: datosMapeados.acudiente_parentesco,
              ocupacion: null,
              direccion: null
            })

            // Crear usuario para el acudiente
            const contrasenaTemporal = datosMapeados.acudiente_numero_documento?.slice(-6) || '123456'
            const usuarioAcudiente = await Usuario.create({
              correo: datosMapeados.acudiente_correo || `${datosMapeados.acudiente_numero_documento}@acudiente.com`,
              contrasenaHash: await hash.make(contrasenaTemporal),
              rolId: 4, // Rol de acudiente
              estaActivo: true,
              debeCambiarContrasena: true
            })

            // Vincular usuario con acudiente
            acudiente.usuarioId = usuarioAcudiente.id
            await acudiente.save()

            console.log('✅ Acudiente creado:', acudiente.numeroDocumento)
          }

          // Buscar o crear el estudiante
          let estudiante = await db.from('estudiantes')
            .where('numero_documento', datosMapeados.estudiante_documento)
            .first()

          if (!estudiante) {
            // 🔥 VALIDAR QUE EXISTA EL CURSO
            if (!datosMapeados.estudiante_curso) {
              resultados.errores.push({
                fila,
                error: 'El estudiante es nuevo y requiere un curso válido',
                datos: datosMapeados
              })
              continue
            }

            // Verificar que el curso exista
            const curso = await db.from('cursos')
              .where('id', datosMapeados.estudiante_curso)
              .first()

            if (!curso) {
              resultados.errores.push({
                fila,
                error: `El curso ${datosMapeados.estudiante_curso} no existe`,
                datos: datosMapeados
              })
              continue
            }

            // Crear nuevo estudiante
            const [nuevoEstudiante] = await db.from('estudiantes')
              .insert({
                nombres: datosMapeados.estudiante_nombres,
                apellidos: datosMapeados.estudiante_apellidos,
                numero_documento: datosMapeados.estudiante_documento,
                tipo_documento: datosMapeados.estudiante_tipo_documento,
                curso_id: datosMapeados.estudiante_curso,
                fecha_nacimiento: datosMapeados.estudiante_fecha_nacimiento || new Date(),
                sexo: datosMapeados.estudiante_sexo,
                creado_en: new Date(),
                actualizado_en: new Date()
              })
              .returning('*')

            estudiante = nuevoEstudiante
            console.log('✅ Estudiante creado:', estudiante.numero_documento, 'en curso:', curso.nombre)
          } else {
            // Actualizar datos del estudiante si es necesario
            await db.from('estudiantes')
              .where('id', estudiante.id)
              .update({
                nombres: datosMapeados.estudiante_nombres || estudiante.nombres,
                apellidos: datosMapeados.estudiante_apellidos || estudiante.apellidos,
                curso_id: datosMapeados.estudiante_curso || estudiante.curso_id,
                actualizado_en: new Date()
              })

            console.log('✅ Estudiante actualizado:', estudiante.numero_documento)
          }

          // 🔥 OBTENER INSTITUCIÓN DEL ESTUDIANTE A TRAVÉS DEL CURSO
          const estudianteConInstitucion = await db.from('estudiantes as e')
            .leftJoin('cursos as c', 'e.curso_id', 'c.id')
            .select('e.*', 'c.institucion_id')
            .where('e.id', estudiante.id)
            .first()

          const institucionId = estudianteConInstitucion?.institucion_id
          console.log('🏫 Institución del estudiante:', institucionId)

          // Vincular acudiente con estudiante
          const vinculoExistente = await db.from('estudiante_acudiente')
            .where('acudiente_id', acudiente.id)
            .where('estudiante_id', estudiante.id)
            .first()

          if (!vinculoExistente) {
            await db.from('estudiante_acudiente')
              .insert({
                acudiente_id: acudiente.id,
                estudiante_id: estudiante.id,
                parentesco: datosMapeados.acudiente_parentesco || 'Padre',
                es_principal: true,
                creado_en: new Date(),
                actualizado_en: new Date()
              })

            console.log('✅ Vínculo creado:', acudiente.numeroDocumento, '->', estudiante.numero_documento)
          } else {
            console.log('ℹ️ Vínculo ya existente:', acudiente.numeroDocumento, '->', estudiante.numero_documento)
          }

          resultados.exitosos++

        } catch (error) {
          console.error('❌ Error procesando fila', fila, ':', error)
          resultados.errores.push({
            fila,
            error: error.message,
            datos: datosMapeados
          })
        }
      }

      // Limpiar archivo temporal
      await import('fs').then(fs => fs.promises.unlink(filePath))

      console.log('=== RESUMEN CARGA MASIVA ===')
      console.log('📋 Procesados:', resultados.procesados)
      console.log('✅ Exitosos:', resultados.exitosos)
      console.log('❌ Errores:', resultados.errores.length)

      return response.ok({
        success: true,
        message: 'Carga masiva procesada',
        data: resultados
      })

    } catch (error) {
      console.error('❌ Error general en carga masiva:', error)
      return response.internalServerError({
        success: false,
        message: 'Error en la carga masiva',
        error: error.message
      })
    }
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
