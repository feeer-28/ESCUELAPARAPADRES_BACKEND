import * as XLSX from 'xlsx'

interface EstudianteExcelRow {
  nombres: string
  apellidos: string
  numeroDocumento: string
  tipoDocumento?: string
  fechaNacimiento?: string | Date
  correo?: string
  sexo?: string
  [key: string]: any
}

interface ParseResult {
  validRows: EstudianteExcelRow[]
  invalidRows: Array<{
    row: number
    data: any
    errors: string[]
  }>
  totalRows: number
}

export default class ExcelUploadService {
  /**
   * Parsear archivo Excel y validar datos de estudiantes
   */
  static parseExcelFile(buffer: Buffer): ParseResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Convertir a JSON
    const data = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })

    const validRows: EstudianteExcelRow[] = []
    const invalidRows: Array<{ row: number; data: any; errors: string[] }> = []
    const documentosVistos = new Set<string>()

    data.forEach((row, index) => {
      const errors: string[] = []
      const rowNumber = index + 2 // +2 porque empieza en fila 1 y hay header

      // Normalizar nombres de columnas (soportar diferentes variantes)
      const normalizedRow: any = {}
      Object.keys(row).forEach((key) => {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_')
        normalizedRow[normalizedKey] = row[key]
      })

      // Validar campos requeridos
      const nombres = String(normalizedRow.nombres || normalizedRow.nombre || '').trim()
      const apellidos = String(normalizedRow.apellidos || normalizedRow.apellido || '').trim()
      const numeroDocumento = String(
        normalizedRow.numero_documento ||
          normalizedRow.numerodocumento ||
          normalizedRow.documento ||
          ''
      ).trim()

      if (!nombres) {
        errors.push('El campo "nombres" es requerido')
      }
      if (!apellidos) {
        errors.push('El campo "apellidos" es requerido')
      }
      if (!numeroDocumento) {
        errors.push('El campo "numeroDocumento" es requerido')
      }

      // Validar duplicados dentro del archivo
      if (numeroDocumento && documentosVistos.has(numeroDocumento)) {
        errors.push(`El número de documento "${numeroDocumento}" está duplicado en el archivo`)
      } else if (numeroDocumento) {
        documentosVistos.add(numeroDocumento)
      }

      // Validar email (opcional pero debe ser válido si existe)
      const correo = String(normalizedRow.correo || normalizedRow.email || '').trim()
      if (correo) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(correo)) {
          errors.push(`El correo "${correo}" no tiene un formato válido`)
        }
      }

      // Validar fecha de nacimiento (opcional pero debe ser válida si existe)
      let fechaNacimiento: Date | string | undefined
      const fechaRaw =
        normalizedRow.fecha_nacimiento ||
        normalizedRow.fechanacimiento ||
        normalizedRow.fecha_de_nacimiento ||
        ''

      if (fechaRaw) {
        if (typeof fechaRaw === 'number') {
          // Excel almacena fechas como números
          fechaNacimiento = XLSX.SSF.parse_date_code(fechaRaw)
            ? new Date((fechaRaw - 25569) * 86400 * 1000)
            : undefined
        } else {
          const parsed = new Date(fechaRaw)
          fechaNacimiento = isNaN(parsed.getTime()) ? undefined : parsed
        }

        if (!fechaNacimiento) {
          errors.push(`La fecha de nacimiento "${fechaRaw}" no tiene un formato válido`)
        }
      }

      // Validar sexo (opcional)
      const sexo = String(normalizedRow.sexo || normalizedRow.genero || '').trim().toUpperCase()
      if (sexo && !['M', 'F', 'MASCULINO', 'FEMENINO'].includes(sexo)) {
        errors.push(
          `El sexo "${sexo}" no es válido. Debe ser M, F, Masculino o Femenino`
        )
      }

      if (errors.length > 0) {
        invalidRows.push({
          row: rowNumber,
          data: row,
          errors,
        })
      } else {
        validRows.push({
          nombres,
          apellidos,
          numeroDocumento,
          tipoDocumento:
            String(
              normalizedRow.tipo_documento ||
                normalizedRow.tipodocumento ||
                normalizedRow.tipo_doc ||
                ''
            ).trim() || 'TI',
          fechaNacimiento,
          correo: correo || undefined,
          sexo: sexo ? (sexo[0] === 'M' ? 'M' : 'F') : undefined,
        })
      }
    })

    return {
      validRows,
      invalidRows,
      totalRows: data.length,
    }
  }

  /**
   * Generar plantilla Excel de ejemplo
   */
  static generarPlantillaExcel(): Buffer {
    const data = [
      {
        nombres: 'Juan',
        apellidos: 'Pérez García',
        numeroDocumento: '1234567890',
        tipoDocumento: 'TI',
        fechaNacimiento: '2010-05-15',
        correo: 'juan.perez@ejemplo.com',
        sexo: 'M',
      },
      {
        nombres: 'María',
        apellidos: 'López Rodríguez',
        numeroDocumento: '0987654321',
        tipoDocumento: 'TI',
        fechaNacimiento: '2011-08-22',
        correo: 'maria.lopez@ejemplo.com',
        sexo: 'F',
      },
    ]

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Estudiantes')

    // Generar buffer
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
  }
}
