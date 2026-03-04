
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import { readFile } from 'node:fs/promises'
import * as XLSX from 'xlsx'
import { DateTime } from 'luxon'

import Acudiente from '#models/acudiente'
import Curso from '#models/curso'
import Estudiante from '#models/estudiante'
import Role from '#models/role'
import Usuario from '#models/usuario'

type AcudienteExcelRow = {
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  telefono: string
  correo?: string
  direccion?: string
  parentesco?: string
  ocupacion?: string
}

type EstudianteExcelRow = {
  tipoDocumento: string
  numeroDocumento: string
  nombres: string
  apellidos: string
  fechaNacimiento: DateTime
  sexo: string
  curso: string
  documentoAcudiente: string
  nombresAcudiente?: string
}

export default class ExcelController {
  private parseExcelDate(value: unknown): DateTime | null {
    if (value === null || value === undefined || value === '') {
      return null
    }

    if (value instanceof Date) {
      const dt = DateTime.fromJSDate(value)
      return dt.isValid ? dt : null
    }

    if (typeof value === 'number') {
      // Excel serial date (days since 1899-12-30)
      // 25569 = days between 1899-12-30 and 1970-01-01
      const ms = (value - 25569) * 86400 * 1000
      const dt = DateTime.fromMillis(ms, { zone: 'utc' }).startOf('day')
      return dt.isValid ? dt : null
    }

    const str = String(value).trim()
    if (!str) return null

    // Soportar: 12/03/2008 (dd/MM/yyyy)
    const dt1 = DateTime.fromFormat(str, 'dd/MM/yyyy')
    if (dt1.isValid) return dt1

    // Soportar ISO: 2008-03-12
    const dt2 = DateTime.fromISO(str)
    if (dt2.isValid) return dt2

    // Fallback JS Date
    const dt3 = DateTime.fromJSDate(new Date(str))
    return dt3.isValid ? dt3 : null
  }

  private normalizeHeader(value: string) {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
  }

