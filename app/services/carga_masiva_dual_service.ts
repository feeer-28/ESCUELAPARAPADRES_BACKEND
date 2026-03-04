import * as XLSX from 'xlsx'
import { DateTime } from 'luxon'

interface AcudienteExcelRow {
  nombres: string
  apellidos: string
  numeroDocumento: string
  tipoDocumento: string
  telefono?: string
  correo?: string
  direccion?: string
  parentesco: string
  ocupacion?: string
}

interface EstudianteDualRow {
  nombres: string
  apellidos: string
  numeroDocumento: string
  tipoDocumento: string
  fechaNacimiento?: DateTime
  sexo?: string
  curso: string
  documentoAcudiente: string
  nombresAcudiente?: string
}

interface ParseAcudientesResult {
  validRows: AcudienteExcelRow[]
  invalidRows: Array<{
    archivo: string
    fila: number
    campo: string
    valor: any
    mensaje: string
  }>
  totalRows: number
}

interface ParseEstudiantesResult {
  validRows: EstudianteDualRow[]
  invalidRows: Array<{
    archivo: string
    fila: number
    campo: string
    valor: any
    mensaje: string
  }>
  totalRows: number
}

export default class CargaMasivaDualService {
  /**
   * Convertir fecha DD/MM/YYYY a DateTime
   */
  private static convertirFecha(fechaStr: string): DateTime | null {
    if (!fechaStr) return null

    // Intentar formato DD/MM/YYYY
    const partes = fechaStr.split('/')
    if (partes.length === 3) {
      const [dia, mes, anio] = partes
      const fecha = DateTime.fromObject({
        day: parseInt(dia),
        month: parseInt(mes),
        year: parseInt(anio),
      })
      if (fecha.isValid) return fecha
    }

    // Intentar formato YYYY-MM-DD
    const fecha = DateTime.fromISO(fechaStr)
    if (fecha.isValid) return fecha

    // Intentar parseo genérico
    const fechaDate = new Date(fechaStr)
    if (!isNaN(fechaDate.getTime())) {
      return DateTime.fromJSDate(fechaDate)
    }

    return null
  }

  /**
   * Extraer número de curso alfanumérico (2A → 2, 11-2 → 11)
   */
  private static extraerNumeroCurso(cursoStr: string): string {
    if (!cursoStr) return ''
    
    // Extraer solo los dígitos del inicio
    const match = cursoStr.match(/^(\d+)/)
    return match ? match[1] : cursoStr
  }

  /**
   * Normalizar texto a minúsculas
   */
  private static normalizarTexto(texto: string): string {
    return texto.trim().toLowerCase()
  }

