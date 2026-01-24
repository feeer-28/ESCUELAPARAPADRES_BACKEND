import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import app from '@adonisjs/core/services/app'
import { readFile } from 'node:fs/promises'

import Acudiente from '#models/acudiente'
import Curso from '#models/curso'
import Estudiante from '#models/estudiante'
import ExcelUploadService from '#services/excel_upload_service'

export default class EstudianteController {
  async index({ response }: HttpContext) {
    const estudiantes = await Estudiante.query().orderBy('id', 'desc')
    return response.ok(estudiantes)
  }

  async show({ params, response }: HttpContext) {
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ message: 'Estudiante no encontrado' })
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
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ message: 'Estudiante no encontrado' })
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
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ message: 'Estudiante no encontrado' })
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
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
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
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
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
    const { id, acudienteId } = params

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
    const { id, acudienteId } = params

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
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
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
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
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
    const estudiante = await Estudiante.find(params.id)
    if (!estudiante) {
      return response.notFound({ success: false, message: 'Estudiante no encontrado' })
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
}

