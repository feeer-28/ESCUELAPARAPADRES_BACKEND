import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import { readFile } from 'node:fs/promises'

import Acudiente from '#models/acudiente'
import Curso from '#models/curso'
import Docente from '#models/docente'
import Estudiante from '#models/estudiante'
import ExcelUploadService from '#services/excel_upload_service'
import Role from '#models/role'
import Usuario from '#models/usuario'

export default class EstudianteController {
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

  async index({ response }: HttpContext) {
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

  async show({ params, response }: HttpContext) {
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

  async store({ request, response }: HttpContext) {
    const cursoId = request.input('cursoId') ?? request.input('curso_id')
    if (!cursoId) {
      return response.badRequest({ message: 'cursoId es requerido' })
    }

    const curso = await Curso.find(cursoId)
    if (!curso) {
      return response.badRequest({ message: 'El cursoId no existe' })
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
      'cursoId',
    ])

    payload.cursoId = Number(cursoId)

    const numeroDocumento = String(payload.numeroDocumento ?? '').trim()
    if (numeroDocumento) {
      const existente = await Estudiante.query().where('numero_documento', numeroDocumento).first()
      if (existente) {
        return response.conflict({ message: 'Este usuario ya existe: el numero de documento ya está registrado' })
      }
    }

    const estudiante = await Estudiante.create(payload)

    const acudienteId = request.input('acudienteId') ?? request.input('acudiente_id')
    const acudienteIds = request.input('acudienteIds') ?? request.input('acudiente_ids')

    const relacion = String(request.input('relacion') ?? 'acudiente')
    const esPrincipal = Boolean(request.input('esPrincipal') ?? request.input('es_principal') ?? true)

    const ids: number[] = Array.isArray(acudienteIds)
      ? acudienteIds.map((id: any) => Number(id))
      : acudienteId !== undefined && acudienteId !== null
        ? [Number(acudienteId)]
        : []

    if (ids.length) {
      const acudientes = await Acudiente.query().whereIn('id', ids)
      if (acudientes.length !== ids.length) {
        return response.badRequest({ message: 'Uno o más acudienteIds no existen' })
      }

      const attachPayload: Record<number, { relacion: string; es_principal: boolean }> = {}
      ids.forEach((id, idx) => {
        attachPayload[id] = { relacion, es_principal: idx === 0 ? esPrincipal : false }
      })

      await estudiante.related('acudientes').attach(attachPayload)
    }

    return response.created(estudiante)
  }

  async update({ params, request, response }: HttpContext) {
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
      'cursoId',
    ])

    estudiante.merge(payload)
    await estudiante.save()