  /**
   * Parsear archivo de acudientes
   */
  static parseAcudientesFile(buffer: Buffer): ParseAcudientesResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const data = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })

    const validRows: AcudienteExcelRow[] = []
    const invalidRows: Array<{
      archivo: string
      fila: number
      campo: string
      valor: any
      mensaje: string
    }> = []
    const documentosVistos = new Set<string>()
    const correosVistos = new Set<string>()

    data.forEach((row, index) => {
      const rowNumber = index + 2
      const errors: Array<{ campo: string; valor: any; mensaje: string }> = []

      // Normalizar nombres de columnas
      const normalizedRow: any = {}
      Object.keys(row).forEach((key) => {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_')
        normalizedRow[normalizedKey] = row[key]
      })

      // Extraer campos
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
      const parentesco = String(normalizedRow.parentesco || normalizedRow.relacion || '').trim()
      const ocupacion = String(normalizedRow.ocupacion || '').trim()

      // Validaciones
      if (!tipoDocumento) {
        errors.push({ campo: 'tipo_documento', valor: tipoDocumento, mensaje: 'Campo requerido' })
      }
      if (!numeroDocumento) {
        errors.push({ campo: 'numero_documento', valor: numeroDocumento, mensaje: 'Campo requerido' })
      }
      if (!nombres) {
        errors.push({ campo: 'nombres', valor: nombres, mensaje: 'Campo requerido' })
      }
      if (!apellidos) {
        errors.push({ campo: 'apellidos', valor: apellidos, mensaje: 'Campo requerido' })
      }
      if (!parentesco) {
        errors.push({ campo: 'parentesco', valor: parentesco, mensaje: 'Campo requerido' })
      }

      // Validar duplicados
      if (numeroDocumento && documentosVistos.has(numeroDocumento)) {
        errors.push({ campo: 'numero_documento', valor: numeroDocumento, mensaje: 'Documento duplicado en el archivo' })
      } else if (numeroDocumento) {
        documentosVistos.add(numeroDocumento)
      }

      // Validar email
      if (correo) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(correo)) {
          errors.push({ campo: 'correo', valor: correo, mensaje: 'Email inválido' })
        } else if (correosVistos.has(correo)) {
          errors.push({ campo: 'correo', valor: correo, mensaje: 'Correo duplicado en el archivo' })
        } else {
          correosVistos.add(correo)
        }
      }

      // Validar teléfono (10 dígitos)
      if (telefono && !/^\d{10}$/.test(telefono)) {
        errors.push({ campo: 'telefono', valor: telefono, mensaje: 'Debe tener 10 dígitos' })
      }

      if (errors.length > 0) {
        errors.forEach((err) => {
          invalidRows.push({
            archivo: 'acudientes',
            fila: rowNumber,
            campo: err.campo,
            valor: err.valor,
            mensaje: err.mensaje,
          })
        })
      } else {
        validRows.push({
          nombres,
          apellidos,
          numeroDocumento,
          tipoDocumento: this.normalizarTexto(tipoDocumento),
          telefono: telefono || undefined,
          correo: correo || undefined,
          direccion: direccion || undefined,
          parentesco: this.normalizarTexto(parentesco),
          ocupacion: ocupacion || undefined,
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
   * Parsear archivo de estudiantes
   */
  static parseEstudiantesFile(buffer: Buffer, acudientesDocumentos: Set<string>): ParseEstudiantesResult {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    const data = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })

    const validRows: EstudianteDualRow[] = []
    const invalidRows: Array<{
      archivo: string
      fila: number
      campo: string
      valor: any
      mensaje: string
    }> = []
    const documentosVistos = new Set<string>()

    data.forEach((row, index) => {
      const rowNumber = index + 2
      const errors: Array<{ campo: string; valor: any; mensaje: string }> = []

      // Normalizar nombres de columnas
      const normalizedRow: any = {}
      Object.keys(row).forEach((key) => {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_')
        normalizedRow[normalizedKey] = row[key]
      })

      // Extraer campos
      const tipoDocumento = String(
        normalizedRow.tipo_documento || normalizedRow.tipodocumento || normalizedRow.tipo_doc || ''
      ).trim()
      
      const numeroDocumento = String(
        normalizedRow.numero_documento || normalizedRow.numerodocumento || normalizedRow.documento || ''
      ).trim()
      
      const nombres = String(normalizedRow.nombres || normalizedRow.nombre || '').trim()
      const apellidos = String(normalizedRow.apellidos || normalizedRow.apellido || '').trim()
      
      const fechaNacimientoStr = String(
        normalizedRow.fecha_de_nacimiento || normalizedRow.fecha_nacimiento || normalizedRow.fechanacimiento || ''
      ).trim()
      
      const sexo = String(normalizedRow.sexo || normalizedRow.genero || '').trim()
      const curso = String(normalizedRow.curso || normalizedRow.grado || '').trim()
      
      const documentoAcudiente = String(
        normalizedRow.documento_acudiente || normalizedRow.documentoacudiente || normalizedRow.acudiente_documento || ''
      ).trim()
      
      const nombresAcudiente = String(
        normalizedRow.nombres_acudiente || normalizedRow.nombresacudiente || normalizedRow.acudiente_nombres || ''
      ).trim()

      // Validaciones
      if (!tipoDocumento) {
        errors.push({ campo: 'tipo_documento', valor: tipoDocumento, mensaje: 'Campo requerido' })
      }
      if (!numeroDocumento) {
        errors.push({ campo: 'numero_documento', valor: numeroDocumento, mensaje: 'Campo requerido' })
      }
      if (!nombres) {
        errors.push({ campo: 'nombres', valor: nombres, mensaje: 'Campo requerido' })
      }
      if (!apellidos) {
        errors.push({ campo: 'apellidos', valor: apellidos, mensaje: 'Campo requerido' })
      }
      if (!curso) {
        errors.push({ campo: 'curso', valor: curso, mensaje: 'Campo requerido' })
      }
      if (!documentoAcudiente) {
        errors.push({ campo: 'documento_acudiente', valor: documentoAcudiente, mensaje: 'Campo requerido' })
      }

      // Validar duplicados
      if (numeroDocumento && documentosVistos.has(numeroDocumento)) {
        errors.push({ campo: 'numero_documento', valor: numeroDocumento, mensaje: 'Documento duplicado en el archivo' })
      } else if (numeroDocumento) {
        documentosVistos.add(numeroDocumento)
      }

      // Validar que el acudiente exista en el archivo de acudientes
      if (documentoAcudiente && !acudientesDocumentos.has(documentoAcudiente)) {
        errors.push({ campo: 'documento_acudiente', valor: documentoAcudiente, mensaje: 'Acudiente no encontrado en archivo de acudientes' })
      }

      // Validar y convertir fecha
      let fechaNacimiento: DateTime | null = null
      if (fechaNacimientoStr) {
        fechaNacimiento = this.convertirFecha(fechaNacimientoStr)
        if (!fechaNacimiento) {
          errors.push({ campo: 'fecha_nacimiento', valor: fechaNacimientoStr, mensaje: 'Formato de fecha inválido (use DD/MM/YYYY)' })
        }
      }

      if (errors.length > 0) {
        errors.forEach((err) => {
          invalidRows.push({
            archivo: 'estudiantes',
            fila: rowNumber,
            campo: err.campo,
            valor: err.valor,
            mensaje: err.mensaje,
          })
        })
      } else {
        validRows.push({
          nombres,
          apellidos,
          numeroDocumento,
          tipoDocumento: this.normalizarTexto(tipoDocumento),
          fechaNacimiento: fechaNacimiento || undefined,
          sexo: sexo ? sexo.toUpperCase()[0] : undefined,
          curso: this.extraerNumeroCurso(curso),
          documentoAcudiente,
          nombresAcudiente: nombresAcudiente || undefined,
        })
      }
    })

    return {
      validRows,
      invalidRows,
      totalRows: data.length,
    }
  }
}
