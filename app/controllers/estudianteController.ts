import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

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

      // Leer buffer del archivo
      const buffer = await archivo.toBuffer()

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
  async cargaMasiva({ request, response, jwtUser }: HttpContext) {
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

      // Leer buffer del archivo
      const buffer = await archivo.toBuffer()

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
}