    return response.ok(estudiante)
  }

  async destroy({ params, response }: HttpContext) {
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

    await estudiante.delete()
    return response.ok({ message: 'Estudiante eliminado' })
  }

  /**
   * Descargar plantilla Excel para carga masiva
   * GET /estudiantes/plantilla-excel
   */
  async descargarPlantilla({ response }: HttpContext) {
    try {
      const buffer = ExcelUploadService.generarPlantillaExcel()

      response.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      response.header('Content-Disposition', 'attachment; filename="plantilla_estudiantes.xlsx"')

      return response.send(buffer)
    } catch (error) {
      console.error('Error al generar plantilla:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al generar plantilla Excel',
        error: error.message,
      })
    }
  }

  /**
   * Validar archivo Excel antes de cargar
   * POST /estudiantes/validar-excel
   */
  async validarExcel({ request, response }: HttpContext) {
    try {
      const archivo = request.file('archivo', {
        size: '10mb',
        extnames: ['xlsx', 'xls'],
      })

      if (!archivo) {
        return response.status(400).json({
          success: false,
          message: 'No se ha proporcionado ningún archivo Excel',
        })
      }

      if (!archivo.isValid) {
        return response.status(400).json({
          success: false,
          message: 'El archivo no es válido',
          errors: archivo.errors,
        })
      }

      // Leer buffer del archivo - mover a tmp y leer
      const tmpDir = app.tmpPath('uploads')
      await archivo.move(tmpDir, { name: `validar_${Date.now()}.xlsx` })
      const buffer = await readFile(archivo.filePath!)

      // Parsear Excel
      const resultado = ExcelUploadService.parseExcelFile(buffer)

      return response.status(200).json({
        success: true,
        message: 'Validación completada',
        data: {
          totalRows: resultado.totalRows,
          validRows: resultado.validRows.length,
          invalidRows: resultado.invalidRows.length,
          preview: {
            valid: resultado.validRows.slice(0, 5), // Mostrar primeros 5
            invalid: resultado.invalidRows.slice(0, 10), // Mostrar primeros 10 errores
          },
        },
      })
    } catch (error) {
      console.error('Error al validar Excel:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al validar archivo Excel',
        error: error.message,
      })
    }
  }

  /**
   * Carga masiva de estudiantes desde Excel
   * POST /estudiantes/carga-masiva
   */
  async cargaMasiva({ request, response }: HttpContext) {
    try {
      const archivo = request.file('archivo', {
        size: '10mb',
        extnames: ['xlsx', 'xls'],
      })

      const cursoId = Number(request.input('cursoId') || request.input('curso_id'))

      if (!archivo) {
        return response.status(400).json({
          success: false,
          message: 'No se ha proporcionado ningún archivo Excel',
        })
      }

      if (!cursoId) {
        return response.status(400).json({
          success: false,
          message: 'El cursoId es requerido',
        })
      }

      if (!archivo.isValid) {
        return response.status(400).json({
          success: false,
          message: 'El archivo no es válido',
          errors: archivo.errors,
        })
      }

      // Verificar que el curso existe
      const curso = await Curso.find(cursoId)
      if (!curso) {
        return response.status(404).json({
          success: false,
          message: 'Curso no encontrado',
        })
      }

      // Leer buffer del archivo - mover a tmp y leer
      const tmpDir2 = app.tmpPath('uploads')
      await archivo.move(tmpDir2, { name: `carga_${Date.now()}.xlsx` })
      const buffer = await readFile(archivo.filePath!)

      // Parsear Excel
      const resultado = ExcelUploadService.parseExcelFile(buffer)

      if (resultado.validRows.length === 0) {
        return response.status(400).json({
          success: false,
          message: 'No hay filas válidas para insertar',
          data: {
            invalidRows: resultado.invalidRows,
          },
        })
      }

      // Usar transacción para insertar todos o ninguno
      const insertados: any[] = []
      const rechazados: any[] = []

      await db.transaction(async (trx) => {
        for (const row of resultado.validRows) {
          try {
            // Verificar si el documento ya existe
            const existente = await Estudiante.query()
              .useTransaction(trx)
              .where('numero_documento', row.numeroDocumento)
              .first()

            if (existente) {
              rechazados.push({
                data: row,
                error: `El documento ${row.numeroDocumento} ya está registrado`,
              })
              continue
            }

            // Convertir fecha si existe
            let fechaNacimiento: DateTime | undefined
            if (row.fechaNacimiento) {
              if (row.fechaNacimiento instanceof Date) {
                fechaNacimiento = DateTime.fromJSDate(row.fechaNacimiento)
              } else if (typeof row.fechaNacimiento === 'string') {
                fechaNacimiento = DateTime.fromISO(row.fechaNacimiento)
              }
            }

            // Crear estudiante
            const estudiante = await Estudiante.create(
              {
                nombres: row.nombres,
                apellidos: row.apellidos,
                numeroDocumento: row.numeroDocumento,
                tipoDocumento: row.tipoDocumento || 'TI',
                fechaNacimiento: fechaNacimiento?.isValid ? fechaNacimiento : undefined,
                sexo: row.sexo,
                cursoId,
              },
              { client: trx }
            )

            insertados.push({
              id: estudiante.id,
              nombres: estudiante.nombres,
              apellidos: estudiante.apellidos,
              numeroDocumento: estudiante.numeroDocumento,
            })
          } catch (error) {
            rechazados.push({
              data: row,
              error: error.message,
            })
          }
        }
      })

      return response.status(201).json({
        success: true,
        message: `Carga masiva completada. ${insertados.length} estudiantes insertados.`,
        data: {
          insertados: insertados.length,
          rechazados: rechazados.length,
          totalProcesados: resultado.validRows.length,
          totalInvalidos: resultado.invalidRows.length,
          detalleInsertados: insertados,
          detalleRechazados: rechazados,
          detalleInvalidos: resultado.invalidRows,
        },
      })
    } catch (error) {
      console.error('Error en carga masiva:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al realizar carga masiva',
        error: error.message,
      })
    }
  }

  // ========================================
  // VINCULACIÓN ESTUDIANTE-ACUDIENTE (HU-13)
  // ========================================

  /**
   * Listar acudientes de un estudiante
   * GET /estudiantes/:id/acudientes
   */
  async listarAcudientes({ params, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
    }

    if (usuario) {
      const cursoIds = await this.getDocenteCursoIds(usuario)
      if (Array.isArray(cursoIds) && !cursoIds.includes(estudiante.cursoId)) {
        return response.forbidden({ success: false, message: 'Acceso denegado' })
      }
    }

    await estudiante.load('acudientes')

    const acudientes = estudiante.acudientes.map((a) => ({
      id: a.id,
      nombres: a.nombres,
      apellidos: a.apellidos,
      telefono: a.telefono,
      correo: a.correo,
      parentesco: a.$extras.pivot_relacion || 'No especificado',
      esPrincipal: a.$extras.pivot_es_principal || false,
    }))

    return response.ok({ success: true, data: acudientes })
  }

  /**
   * Vincular acudiente a estudiante
   * POST /estudiantes/:id/acudientes
   */
  async vincularAcudiente({ params, request, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
    }

    if (usuario) {
      const cursoIds = await this.getDocenteCursoIds(usuario)
      if (Array.isArray(cursoIds) && !cursoIds.includes(estudiante.cursoId)) {
        return response.forbidden({ success: false, message: 'Acceso denegado' })
      }
    }

    const acudienteId = request.input('acudienteId')
    const parentesco = request.input('parentesco') || 'Acudiente'
    const esPrincipal = Boolean(request.input('esPrincipal'))

    if (!acudienteId) {
      return response.badRequest({ success: false, message: 'acudienteId es requerido' })
    }

    const acudiente = await Acudiente.find(acudienteId)
    if (!acudiente) {
      return response.notFound({ success: false, message: 'Acudiente no encontrado' })
    }

    // Verificar si ya está vinculado
    await estudiante.load('acudientes')
    const yaVinculado = estudiante.acudientes.find((a) => a.id === Number(acudienteId))
    if (yaVinculado) {
      return response.conflict({ success: false, message: 'El acudiente ya está vinculado a este estudiante' })
    }

    // Si es principal, quitar principal a los demás
    if (esPrincipal) {
      await db
        .from('estudiante_acudiente')
        .where('estudiante_id', estudiante.id)
        .update({ es_principal: false })
    }

    // Vincular
    await estudiante.related('acudientes').attach({
      [acudienteId]: { relacion: parentesco, es_principal: esPrincipal },
    })

    return response.created({
      success: true,
      message: 'Acudiente vinculado correctamente',
    })
  }

  /**
   * Actualizar vínculo estudiante-acudiente
   * PUT /estudiantes/:id/acudientes/:acudienteId
   */
  async actualizarVinculo({ params, request, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const { id, acudienteId } = params

    if (usuario) {
      const cursoIds = await this.getDocenteCursoIds(usuario)
      if (Array.isArray(cursoIds)) {
        const estudiante = await Estudiante.find(id)
        if (!estudiante || !cursoIds.includes(estudiante.cursoId)) {
          return response.forbidden({ success: false, message: 'Acceso denegado' })
        }
      }
    }

    const vinculo = await db
      .from('estudiante_acudiente')
      .where('estudiante_id', id)
      .where('acudiente_id', acudienteId)
      .first()

    if (!vinculo) {
      return response.notFound({ success: false, message: 'Vínculo no encontrado' })
    }

    const parentesco = request.input('parentesco')
    const esPrincipal = request.input('esPrincipal')

    const updateData: any = {}
    if (parentesco !== undefined) updateData.relacion = parentesco
    if (esPrincipal !== undefined) {
      // Si es principal, quitar principal a los demás
      if (esPrincipal) {
        await db
          .from('estudiante_acudiente')
          .where('estudiante_id', id)
          .update({ es_principal: false })
      }
      updateData.es_principal = esPrincipal
    }

    await db
      .from('estudiante_acudiente')
      .where('estudiante_id', id)
      .where('acudiente_id', acudienteId)
      .update(updateData)

    return response.ok({ success: true, message: 'Vínculo actualizado correctamente' })
  }

  /**
   * Eliminar vínculo estudiante-acudiente
   * DELETE /estudiantes/:id/acudientes/:acudienteId
   */
  async desvincularAcudiente({ params, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const { id, acudienteId } = params

    if (usuario) {
      const cursoIds = await this.getDocenteCursoIds(usuario)
      if (Array.isArray(cursoIds)) {
        const estudiante = await Estudiante.find(id)
        if (!estudiante || !cursoIds.includes(estudiante.cursoId)) {
          return response.forbidden({ success: false, message: 'Acceso denegado' })
        }
      }
    }

    const deleted = await db
      .from('estudiante_acudiente')
      .where('estudiante_id', id)
      .where('acudiente_id', acudienteId)
      .delete()

    if (!deleted) {
      return response.notFound({ success: false, message: 'Vínculo no encontrado' })
    }

    return response.ok({ success: true, message: 'Acudiente desvinculado correctamente' })
  }

  // ========================================
  // GESTIÓN ESTUDIANTES (HU-15)
  // ========================================

  /**
   * Cambiar de curso a un estudiante
   * POST /estudiantes/:id/cambiar-curso
   */
  async cambiarCurso({ params, request, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
    }

    if (usuario) {
      const cursoIds = await this.getDocenteCursoIds(usuario)
      if (Array.isArray(cursoIds)) {
        const nuevoCursoIdTmp = request.input('nuevoCursoId') || request.input('cursoId')
        const nuevoCursoId = nuevoCursoIdTmp !== undefined ? Number(nuevoCursoIdTmp) : undefined

        if (!cursoIds.includes(estudiante.cursoId)) {
          return response.forbidden({ success: false, message: 'Acceso denegado' })
        }

        if (nuevoCursoId !== undefined && !Number.isNaN(nuevoCursoId) && !cursoIds.includes(nuevoCursoId)) {
          return response.forbidden({ success: false, message: 'Acceso denegado' })
        }
      }
    }

    const nuevoCursoId = request.input('nuevoCursoId') || request.input('cursoId')
    const motivo = request.input('motivo') || 'Cambio de curso'

    if (!nuevoCursoId) {
      return response.badRequest({ success: false, message: 'nuevoCursoId es requerido' })
    }

    const nuevoCurso = await Curso.find(nuevoCursoId)
    if (!nuevoCurso) {
      return response.notFound({ success: false, message: 'Curso destino no encontrado' })
    }

    const cursoAnteriorId = estudiante.cursoId
    const cursoAnterior = await Curso.find(cursoAnteriorId)

    // Cambiar curso
    estudiante.cursoId = Number(nuevoCursoId)
    await estudiante.save()

    // Registrar en auditoría
    await db.table('auditoria').insert({
      usuario_id: null,
      accion: 'CAMBIO_CURSO',
      entidad: 'estudiantes',
      entidad_id: estudiante.id,
      cambios_json: JSON.stringify({
        cursoAnterior: { id: cursoAnteriorId, nombre: cursoAnterior?.nombre },
        cursoNuevo: { id: nuevoCursoId, nombre: nuevoCurso.nombre },
        motivo,
      }),
      creado_en: DateTime.now().toSQL(),
    })

    return response.ok({
      success: true,
      message: 'Estudiante trasladado correctamente',
      data: {
        cursoAnterior: { id: cursoAnteriorId, nombre: cursoAnterior?.nombre },
        cursoNuevo: { id: nuevoCursoId, nombre: nuevoCurso.nombre },
        fecha: DateTime.now().toISO(),
      },
    })
  }

  /**
   * Retirar estudiante (soft delete)
   * POST /estudiantes/:id/retirar
   */
  async retirar({ params, request, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
    }

    if (usuario) {
      const cursoIds = await this.getDocenteCursoIds(usuario)
      if (Array.isArray(cursoIds) && !cursoIds.includes(estudiante.cursoId)) {
        return response.forbidden({ success: false, message: 'Acceso denegado' })
      }
    }

    const motivo = request.input('motivo') || 'Retiro voluntario'
    const fechaEfectiva = request.input('fechaEfectiva') || DateTime.now().toISODate()

    // Soft delete
    estudiante.eliminadoEn = DateTime.now()
    await estudiante.save()

    // Registrar en auditoría
    await db.table('auditoria').insert({
      usuario_id: null,
      accion: 'RETIRO_ESTUDIANTE',
      entidad: 'estudiantes',
      entidad_id: estudiante.id,
      cambios_json: JSON.stringify({ motivo, fechaEfectiva }),
      creado_en: DateTime.now().toSQL(),
    })

    return response.ok({
      success: true,
      message: 'Estudiante retirado correctamente',
      data: {
        id: estudiante.id,
        estado: 'retirado',
        fechaRetiro: fechaEfectiva,
      },
    })
  }

  /**
   * Historial de cambios del estudiante
   * GET /estudiantes/:id/historial
   */
  async historial({ params, response }: HttpContext) {
    const ctxAny = arguments[0] as any
    const usuario = (ctxAny as any).jwtUser as Usuario | undefined

    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
    }

    if (usuario) {
      const cursoIds = await this.getDocenteCursoIds(usuario)
      if (Array.isArray(cursoIds) && !cursoIds.includes(estudiante.cursoId)) {
        return response.forbidden({ success: false, message: 'Acceso denegado' })
      }
    }

    const registros = await db
      .from('auditoria')
      .where('entidad', 'estudiantes')
      .where('entidad_id', params.id)
      .orderBy('creado_en', 'desc')
      .limit(50)

    const historial = registros.map((r) => ({
      tipo: r.accion,
      fecha: r.creado_en,
      detalles: r.cambios_json ? JSON.parse(r.cambios_json) : {},
    }))

    return response.ok({ success: true, data: historial })
  }

  /**
   * Carga masiva dual de estudiantes y acudientes (DOS archivos)
   * POST /estudiantes/carga-masiva-dual
   */
  async cargaMasivaDual({ request, response }: HttpContext) {
    try {
      const archivoEstudiantes = request.file('archivo_estudiantes', {
        size: '10mb',
        extnames: ['xlsx', 'xls', 'csv'],
      })

      const archivoAcudientes = request.file('archivo_acudientes', {
        size: '10mb',
        extnames: ['xlsx', 'xls', 'csv'],
      })

      const institucionId = Number(request.input('institucionId') || request.input('institucion_id'))

      if (!archivoEstudiantes) {
        return response.status(400).json({
          success: false,
          message: 'No se ha proporcionado el archivo de estudiantes',
        })
      }

      if (!archivoAcudientes) {
        return response.status(400).json({
          success: false,
          message: 'No se ha proporcionado el archivo de acudientes',
        })
      }

      if (!institucionId) {
        return response.status(400).json({
          success: false,
          message: 'El institucionId es requerido',
        })
      }

      if (!archivoEstudiantes.isValid) {
        return response.status(400).json({
          success: false,
          message: 'El archivo de estudiantes no es válido',
          errors: archivoEstudiantes.errors,
        })
      }

      if (!archivoAcudientes.isValid) {
        return response.status(400).json({
          success: false,
          message: 'El archivo de acudientes no es válido',
          errors: archivoAcudientes.errors,
        })
      }

      // Mover archivos a tmp y leer
      const tmpDir = app.tmpPath('uploads')
      await archivoEstudiantes.move(tmpDir, { name: `estudiantes_${Date.now()}.xlsx` })
      await archivoAcudientes.move(tmpDir, { name: `acudientes_${Date.now()}.xlsx` })

      const bufferEstudiantes = await readFile(archivoEstudiantes.filePath!)
      const bufferAcudientes = await readFile(archivoAcudientes.filePath!)

      // Importar servicio
      const CargaMasivaDualService = (await import('#services/carga_masiva_dual_service')).default

      // Parsear acudientes primero
      const resultadoAcudientes = CargaMasivaDualService.parseAcudientesFile(bufferAcudientes)

      if (resultadoAcudientes.validRows.length === 0) {
        return response.status(400).json({
          success: false,
          message: 'No hay acudientes válidos en el archivo',
          data: {
            errores: resultadoAcudientes.invalidRows,
          },
        })
      }

      // Crear set de documentos de acudientes para validación
      const acudientesDocumentos = new Set(
        resultadoAcudientes.validRows.map((a) => a.numeroDocumento)
      )

      // Parsear estudiantes
      const resultadoEstudiantes = CargaMasivaDualService.parseEstudiantesFile(
        bufferEstudiantes,
        acudientesDocumentos
      )

      if (resultadoEstudiantes.validRows.length === 0) {
        return response.status(400).json({
          success: false,
          message: 'No hay estudiantes válidos en el archivo',
          data: {
            errores: [
              ...resultadoAcudientes.invalidRows,
              ...resultadoEstudiantes.invalidRows,
            ],
          },
        })
      }

      // Usar transacción para insertar todo
      const acudientesCreados: any[] = []
      const acudientesReutilizados: any[] = []
      const estudiantesCreados: any[] = []
      const vinculosCreados: any[] = []
      const errores: any[] = [
        ...resultadoAcudientes.invalidRows,
        ...resultadoEstudiantes.invalidRows,
      ]

      await db.transaction(async (trx) => {
        // 1. Crear/obtener acudientes
        const mapaAcudientes = new Map<string, number>() // documento -> id

        for (const acudienteData of resultadoAcudientes.validRows) {
          try {
            // Verificar si ya existe
            let acudiente = await Acudiente.query()
              .useTransaction(trx)
              .where('numero_documento', acudienteData.numeroDocumento)
              .first()

            if (acudiente) {
              // Reutilizar acudiente existente
              acudientesReutilizados.push({
                id: acudiente.id,
                numeroDocumento: acudiente.numeroDocumento,
                nombres: acudiente.nombres,
              })
              mapaAcudientes.set(acudienteData.numeroDocumento, acudiente.id)
            } else {
              // Crear usuario para el acudiente (rol acudiente = 6)
              const correoAcudiente = acudienteData.correo || `acudiente_${acudienteData.numeroDocumento}@temp.com`
              
              // Verificar si el correo ya existe en el sistema
              const usuarioExistente = await Usuario.query()
                .useTransaction(trx)
                .where('correo', correoAcudiente)
                .first()

              if (usuarioExistente) {
                errores.push({
                  archivo: 'acudientes',
                  fila: 0,
                  campo: 'correo',
                  valor: correoAcudiente,
                  mensaje: `El correo ya está registrado en el sistema (Usuario ID: ${usuarioExistente.id})`,
                })
                continue
              }

              const usuario = await Usuario.create(
                {
                  correo: correoAcudiente,
                  contrasenaHash: `Temp${acudienteData.numeroDocumento}!`, // Contraseña temporal
                  rolId: 6, // Rol acudiente
                  estaActivo: true,
                  debeCambiarContrasena: true,
                },
                { client: trx }
              )

              // Crear nuevo acudiente
              acudiente = await Acudiente.create(
                {
                  nombres: acudienteData.nombres,
                  apellidos: acudienteData.apellidos,
                  numeroDocumento: acudienteData.numeroDocumento,
                  tipoDocumento: acudienteData.tipoDocumento,
                  telefono: acudienteData.telefono,
                  correo: acudienteData.correo,
                  direccion: acudienteData.direccion,
                  ocupacion: acudienteData.ocupacion,
                  usuarioId: usuario.id,
                },
                { client: trx }
              )

              acudientesCreados.push({
                id: acudiente.id,
                numeroDocumento: acudiente.numeroDocumento,
                nombres: acudiente.nombres,
                apellidos: acudiente.apellidos,
              })
              mapaAcudientes.set(acudienteData.numeroDocumento, acudiente.id)
            }
          } catch (error) {
            errores.push({
              archivo: 'acudientes',
              fila: 0,
              campo: 'general',
              valor: acudienteData.numeroDocumento,
              mensaje: error.message,
            })
          }
        }

        // 2. Crear estudiantes y vincular con acudientes
        for (const estudianteData of resultadoEstudiantes.validRows) {
          try {
            // Verificar si el documento ya existe en el sistema
            const existente = await Estudiante.query()
              .useTransaction(trx)
              .where('numero_documento', estudianteData.numeroDocumento)
              .preload('curso', (cursoQuery) => {
                cursoQuery.preload('institucion')
              })
              .first()

            if (existente) {
              const institucionNombre = existente.curso?.institucion?.nombre || 'Desconocida'
              const cursoNombre = existente.curso?.nombre || 'Desconocido'
              
              errores.push({
                archivo: 'estudiantes',
                fila: 0,
                campo: 'numero_documento',
                valor: estudianteData.numeroDocumento,
                mensaje: `Estudiante ya registrado en ${institucionNombre}, curso ${cursoNombre} (ID: ${existente.id})`,
              })
              continue
            }

            // Buscar curso por nombre/número
            const curso = await Curso.query()
              .useTransaction(trx)
              .where('institucion_id', institucionId)
              .where('nombre', 'like', `%${estudianteData.curso}%`)
              .first()

            if (!curso) {
              errores.push({
                archivo: 'estudiantes',
                fila: 0,
                campo: 'curso',
                valor: estudianteData.curso,
                mensaje: `Curso no encontrado en la institución`,
              })
              continue
            }

            // Crear estudiante
            const estudiante = await Estudiante.create(
              {
                nombres: estudianteData.nombres,
                apellidos: estudianteData.apellidos,
                numeroDocumento: estudianteData.numeroDocumento,
                tipoDocumento: estudianteData.tipoDocumento,
                fechaNacimiento: estudianteData.fechaNacimiento,
                sexo: estudianteData.sexo,
                cursoId: curso.id,
              },
              { client: trx }
            )

            estudiantesCreados.push({
              id: estudiante.id,
              numeroDocumento: estudiante.numeroDocumento,
              nombres: estudiante.nombres,
              apellidos: estudiante.apellidos,
              curso: curso.nombre,
            })

            // Vincular con acudiente
            const acudienteId = mapaAcudientes.get(estudianteData.documentoAcudiente)
            if (acudienteId) {
              // Obtener parentesco del acudiente original
              const acudienteOriginal = resultadoAcudientes.validRows.find(
                (a) => a.numeroDocumento === estudianteData.documentoAcudiente
              )

              await db
                .table('estudiante_acudiente')
                .useTransaction(trx)
                .insert({
                  estudiante_id: estudiante.id,
                  acudiente_id: acudienteId,
                  relacion: acudienteOriginal?.parentesco || 'acudiente',
                  es_principal: true,
                })

              vinculosCreados.push({
                estudianteId: estudiante.id,
                acudienteId: acudienteId,
                parentesco: acudienteOriginal?.parentesco,
              })
            }
          } catch (error) {
            errores.push({
              archivo: 'estudiantes',
              fila: 0,
              campo: 'general',
              valor: estudianteData.numeroDocumento,
              mensaje: error.message,
            })
          }
        }
      })

      return response.status(201).json({
        success: true,
        message: 'Carga masiva dual completada exitosamente',
        data: {
          totalEstudiantes: resultadoEstudiantes.totalRows,
          estudiantesCreados: estudiantesCreados.length,
          estudiantesActualizados: 0,
          totalAcudientes: resultadoAcudientes.totalRows,
          acudientesCreados: acudientesCreados.length,
          acudientesReutilizados: acudientesReutilizados.length,
          vinculosCreados: vinculosCreados.length,
          errores: errores.length > 0 ? errores : undefined,
          detalleEstudiantes: estudiantesCreados,
          detalleAcudientes: acudientesCreados,
          detalleReutilizados: acudientesReutilizados,
        },
      })
    } catch (error) {
      console.error('Error en carga masiva dual:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al realizar carga masiva dual',
        error: error.message,
      })
    }
  }
}