  private parseAcudientesExcel(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

    const validRows: AcudienteExcelRow[] = []
    const invalidRows: Array<{ row: number; data: any; errors: string[] }> = []

    const documentosVistos = new Set<string>()
    const telefonosVistos = new Set<string>()

    raw.forEach((row, index) => {
      const rowNumber = index + 2
      const errors: string[] = []

      const normalizedRow: Record<string, any> = {}
      Object.keys(row).forEach((key) => {
        normalizedRow[this.normalizeHeader(key)] = row[key]
      })

      const tipoDocumento = String(
        normalizedRow.tipo_documento || normalizedRow.tipodocumento || normalizedRow.tipo_doc || ''
      ).trim()
      const numeroDocumento = String(
        normalizedRow.numero_documento || normalizedRow.numerodocumento || normalizedRow.documento || ''
      ).trim()
      const nombres = String(normalizedRow.nombres || normalizedRow.nombre || '').trim()
      const apellidos = String(normalizedRow.apellidos || normalizedRow.apellido || '').trim()
      const telefono = String(normalizedRow.telefono || normalizedRow.celular || '').trim()
      const correo = String(normalizedRow.correo || normalizedRow.email || '').trim()
      const direccion = String(normalizedRow.direccion || '').trim()
      const parentesco = String(normalizedRow.parentesco || '').trim()
      const ocupacion = String(normalizedRow.ocupacion || '').trim()

      if (!telefono) errors.push('El campo "telefono" es requerido')
      if (!numeroDocumento) errors.push('El campo "numeroDocumento" es requerido')
      if (!nombres) errors.push('El campo "nombres" es requerido')
      if (!apellidos) errors.push('El campo "apellidos" es requerido')

      if (telefono) {
        if (telefonosVistos.has(telefono)) {
          errors.push(`El telefono "${telefono}" está duplicado en el archivo`)
        } else {
          telefonosVistos.add(telefono)
        }
      }

      if (numeroDocumento) {
        if (documentosVistos.has(numeroDocumento)) {
          errors.push(`El número de documento "${numeroDocumento}" está duplicado en el archivo`)
        } else {
          documentosVistos.add(numeroDocumento)
        }
      }

      if (correo) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(correo)) {
          errors.push(`El correo "${correo}" no tiene un formato válido`)
        }
      }

      if (errors.length) {
        invalidRows.push({ row: rowNumber, data: row, errors })
        return
      }

      validRows.push({
        tipoDocumento: tipoDocumento || 'CC',
        numeroDocumento,
        nombres,
        apellidos,
        telefono,
        correo: correo || undefined,
        direccion: direccion || undefined,
        parentesco: parentesco || undefined,
        ocupacion: ocupacion || undefined,
      })
    })

    return { validRows, invalidRows, totalRows: raw.length }
  }

  private parseEstudiantesExcel(buffer: Buffer) {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    const raw = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

    const validRows: EstudianteExcelRow[] = []
    const invalidRows: Array<{ row: number; data: any; errors: string[] }> = []

    const documentosVistos = new Set<string>()

    raw.forEach((row, index) => {
      const rowNumber = index + 2
      const errors: string[] = []

      const normalizedRow: Record<string, any> = {}
      Object.keys(row).forEach((key) => {
        normalizedRow[this.normalizeHeader(key)] = row[key]
      })

      const tipoDocumento = String(
        normalizedRow.tipo_documento || normalizedRow.tipodocumento || normalizedRow.tipo_doc || ''
      ).trim()
      const numeroDocumento = String(
        normalizedRow.numero_documento || normalizedRow.numerodocumento || normalizedRow.documento || ''
      ).trim()
      const nombres = String(normalizedRow.nombres || normalizedRow.nombre || '').trim()
      const apellidos = String(normalizedRow.apellidos || normalizedRow.apellido || '').trim()

      const fechaNacimientoRaw =
        normalizedRow.fecha_de_nacimiento ||
        normalizedRow.fecha_nacimiento ||
        normalizedRow.fechanacimiento ||
        normalizedRow.fecha ||
        ''
      const fechaNacimiento = this.parseExcelDate(fechaNacimientoRaw)

      const sexoRaw = String(normalizedRow.sexo || normalizedRow.genero || '').trim()
      const sexoNormalized = sexoRaw.toUpperCase()
      let sexo: string | null = null
      if (sexoNormalized) {
        if (sexoNormalized === 'M' || sexoNormalized === 'MASCULINO') sexo = 'M'
        if (sexoNormalized === 'F' || sexoNormalized === 'FEMENINO') sexo = 'F'
      }

      const curso = String(normalizedRow.curso || normalizedRow.curso_id || normalizedRow.cursoid || '').trim()

      const documentoAcudiente = String(
        normalizedRow.documento_acudiente ||
          normalizedRow.documento_del_acudiente ||
          normalizedRow.numero_documento_acudiente ||
          normalizedRow.numerodocumentoacudiente ||
          ''
      ).trim()

      const nombresAcudiente = String(
        normalizedRow.nombres_acudiente || normalizedRow.nombre_acudiente || normalizedRow.acudiente || ''
      ).trim()

      if (!numeroDocumento) errors.push('El campo "numeroDocumento" es requerido')
      if (!nombres) errors.push('El campo "nombres" es requerido')
      if (!apellidos) errors.push('El campo "apellidos" es requerido')
      if (!fechaNacimiento) errors.push('El campo "fechaNacimiento" es requerido (formato recomendado dd/MM/yyyy)')
      if (!sexo) errors.push('El campo "sexo" es requerido (M/F)')
      if (!curso) errors.push('El campo "curso" es requerido')
      if (!documentoAcudiente) errors.push('El campo "documentoAcudiente" es requerido')

      if (sexoRaw && !sexo) {
        errors.push('El campo "sexo" no es válido. Debe ser M, F, Masculino o Femenino')
      }

      if (numeroDocumento) {
        if (documentosVistos.has(numeroDocumento)) {
          errors.push(`El número de documento "${numeroDocumento}" está duplicado en el archivo`)
        } else {
          documentosVistos.add(numeroDocumento)
        }
      }

      if (errors.length) {
        invalidRows.push({ row: rowNumber, data: row, errors })
        return
      }

      validRows.push({
        tipoDocumento: tipoDocumento || 'TI',
        numeroDocumento,
        nombres,
        apellidos,
        fechaNacimiento: fechaNacimiento!,
        sexo: sexo!,
        curso,
        documentoAcudiente,
        nombresAcudiente: nombresAcudiente || undefined,
      })
    })

    return { validRows, invalidRows, totalRows: raw.length }
  }

  async cargaMasivaAcudientes({ request, response }: HttpContext) {
    try {
      const archivo =
        request.file('archivo', { size: '10mb', extnames: ['xlsx', 'xls'] }) ||
        request.file('ARCHIVO', { size: '10mb', extnames: ['xlsx', 'xls'] }) ||
        request.file('Archivo', { size: '10mb', extnames: ['xlsx', 'xls'] })

      if (!archivo) {
        return response.status(400).json({ success: false, message: 'No se ha proporcionado ningún archivo Excel' })
      }

      if (!archivo.isValid) {
        return response.status(400).json({
          success: false,
          message: 'El archivo no es válido',
          errors: archivo.errors,
        })
      }

      if (!archivo.tmpPath) {
        return response.status(400).json({
          success: false,
          message: 'No se pudo leer el archivo temporal (tmpPath vacío)',
        })
      }

      const buffer = await readFile(archivo.tmpPath)
      const resultado = this.parseAcudientesExcel(buffer)

      if (resultado.validRows.length === 0) {
        return response.status(400).json({
          success: false,
          message: 'No hay filas válidas para insertar',
          data: { invalidRows: resultado.invalidRows },
        })
      }

      const rolAcudiente = await Role.query().whereILike('nombre', 'acudiente').first()
      if (!rolAcudiente) {
        return response.status(400).json({ success: false, message: 'No existe el rol acudiente' })
      }

      const insertados: any[] = []
      const rechazados: any[] = []

      await db.transaction(async (trx) => {
        for (const row of resultado.validRows) {
          try {
            const existenteTelefono = await Acudiente.query()
              .useTransaction(trx)
              .where('telefono', row.telefono)
              .first()

            if (existenteTelefono) {
              rechazados.push({ data: row, error: `El telefono ${row.telefono} ya está registrado` })
              continue
            }

            const existenteDocumento = await Acudiente.query()
              .useTransaction(trx)
              .where('numero_documento', row.numeroDocumento)
              .first()

            if (existenteDocumento) {
              rechazados.push({ data: row, error: `El documento ${row.numeroDocumento} ya está registrado` })
              continue
            }

            const usuarioExistente = await Usuario.query()
              .useTransaction(trx)
              .where('correo', row.telefono)
              .first()

            if (usuarioExistente) {
              rechazados.push({ data: row, error: `Ya existe un usuario con el telefono ${row.telefono} (correo)` })
              continue
            }

            const usuario = await Usuario.create(
              {
                correo: row.telefono,
                contrasenaHash: row.numeroDocumento,
                estaActivo: true,
                debeCambiarContrasena: true,
                rolId: rolAcudiente.id,
              },
              { client: trx }
            )

            const acudiente = await Acudiente.create(
              {
                tipoDocumento: row.tipoDocumento,
                numeroDocumento: row.numeroDocumento,
                nombres: row.nombres,
                apellidos: row.apellidos,
                telefono: row.telefono,
                correo: row.correo ?? null,
                direccion: row.direccion ?? null,
                parentesco: row.parentesco ?? null,
                ocupacion: row.ocupacion ?? null,
                usuarioId: usuario.id,
              },
              { client: trx }
            )

            insertados.push({
              id: acudiente.id,
              usuarioId: usuario.id,
              telefono: acudiente.telefono,
              numeroDocumento: acudiente.numeroDocumento,
            })
          } catch (error) {
            rechazados.push({ data: row, error: error.message })
          }
        }
      })

      return response.status(201).json({
        success: true,
        message: `Carga masiva completada. ${insertados.length} acudientes insertados.`,
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
      return response.status(500).json({
        success: false,
        message: 'Error al realizar carga masiva',
        error: error.message,
      })
    }
  }

  async cargaMasivaEstudiantes({ request, response }: HttpContext) {
    try {
      const archivo =
        request.file('archivo', { size: '10mb', extnames: ['xlsx', 'xls'] }) ||
        request.file('ARCHIVO', { size: '10mb', extnames: ['xlsx', 'xls'] }) ||
        request.file('Archivo', { size: '10mb', extnames: ['xlsx', 'xls'] })

      if (!archivo) {
        return response.status(400).json({ success: false, message: 'No se ha proporcionado ningún archivo Excel' })
      }

      if (!archivo.isValid) {
        return response.status(400).json({
          success: false,
          message: 'El archivo no es válido',
          errors: archivo.errors,
        })
      }

      if (!archivo.tmpPath) {
        return response.status(400).json({
          success: false,
          message: 'No se pudo leer el archivo temporal (tmpPath vacío)',
        })
      }

      const buffer = await readFile(archivo.tmpPath)
      const resultado = this.parseEstudiantesExcel(buffer)

      if (resultado.validRows.length === 0) {
        return response.status(400).json({
          success: false,
          message: 'No hay filas válidas para insertar',
          data: { invalidRows: resultado.invalidRows },
        })
      }

      const insertados: any[] = []
      const rechazados: any[] = []

      await db.transaction(async (trx) => {
        for (const row of resultado.validRows) {
          try {
            const existente = await Estudiante.query()
              .useTransaction(trx)
              .where('numero_documento', row.numeroDocumento)
              .first()

            if (existente) {
              rechazados.push({ data: row, error: `El documento ${row.numeroDocumento} ya está registrado` })
              continue
            }

            let curso: Curso | null = null
            const cursoAsNumber = Number(row.curso)
            if (!Number.isNaN(cursoAsNumber) && String(row.curso).trim() !== '') {
              curso = await Curso.query().useTransaction(trx).where('id', cursoAsNumber).first()
            }

            if (!curso) {
              curso = await Curso.query().useTransaction(trx).whereILike('nombre', row.curso).first()
            }

            if (!curso) {
              const cursoNormalized = String(row.curso)
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLowerCase()
                .replace(/[\s\-_.]+/g, '')
                .trim()

              if (cursoNormalized) {
                curso = await Curso.query()
                  .useTransaction(trx)
                  .whereRaw("replace(replace(replace(replace(lower(nombre), ' ', ''), '-', ''), '_', ''), '.', '') = ?", [
                    cursoNormalized,
                  ])
                  .first()
              }
            }

            if (!curso) {
              rechazados.push({ data: row, error: `Curso no encontrado: ${row.curso}` })
              continue
            }

            const acudiente = await Acudiente.query()
              .useTransaction(trx)
              .where('numero_documento', row.documentoAcudiente)
              .first()

            if (!acudiente) {
              rechazados.push({
                data: row,
                error: `Acudiente no encontrado con documento ${row.documentoAcudiente}`,
              })
              continue
            }

            const estudiante = await Estudiante.create(
              {
                tipoDocumento: row.tipoDocumento,
                numeroDocumento: row.numeroDocumento,
                nombres: row.nombres,
                apellidos: row.apellidos,
                fechaNacimiento: row.fechaNacimiento,
                sexo: row.sexo,
                cursoId: curso.id,
              },
              { client: trx }
            )

            await estudiante.related('acudientes').attach({
              [acudiente.id]: { relacion: 'acudiente', es_principal: true },
            })

            insertados.push({
              id: estudiante.id,
              cursoId: curso.id,
              numeroDocumento: estudiante.numeroDocumento,
              acudienteId: acudiente.id,
            })
          } catch (error) {
            rechazados.push({ data: row, error: error.message })
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
      return response.status(500).json({
        success: false,
        message: 'Error al realizar carga masiva',
        error: error.message,
      })
    }
  }
}

