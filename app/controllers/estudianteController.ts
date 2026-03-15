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

  /**
   * Carga masiva de estudiantes con formato específico
   * POST /estudiantes/carga-masiva-simple
   */
  async cargaMasivaEstudiantes({ request, response }: HttpContext) {
    console.log('=== 🚀 INICIO CARGA MASIVA ESTUDIANTES ===')
    console.log('🕐 Hora de inicio:', new Date().toISOString())
    
    try {
      const archivo = request.file('archivo', {
        size: '10mb',
        extnames: ['xlsx', 'xls', 'csv']
      })

      console.log('📁 Validando archivo...')

      if (!archivo) {
        console.log('❌ ERROR: No se proporcionó ningún archivo')
        return response.badRequest({
          success: false,
          message: 'Se requiere un archivo Excel o CSV',
          error_type: 'NO_FILE',
          timestamp: new Date().toISOString()
        })
      }

      if (!archivo.isValid) {
        console.log('❌ ERROR: Archivo no válido:', archivo.errors)
        return response.badRequest({
          success: false,
          message: 'Archivo no válido',
          errors: archivo.errors,
          error_type: 'INVALID_FILE',
          timestamp: new Date().toISOString()
        })
      }

      console.log('✅ Archivo válido:', {
        nombre: archivo.clientName,
        tamaño: archivo.size,
        tipo: archivo.extname
      })

      // Mover archivo temporal
      const uploadsPath = app.makePath('uploads')
      const fileName = `estudiantes_${Date.now()}.${archivo.extname}`
      await archivo.move(uploadsPath, { name: fileName })

      console.log('📂 Archivo guardado temporalmente:', fileName)

      // Leer archivo Excel/CSV
      const xlsx = await import('xlsx')
      const filePath = app.makePath('uploads', fileName)
      const workbook = xlsx.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const datos = xlsx.utils.sheet_to_json(worksheet)

      console.log('📋 Archivo leído exitosamente')
      console.log('📊 Total de registros encontrados:', datos.length)
      console.log('📊 Hoja procesada:', sheetName)

      if (datos.length === 0) {
        console.log('⚠️ ADVERTENCIA: El archivo está vacío')
        return response.badRequest({
          success: false,
          message: 'El archivo no contiene registros',
          error_type: 'EMPTY_FILE',
          total_registros: 0,
          timestamp: new Date().toISOString()
        })
      }

      const resultados = {
        procesados: 0,
        exitosos: 0,
        errores: [] as Array<{ fila: number, error: string, datos: any, tipo: string }>
      }

      console.log('🔄 Iniciando procesamiento de registros...')

      // Procesar cada fila
      for (let i = 0; i < datos.length; i++) {
        const fila = i + 2 // Excel empieza en fila 2
        const registro = datos[i] as any
        resultados.procesados++

        console.log(`\n📝 Procesando fila ${fila}/${datos.length + 1}...`)

        try {
          // 🔥 MAPEAR COLUMNAS DEL EXCEL A VARIABLES DEL SISTEMA
          const datosMapeados = {
            // Datos básicos del estudiante
            estudiante_tipo_documento: registro['TIPO DOCUMENTO ESTUDIANTE'] || 'TI',
            estudiante_documento: registro['DOCUMENTO ESTUDIANTE'],
            estudiante_nombres: registro['NOMBRE ESTUDIANTE'],
            estudiante_apellidos: registro['APELLIDO ESTUDIANTE'],
            estudiante_fecha_nacimiento: registro['FECHA NACIMIENTO'],
            estudiante_sexo: registro['GENERO'] || 'M',
            estudiante_grado: registro['GRADO'],
            estudiante_curso: registro['CURSO'],
            
            // Datos de contacto y ubicación
            estudiante_direccion: registro['DIRECCION'],
            estudiante_barrio: registro['BARRIO'],
            estudiante_telefono: registro['TELEFONO'],
            estudiante_correo: registro['CORREO'],
            
            // Datos médicos
            estudiante_eps: registro['EPS'],
            estudiante_tipo_sangre: registro['TIPO SANGRE'],
            estudiante_rh: registro['RH'],
            estudiante_discapacidad: registro['DISCAPACIDAD'],
            estudiante_medicamentos: registro['MEDICAMENTOS'],
            estudiante_alergias: registro['ALERGIAS'],
            estudiante_enfermedades: registro['ENFERMEDADES']
          }

          console.log(`👤 Estudiante: ${datosMapeados.estudiante_nombres} ${datosMapeados.estudiante_apellidos}`)
          console.log(`🆔 Documento: ${datosMapeados.estudiante_documento}`)
          console.log(`📚 Curso: ${datosMapeados.estudiante_curso}`)

          // Validar campos requeridos
          if (!datosMapeados.estudiante_documento || !datosMapeados.estudiante_nombres || 
              !datosMapeados.estudiante_apellidos || !datosMapeados.estudiante_curso) {
            const error = 'Faltan campos requeridos (documento, nombres, apellidos, curso)'
            console.log(`❌ ERROR VALIDACIÓN: ${error}`)
            resultados.errores.push({
              fila,
              error,
              datos: datosMapeados,
              tipo: 'VALIDACION_CAMPOS'
            })
            continue
          }

          // Verificar si el estudiante ya existe
          console.log('🔍 Verificando si el estudiante ya existe...')
          const estudianteExistente = await Estudiante.query()
            .where('numero_documento', datosMapeados.estudiante_documento)
            .first()

          let estudiante: Estudiante

          if (estudianteExistente) {
            console.log('✅ Estudiante existente encontrado, actualizando...')
            // Actualizar estudiante existente
            estudiante = estudianteExistente
            estudiante.nombres = datosMapeados.estudiante_nombres
            estudiante.apellidos = datosMapeados.estudiante_apellidos
            estudiante.tipoDocumento = datosMapeados.estudiante_tipo_documento
            estudiante.cursoId = datosMapeados.estudiante_curso
            estudiante.fechaNacimiento = datosMapeados.estudiante_fecha_nacimiento ? 
              DateTime.fromJSDate(new Date(datosMapeados.estudiante_fecha_nacimiento)) : estudiante.fechaNacimiento
            estudiante.sexo = datosMapeados.estudiante_sexo
            estudiante.direccion = datosMapeados.estudiante_direccion
            estudiante.barrio = datosMapeados.estudiante_barrio
            estudiante.telefono = datosMapeados.estudiante_telefono
            estudiante.correoElectronico = datosMapeados.estudiante_correo
            estudiante.eps = datosMapeados.estudiante_eps
            estudiante.grupoSanguineo = datosMapeados.estudiante_tipo_sangre
            estudiante.rh = datosMapeados.estudiante_rh
            estudiante.discapacidad = datosMapeados.estudiante_discapacidad
            estudiante.medicamentos = datosMapeados.estudiante_medicamentos
            estudiante.alergias = datosMapeados.estudiante_alergias
            estudiante.enfermedades = datosMapeados.estudiante_enfermedades
            await estudiante.save()
            
            console.log(`✅ ESTUDIANTE ACTUALIZADO: ${estudiante.numeroDocumento} (${estudiante.nombres} ${estudiante.apellidos})`)
          } else {
            console.log('🆕 Creando nuevo estudiante...')
            
            // 🔥 VALIDAR QUE EXISTA EL CURSO
            if (!datosMapeados.estudiante_curso) {
              const error = 'El estudiante requiere un curso válido'
              console.log(`❌ ERROR CURSO: ${error}`)
              resultados.errores.push({
                fila,
                error,
                datos: datosMapeados,
                tipo: 'CURSO_REQUERIDO'
              })
              continue
            }

            // Verificar que el curso exista
            console.log(`🔍 Verificando existencia del curso ${datosMapeados.estudiante_curso}...`)
            const curso = await db.from('cursos')
              .where('id', datosMapeados.estudiante_curso)
              .first()

            if (!curso) {
              const error = `El curso ${datosMapeados.estudiante_curso} no existe`
              console.log(`❌ ERROR CURSO: ${error}`)
              resultados.errores.push({
                fila,
                error,
                datos: datosMapeados,
                tipo: 'CURSO_NO_EXISTE'
              })
              continue
            }

            console.log(`✅ Curso encontrado: ${curso.nombre} (ID: ${curso.id})`)

            // Crear nuevo estudiante
            estudiante = await Estudiante.create({
              nombres: datosMapeados.estudiante_nombres,
              apellidos: datosMapeados.estudiante_apellidos,
              tipoDocumento: datosMapeados.estudiante_tipo_documento,
              numeroDocumento: datosMapeados.estudiante_documento,
              cursoId: datosMapeados.estudiante_curso,
              fechaNacimiento: datosMapeados.estudiante_fecha_nacimiento ? 
                DateTime.fromJSDate(new Date(datosMapeados.estudiante_fecha_nacimiento)) : undefined,
              sexo: datosMapeados.estudiante_sexo,
              direccion: datosMapeados.estudiante_direccion,
              barrio: datosMapeados.estudiante_barrio,
              telefono: datosMapeados.estudiante_telefono,
              correoElectronico: datosMapeados.estudiante_correo,
              eps: datosMapeados.estudiante_eps,
              grupoSanguineo: datosMapeados.estudiante_tipo_sangre,
              rh: datosMapeados.estudiante_rh,
              discapacidad: datosMapeados.estudiante_discapacidad,
              medicamentos: datosMapeados.estudiante_medicamentos,
              alergias: datosMapeados.estudiante_alergias,
              enfermedades: datosMapeados.estudiante_enfermedades
            })

            console.log(`🎉 ESTUDIANTE CREADO: ${estudiante.numeroDocumento} (${estudiante.nombres} ${estudiante.apellidos}) en curso ${curso.nombre}`)
          }

          resultados.exitosos++
          console.log(`✅ Fila ${fila} procesada exitosamente`)

        } catch (error) {
          console.error(`❌ ERROR PROCESANDO FILA ${fila}:`, error.message)
          resultados.errores.push({
            fila,
            error: error.message,
            datos: registro,
            tipo: 'ERROR_PROCESAMIENTO'
          })
        }
      }

      // Limpiar archivo temporal
      try {
        await import('fs').then(fs => fs.promises.unlink(filePath))
        console.log('🗑️ Archivo temporal eliminado')
      } catch (error) {
        console.log('⚠️ No se pudo eliminar archivo temporal:', error.message)
      }

      // 🎯 RESUMEN FINAL CON LOGS DETALLADOS
      console.log('\n=== 📊 RESUMEN FINAL CARGA MASIVA ===')
      console.log(`🕐 Hora de finalización:`, new Date().toISOString())
      console.log(`📋 Total registros procesados:`, resultados.procesados)
      console.log(`✅ Registros exitosos:`, resultados.exitosos)
      console.log(`❌ Registros con errores:`, resultados.errores.length)
      console.log(`📈 Tasa de éxito:`, `${((resultados.exitosos / resultados.procesados) * 100).toFixed(2)}%`)

      if (resultados.errores.length > 0) {
        console.log('\n🔍 DETALLE DE ERRORES:')
        resultados.errores.forEach((error, index) => {
          console.log(`${index + 1}. Fila ${error.fila}: ${error.tipo} - ${error.error}`)
        })
      }

      console.log('=== 🏁 FIN CARGA MASIVA ESTUDIANTES ===\n')

      // 📤 RESPUESTA ENRIQUECIDA PARA EL FRONTEND
      const respuestaFinal = {
        success: resultados.exitosos > 0,
        message: resultados.exitosos > 0 
          ? `Carga masiva completada: ${resultados.exitosos} de ${resultados.procesados} estudiantes procesados exitosamente`
          : 'No se pudo procesar ningún estudiante correctamente',
        data: {
          procesados: resultados.procesados,
          exitosos: resultados.exitosos,
          errores: resultados.errores.length,
          tasa_exito: ((resultados.exitosos / resultados.procesados) * 100).toFixed(2),
          errores_detalle: resultados.errores,
          timestamp_inicio: new Date().toISOString(),
          duracion_estimada: `${resultados.procesados * 0.5} segundos`
        },
        frontend_notifications: {
          success: resultados.exitosos > 0 ? {
            title: '¡Carga Exitosa!',
            message: `${resultados.exitosos} estudiantes procesados correctamente`,
            type: 'success',
            duration: 5000
          } : null,
          error: resultados.errores.length > 0 ? {
            title: 'Errores Detectados',
            message: `${resultados.errores.length} estudiantes no pudieron ser procesados`,
            type: 'warning',
            duration: 8000
          } : null,
          info: {
            title: 'Proceso Completado',
            message: `Total procesados: ${resultados.procesados} estudiantes`,
            type: 'info',
            duration: 3000
          }
        }
      }

      return response.ok(respuestaFinal)

    } catch (error) {
      console.error('❌ ERROR GENERAL EN CARGA MASIVA:', error)
      console.log('=== 🚨 ERROR CRÍTICO ===')
      console.log('🕐 Hora del error:', new Date().toISOString())
      console.log('📄 Error:', error.message)
      console.log('📍 Stack trace:', error.stack)
      console.log('=== 🚨 FIN ERROR CRÍTICO ===\n')

      return response.internalServerError({
        success: false,
        message: 'Error crítico en la carga masiva de estudiantes',
        error: error.message,
        error_type: 'CRITICAL_ERROR',
        timestamp: new Date().toISOString(),
        frontend_notifications: {
          error: {
            title: 'Error Crítico',
            message: 'Ocurrió un error inesperado. Por favor, contacta al administrador.',
            type: 'error',
            duration: 10000
          }
        }
      })
    }
  }

  /**
   * Carga masiva combinada de acudientes y estudiantes (mismo archivo, hojas separadas)
   * POST /estudiantes/carga-masiva-completa
   */
  async cargaMasivaCompleta({ request, response }: HttpContext) {
    console.log('=== 🚀 INICIO CARGA MASIVA COMBINADA (HOJAS SEPARADAS) ===')
    console.log('🕐 Hora de inicio:', new Date().toISOString())
    
    try {
      const archivo = request.file('archivo', {
        size: '15mb',
        extnames: ['xlsx', 'xls', 'csv']
      })

      console.log('📁 Validando archivo con hojas separadas...')

      if (!archivo) {
        console.log('❌ ERROR: No se proporcionó ningún archivo')
        return response.badRequest({
          success: false,
          message: 'Se requiere un archivo Excel con hojas separadas para acudientes y estudiantes',
          error_type: 'NO_FILE',
          timestamp: new Date().toISOString()
        })
      }

      if (!archivo.isValid) {
        console.log('❌ ERROR: Archivo no válido:', archivo.errors)
        return response.badRequest({
          success: false,
          message: 'Archivo no válido',
          errors: archivo.errors,
          error_type: 'INVALID_FILE',
          timestamp: new Date().toISOString()
        })
      }

      console.log('✅ Archivo válido:', {
        nombre: archivo.clientName,
        tamaño: archivo.size,
        tipo: archivo.extname
      })

      // Mover archivo temporal
      const uploadsPath = app.makePath('uploads')
      const fileName = `carga_completa_${Date.now()}.${archivo.extname}`
      await archivo.move(uploadsPath, { name: fileName })

      console.log('📂 Archivo guardado temporalmente:', fileName)

      // Leer archivo Excel/CSV
      const xlsx = await import('xlsx')
      const filePath = app.makePath('uploads', fileName)
      const fileBuffer = await readFile(filePath)
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' })

      console.log('📊 Hojas encontradas en el archivo:', workbook.SheetNames)

      // Buscar hojas específicas
      let hojaAcudientes = null
      let hojaEstudiantes = null

      // Nombres de hojas esperados (en diferentes idiomas/formatos)
      const nombresHojaAcudientes = ['acudientes', 'Acudientes', 'ACUDIENTES', 'guardians', 'Guardians', 'GUARDIANS']
      const nombresHojaEstudiantes = ['estudiantes', 'Estudiantes', 'ESTUDIANTES', 'students', 'Students', 'STUDENTS']

      // Encontrar hoja de acudientes
      for (const nombreHoja of workbook.SheetNames) {
        if (nombresHojaAcudientes.includes(nombreHoja)) {
          hojaAcudientes = nombreHoja
          break
        }
      }

      // Encontrar hoja de estudiantes
      for (const nombreHoja of workbook.SheetNames) {
        if (nombresHojaEstudiantes.includes(nombreHoja)) {
          hojaEstudiantes = nombreHoja
          break
        }
      }

      // Si no encuentra hojas específicas, usar la primera y segunda hoja
      if (!hojaAcudientes && workbook.SheetNames.length >= 1) {
        hojaAcudientes = workbook.SheetNames[0]
        console.log('⚠️ Hoja de acudientes no encontrada por nombre, usando primera hoja:', hojaAcudientes)
      }

      if (!hojaEstudiantes && workbook.SheetNames.length >= 2) {
        hojaEstudiantes = workbook.SheetNames[1]
        console.log('⚠️ Hoja de estudiantes no encontrada por nombre, usando segunda hoja:', hojaEstudiantes)
      }

      if (!hojaAcudientes) {
        console.log('❌ ERROR: No se encontró hoja de acudientes')
        return response.badRequest({
          success: false,
          message: 'No se encontró hoja de acudientes. Nombres esperados: ' + nombresHojaAcudientes.join(', '),
          error_type: 'NO_ACUDIENTES_SHEET',
          timestamp: new Date().toISOString()
        })
      }

      if (!hojaEstudiantes) {
        console.log('❌ ERROR: No se encontró hoja de estudiantes')
        return response.badRequest({
          success: false,
          message: 'No se encontró hoja de estudiantes. Nombres esperados: ' + nombresHojaEstudiantes.join(', '),
          error_type: 'NO_ESTUDIANTES_SHEET',
          timestamp: new Date().toISOString()
        })
      }

      console.log('✅ Hojas identificadas:')
      console.log('  👤 Hoja de Acudientes:', hojaAcudientes)
      console.log('  👨‍🎓 Hoja de Estudiantes:', hojaEstudiantes)

      // Procesar hoja de acudientes
      console.log('\n🔄 PROCESANDO HOJA DE ACUDIENTES...')
      const worksheetAcudientes = workbook.Sheets[hojaAcudientes]
      const datosAcudientes = xlsx.utils.sheet_to_json(worksheetAcudientes)
      console.log('📊 Total de acudientes encontrados:', datosAcudientes.length)

      // Procesar hoja de estudiantes
      console.log('\n🔄 PROCESANDO HOJA DE ESTUDIANTES...')
      const worksheetEstudiantes = workbook.Sheets[hojaEstudiantes]
      const datosEstudiantes = xlsx.utils.sheet_to_json(worksheetEstudiantes)
      console.log('📊 Total de estudiantes encontrados:', datosEstudiantes.length)

      if (datosAcudientes.length === 0 && datosEstudiantes.length === 0) {
        console.log('⚠️ ADVERTENCIA: Ambas hojas están vacías')
        return response.badRequest({
          success: false,
          message: 'Las hojas de acudientes y estudiantes están vacías',
          error_type: 'EMPTY_FILES',
          timestamp: new Date().toISOString()
        })
      }

      const resultados = {
        procesados: 0,
        acudientes: {
          procesados: datosAcudientes.length,
          exitosos: 0,
          errores: [] as Array<{ fila: number, error: string, datos: any, tipo: string }>
        },
        estudiantes: {
          procesados: datosEstudiantes.length,
          exitosos: 0,
          errores: [] as Array<{ fila: number, error: string, datos: any, tipo: string }>
        }
      }

      // 🔄 PROCESAR ACUDIENTES
      if (datosAcudientes.length > 0) {
        console.log('\n=== PROCESANDO ACUDIENTES ===')
        
        for (let i = 0; i < datosAcudientes.length; i++) {
          const fila = i + 2 // Excel empieza en fila 2
          const registro = datosAcudientes[i] as any
          resultados.procesados++

          console.log(`\n📝 Procesando acudiente fila ${fila}/${datosAcudientes.length + 1}...`)

          try {
            // 🔥 MAPEAR COLUMNAS DEL EXCEL PARA ACUDIENTES
            console.log('📋 Columnas encontradas en acudientes:', Object.keys(registro))
            
            const datosMapeados = {
              acudiente_tipo_documento: registro['TIPO DOCUMENTO'] || 'CC',
              acudiente_numero_documento: registro['NUMERO DOCUMENTO'],
              acudiente_nombres: registro['NOMBRES'],
              acudiente_apellidos: registro['APELLIDOS'],
              acudiente_correo: registro['CORREO'],
              acudiente_celular: registro['TELEFONO'],
              acudiente_parentesco: registro['PARENTESCO'] || 'Padre',
              acudiente_ocupacion: registro['OCUPACION'],
              acudiente_direccion: registro['DIRECCION']
            }

            console.log('📊 Datos mapeados de acudiente:', datosMapeados)

            console.log(`👤 Acudiente: ${datosMapeados.acudiente_nombres} ${datosMapeados.acudiente_apellidos}`)
            console.log(`🆔 Documento: ${datosMapeados.acudiente_numero_documento}`)

            // Validar campos requeridos
            if (!datosMapeados.acudiente_numero_documento || !datosMapeados.acudiente_nombres || 
                !datosMapeados.acudiente_apellidos || !datosMapeados.acudiente_celular) {
              const error = 'Faltan campos requeridos (documento, nombres, apellidos, teléfono)'
              console.log(`❌ ERROR VALIDACIÓN: ${error}`)
              resultados.acudientes.errores.push({
                fila,
                error,
                datos: datosMapeados,
                tipo: 'VALIDACION_CAMPOS'
              })
              continue
            }

            // Verificar si el acudiente ya existe
            const acudienteExistente = await Acudiente.query()
              .where('numero_documento', datosMapeados.acudiente_numero_documento)
              .first()

            let acudiente: any

            if (acudienteExistente) {
              console.log('✅ Acudiente existente encontrado, actualizando...')
              acudiente = acudienteExistente
              acudiente.nombres = datosMapeados.acudiente_nombres
              acudiente.apellidos = datosMapeados.acudiente_apellidos
              acudiente.tipoDocumento = datosMapeados.acudiente_tipo_documento
              acudiente.telefono = datosMapeados.acudiente_celular
              acudiente.correo = datosMapeados.acudiente_correo
              acudiente.parentesco = datosMapeados.acudiente_parentesco
              acudiente.ocupacion = datosMapeados.acudiente_ocupacion
              acudiente.direccion = datosMapeados.acudiente_direccion
              await acudiente.save()
              
              console.log(`✅ ACUDIENTE ACTUALIZADO: ${acudiente.numeroDocumento} (${acudiente.nombres} ${acudiente.apellidos})`)
            } else {
              console.log('🆕 Creando nuevo acudiente...')
              
              // Crear usuario para el acudiente primero
              const hash = await import('@adonisjs/core/services/hash')
              const contrasenaTemporal = String(datosMapeados.acudiente_numero_documento).toUpperCase() // 🔥 CONTRASEÑA = DOCUMENTO EN MAYÚSCULAS
              
              // 🔥 VERIFICAR SI EL USUARIO YA EXISTE (buscar por teléfono)
              const usuarioExistente = await Usuario.query()
                .where('correo', datosMapeados.acudiente_celular) // 🔥 USAR CELULAR COMO CORREO/USUARIO
                .first()

              let usuarioAcudiente: any

              if (usuarioExistente) {
                console.log('✅ Usuario ya existe, actualizando contraseña...')
                usuarioAcudiente = usuarioExistente
                
                // 🔥 ACTUALIZAR CONTRASEÑA AL NUEVO FORMATO (documento en mayúsculas)
                console.log('📋 Documento del Excel:', datosMapeados.acudiente_numero_documento)
                console.log('📋 Celular del Excel (usuario):', datosMapeados.acudiente_celular)
                console.log('🔑 Nueva contraseña a generar:', contrasenaTemporal)
                console.log('🔢 Longitud nueva contraseña:', contrasenaTemporal.length)
                
                usuarioAcudiente.contrasenaHash = await hash.default.make(contrasenaTemporal)
                usuarioAcudiente.debeCambiarContrasena = true
                await usuarioAcudiente.save()
                
                console.log('✅ Contraseña actualizada para:', usuarioExistente.correo)
                console.log('🔐 Nueva contraseña:', contrasenaTemporal)
                console.log('🔢 Longitud final:', contrasenaTemporal.length)
              } else {
                console.log('🆕 Creando nuevo usuario para acudiente...')
                console.log('🔑 Contraseña temporal generada:', contrasenaTemporal)
                
                usuarioAcudiente = await Usuario.create({
                  correo: datosMapeados.acudiente_celular, // 🔥 USAR CELULAR COMO CORREO/USUARIO
                  contrasenaHash: await hash.default.make(contrasenaTemporal),
                  rolId: 4, // Rol de acudiente
                  estaActivo: true,
                  debeCambiarContrasena: true
                })
                console.log(`✅ Usuario creado para acudiente: ${usuarioAcudiente.correo}`)
                console.log(`🔐 Contraseña para el acudiente: ${contrasenaTemporal}`)
              }

              // Crear nuevo acudiente con usuarioId
              acudiente = await Acudiente.create({
                nombres: datosMapeados.acudiente_nombres,
                apellidos: datosMapeados.acudiente_apellidos,
                tipoDocumento: datosMapeados.acudiente_tipo_documento,
                numeroDocumento: datosMapeados.acudiente_numero_documento,
                telefono: datosMapeados.acudiente_celular,
                correo: datosMapeados.acudiente_correo,
                parentesco: datosMapeados.acudiente_parentesco,
                ocupacion: datosMapeados.acudiente_ocupacion,
                direccion: datosMapeados.acudiente_direccion,
                usuarioId: usuarioAcudiente.id // 🔥 IMPORTANTE: Vincular con usuario
              })

              console.log(`🎉 ACUDIENTE CREADO: ${acudiente.numeroDocumento} (${acudiente.nombres} ${acudiente.apellidos})`)
            }

            resultados.acudientes.exitosos++
            console.log(`✅ Acudiente de fila ${fila} procesado exitosamente`)

          } catch (error) {
            console.error(`❌ ERROR PROCESANDO ACUDIENTE FILA ${fila}:`, error.message)
            resultados.acudientes.errores.push({
              fila,
              error: error.message,
              datos: registro,
              tipo: 'ERROR_ACUDIENTE'
            })
          }
        }
      }

      // 🔄 PROCESAR ESTUDIANTES
      if (datosEstudiantes.length > 0) {
        console.log('\n=== PROCESANDO ESTUDIANTES ===')
        
        for (let i = 0; i < datosEstudiantes.length; i++) {
          const fila = i + 2 // Excel empieza en fila 2
          const registro = datosEstudiantes[i] as any
          resultados.procesados++

          console.log(`\n📝 Procesando estudiante fila ${fila}/${datosEstudiantes.length + 1}...`)

          try {
            // 🔥 MAPEAR COLUMNAS DEL EXCEL PARA ESTUDIANTES
            console.log('📋 Columnas encontradas en estudiantes:', Object.keys(registro))
            
            const datosMapeados = {
              // Datos básicos del estudiante
              estudiante_tipo_documento: registro['TIPO DOCUMENTO'] || 'TI',
              estudiante_documento: registro['NUMERO DOCUMENTO'],
              estudiante_nombres: registro['NOMBRES'],
              estudiante_apellidos: registro['APELLIDOS'],
              estudiante_fecha_nacimiento: registro['FECHA DE NACIMIENTO'], // ✅ CORREGIDO: Sin guion bajo
              estudiante_sexo: registro['SEXO'] || 'M',
              estudiante_grado: registro['GRADO'],
              estudiante_curso: registro['CURSO '] || registro['CURSO'], // 🔥 IMPORTANTE: "CURSO " con espacio
              
              // 🔥 DATOS DEL ACUDIENTE (para vinculación)
              estudiante_documento_acudiente: registro['DOCUMENTO ACUDIENTE'],
              estudiante_nombres_acudiente: registro['NOMBRES ACUDIENTE'],
              
              // Datos de contacto y ubicación
              estudiante_direccion: registro['DIRECCION'],
              estudiante_barrio: registro['BARRIO'],
              estudiante_telefono: registro['TELEFONO'],
              estudiante_correo: registro['CORREO'],
              
              // Datos médicos
              estudiante_eps: registro['EPS'],
              estudiante_tipo_sangre: registro['TIPO SANGRE'],
              estudiante_rh: registro['RH'],
              estudiante_discapacidad: registro['DISCAPACIDAD'],
              estudiante_medicamentos: registro['MEDICAMENTOS'],
              estudiante_alergias: registro['ALERGIAS'],
              estudiante_enfermedades: registro['ENFERMEDADES']
            }

            console.log('📊 Datos mapeados de estudiante:', datosMapeados)

            console.log(`👨‍🎓 Estudiante: ${datosMapeados.estudiante_nombres} ${datosMapeados.estudiante_apellidos}`)
            console.log(`🆔 Documento: ${datosMapeados.estudiante_documento}`)
            console.log(`📚 Curso: ${datosMapeados.estudiante_curso}`)

            // Validar campos requeridos
            if (!datosMapeados.estudiante_documento || !datosMapeados.estudiante_nombres || 
                !datosMapeados.estudiante_apellidos || !datosMapeados.estudiante_curso) {
              const error = 'Faltan campos requeridos (documento, nombres, apellidos, curso)'
              console.log(`❌ ERROR VALIDACIÓN: ${error}`)
              resultados.estudiantes.errores.push({
                fila,
                error,
                datos: datosMapeados,
                tipo: 'VALIDACION_CAMPOS'
              })
              continue
            }

            // Verificar si el estudiante ya existe
            const estudianteExistente = await Estudiante.query()
              .where('numero_documento', datosMapeados.estudiante_documento)
              .first()

            let estudiante: any

            if (estudianteExistente) {
              console.log('✅ Estudiante existente encontrado, actualizando...')
              
              // 🔥 BUSCAR CURSO ANTES DE ACTUALIZAR (igual que para nuevos)
              if (!datosMapeados.estudiante_curso) {
                throw new Error('El estudiante requiere un curso válido')
              }

              console.log(`🔍 Buscando curso para actualización: ${datosMapeados.estudiante_curso}`)

              // 🔥 BUSCAR CURSO POR VÍAS MÚLTIPLES
              let curso = null

              // 1. Intentar como ID numérico
              if (!isNaN(Number(datosMapeados.estudiante_curso))) {
                curso = await db.from('cursos')
                  .where('id', Number(datosMapeados.estudiante_curso))
                  .first()
                
                if (curso) {
                  console.log(`✅ Curso encontrado por ID: ${curso.nombre} (ID: ${curso.id})`)
                }
              }

              // 2. Si no encontró por ID, buscar por nombre o código
              if (!curso) {
                curso = await db.from('cursos')
                  .where('nombre', datosMapeados.estudiante_curso)
                  .orWhereRaw('LOWER(nombre) = ?', [datosMapeados.estudiante_curso.toLowerCase()])
                  .orWhereRaw('LOWER(nombre) LIKE ?', [`%${datosMapeados.estudiante_curso.toLowerCase()}%`])
                  .first()
                
                if (curso) {
                  console.log(`✅ Curso encontrado por nombre: ${curso.nombre} (ID: ${curso.id})`)
                }
              }

              // 3. Si aún no encuentra, buscar en otros campos
              if (!curso) {
                curso = await db.from('cursos')
                  .whereRaw('LOWER(jornada) = ?', [datosMapeados.estudiante_curso.toLowerCase()])
                  .orWhereRaw('LOWER(grado) = ?', [datosMapeados.estudiante_curso.toLowerCase()])
                  .first()
                
                if (curso) {
                  console.log(`✅ Curso encontrado por otros campos: ${curso.nombre} (ID: ${curso.id})`)
                }
              }

              if (!curso) {
                throw new Error(`No se encontró ningún curso con: "${datosMapeados.estudiante_curso}". Por favor, verifica el código del curso.`)
              }

              // Ahora actualizar con el ID correcto del curso
              estudiante = estudianteExistente
              estudiante.nombres = datosMapeados.estudiante_nombres
              estudiante.apellidos = datosMapeados.estudiante_apellidos
              estudiante.tipoDocumento = datosMapeados.estudiante_tipo_documento
              estudiante.cursoId = curso.id // 🔥 IMPORTANTE: Usar ID del curso encontrado
              estudiante.fechaNacimiento = datosMapeados.estudiante_fecha_nacimiento ? 
                DateTime.fromJSDate(new Date(datosMapeados.estudiante_fecha_nacimiento)) : estudiante.fechaNacimiento
              estudiante.sexo = datosMapeados.estudiante_sexo
              estudiante.eps = datosMapeados.estudiante_eps
              estudiante.grupoSanguineo = datosMapeados.estudiante_tipo_sangre
              estudiante.rh = datosMapeados.estudiante_rh
              await estudiante.save()
              
              console.log(`✅ ESTUDIANTE ACTUALIZADO: ${estudiante.numeroDocumento} (${estudiante.nombres} ${estudiante.apellidos})`)
            } else {
              console.log('🆕 Creando nuevo estudiante...')
              
              // Validar que exista el curso (aceptando cualquier formato: ID, código, nombre)
              if (!datosMapeados.estudiante_curso) {
                throw new Error('El estudiante requiere un curso válido')
              }

              console.log(`🔍 Buscando curso con código/nombre/ID: ${datosMapeados.estudiante_curso}`)

              // 🔥 BUSCAR CURSO POR VÍAS MÚLTIPLES
              let curso = null

              // 1. Intentar como ID numérico
              if (!isNaN(Number(datosMapeados.estudiante_curso))) {
                curso = await db.from('cursos')
                  .where('id', Number(datosMapeados.estudiante_curso))
                  .first()
                
                if (curso) {
                  console.log(`✅ Curso encontrado por ID: ${curso.nombre} (ID: ${curso.id})`)
                }
              }

              // 2. Si no encontró por ID, buscar por nombre o código
              if (!curso) {
                curso = await db.from('cursos')
                  .where('nombre', datosMapeados.estudiante_curso)
                  .orWhereRaw('LOWER(nombre) = ?', [datosMapeados.estudiante_curso.toLowerCase()])
                  .orWhereRaw('LOWER(nombre) LIKE ?', [`%${datosMapeados.estudiante_curso.toLowerCase()}%`])
                  .first()
                
                if (curso) {
                  console.log(`✅ Curso encontrado por nombre: ${curso.nombre} (ID: ${curso.id})`)
                }
              }

              // 3. Si aún no encuentra, buscar en otros campos
              if (!curso) {
                curso = await db.from('cursos')
                  .whereRaw('LOWER(jornada) = ?', [datosMapeados.estudiante_curso.toLowerCase()])
                  .orWhereRaw('LOWER(grado) = ?', [datosMapeados.estudiante_curso.toLowerCase()])
                  .first()
                
                if (curso) {
                  console.log(`✅ Curso encontrado por otros campos: ${curso.nombre} (ID: ${curso.id})`)
                }
              }

              if (!curso) {
                throw new Error(`No se encontró ningún curso con: "${datosMapeados.estudiante_curso}". Por favor, verifica el código del curso.`)
              }

              // Crear nuevo estudiante
              estudiante = await Estudiante.create({
                nombres: datosMapeados.estudiante_nombres,
                apellidos: datosMapeados.estudiante_apellidos,
                tipoDocumento: datosMapeados.estudiante_tipo_documento,
                numeroDocumento: datosMapeados.estudiante_documento,
                cursoId: curso.id, // 🔥 IMPORTANTE: Usar el ID del curso encontrado
                fechaNacimiento: datosMapeados.estudiante_fecha_nacimiento ? 
                  DateTime.fromJSDate(new Date(datosMapeados.estudiante_fecha_nacimiento)) : undefined,
                sexo: datosMapeados.estudiante_sexo,
                eps: datosMapeados.estudiante_eps,
                grupoSanguineo: datosMapeados.estudiante_tipo_sangre,
                rh: datosMapeados.estudiante_rh
              })

              console.log(`🎉 ESTUDIANTE CREADO: ${estudiante.numeroDocumento} (${estudiante.nombres} ${estudiante.apellidos}) en curso ${curso.nombre}`)
            }

            // 🔥 VINCULAR ACUDIENTE CON ESTUDIANTE (tabla pivot)
            try {
              // Buscar el acudiente por el documento del estudiante
              const acudienteAsociado = await Acudiente.query()
                .where('numero_documento', datosMapeados.estudiante_documento_acudiente)
                .first()

              if (acudienteAsociado) {
                // Verificar si ya existe el vínculo
                const vinculoExistente = await db.from('estudiante_acudiente')
                  .where('estudiante_id', estudiante.id)
                  .where('acudiente_id', acudienteAsociado.id)
                  .first()

                if (!vinculoExistente) {
                  // Crear el vínculo
                  await db.table('estudiante_acudiente').insert({
                    estudiante_id: estudiante.id,
                    acudiente_id: acudienteAsociado.id,
                    relacion: datosMapeados.estudiante_nombres_acudiente || 'ACUDIENTE' // 🔥 AGREGAR RELACIÓN
                  })
                  console.log(`🔗 VÍNCULO CREADO: Estudiante ${estudiante.numeroDocumento} ↔ Acudiente ${acudienteAsociado.numeroDocumento}`)
                } else {
                  console.log(`🔗 VÍNCULO YA EXISTE: Estudiante ${estudiante.numeroDocumento} ↔ Acudiente ${acudienteAsociado.numeroDocumento}`)
                }
              } else {
                console.log(`⚠️ No se encontró acudiente con documento: ${datosMapeados.estudiante_documento_acudiente}`)
              }
            } catch (error) {
              console.log(`⚠️ Error al vincular acudiente-estudiante:`, error.message)
            }

            resultados.estudiantes.exitosos++
            console.log(`✅ Estudiante de fila ${fila} procesado exitosamente`)

          } catch (error) {
            console.error(`❌ ERROR PROCESANDO ESTUDIANTE FILA ${fila}:`, error.message)
            resultados.estudiantes.errores.push({
              fila,
              error: error.message,
              datos: registro,
              tipo: 'ERROR_ESTUDIANTE'
            })
          }
        }
      }

      // Limpiar archivo temporal
      try {
        await import('fs').then(fs => fs.promises.unlink(filePath))
        console.log('🗑️ Archivo temporal eliminado')
      } catch (error) {
        console.log('⚠️ No se pudo eliminar archivo temporal:', error.message)
      }

      // 🎯 RESUMEN FINAL COMBINADO
      const totalExitosos = resultados.acudientes.exitosos + resultados.estudiantes.exitosos
      const totalErrores = resultados.acudientes.errores.length + resultados.estudiantes.errores.length

      console.log('\n=== 📊 RESUMEN FINAL CARGA MASIVA COMBINADA ===')
      console.log(`🕐 Hora de finalización:`, new Date().toISOString())
      console.log(`📊 Hojas procesadas: ${hojaAcudientes} (acudientes), ${hojaEstudiantes} (estudiantes)`)
      console.log(`👤 Acudientes procesados: ${resultados.acudientes.procesados}`)
      console.log(`👤 Acudientes exitosos:`, resultados.acudientes.exitosos)
      console.log(`👨‍🎓 Estudiantes procesados: ${resultados.estudiantes.procesados}`)
      console.log(`👨‍🎓 Estudiantes exitosos:`, resultados.estudiantes.exitosos)
      console.log(`❌ Errores de acudientes:`, resultados.acudientes.errores.length)
      console.log(`❌ Errores de estudiantes:`, resultados.estudiantes.errores.length)
      console.log(`📈 Tasa de éxito general:`, `${((totalExitosos / (resultados.acudientes.procesados + resultados.estudiantes.procesados)) * 100).toFixed(2)}%`)

      if (totalErrores > 0) {
        console.log('\n🔍 DETALLE DE ERRORES:')
        if (resultados.acudientes.errores.length > 0) {
          console.log('❌ Errores de Acudientes:')
          resultados.acudientes.errores.forEach((error, index) => {
            console.log(`  ${index + 1}. Fila ${error.fila}: ${error.tipo} - ${error.error}`)
          })
        }
        if (resultados.estudiantes.errores.length > 0) {
          console.log('❌ Errores de Estudiantes:')
          resultados.estudiantes.errores.forEach((error, index) => {
            console.log(`  ${index + 1}. Fila ${error.fila}: ${error.tipo} - ${error.error}`)
          })
        }
      }

      console.log('=== 🏁 FIN CARGA MASIVA COMBINADA ===\n')

      // 📤 RESPUESTA ENRIQUECIDA COMBINADA
      const respuestaFinal = {
        success: totalExitosos > 0,
        message: totalExitosos > 0 
          ? `Carga masiva combinada completada: ${resultados.acudientes.exitosos} acudientes y ${resultados.estudiantes.exitosos} estudiantes procesados exitosamente`
          : 'No se pudo procesar ningún registro correctamente',
        data: {
          hojas_procesadas: {
            acudientes: hojaAcudientes,
            estudiantes: hojaEstudiantes
          },
          acudientes: {
            procesados: resultados.acudientes.procesados,
            exitosos: resultados.acudientes.exitosos,
            errores: resultados.acudientes.errores.length
          },
          estudiantes: {
            procesados: resultados.estudiantes.procesados,
            exitosos: resultados.estudiantes.exitosos,
            errores: resultados.estudiantes.errores.length
          },
          total_exitosos: totalExitosos,
          total_errores: totalErrores,
          tasa_exito_general: ((totalExitosos / (resultados.acudientes.procesados + resultados.estudiantes.procesados)) * 100).toFixed(2),
          errores_detalle: {
            acudientes: resultados.acudientes.errores,
            estudiantes: resultados.estudiantes.errores
          },
          timestamp_inicio: new Date().toISOString()
        },
        frontend_notifications: {
          success: totalExitosos > 0 ? {
            title: '¡Carga Masiva Exitosa!',
            message: `${resultados.acudientes.exitosos} acudientes y ${resultados.estudiantes.exitosos} estudiantes procesados correctamente`,
            type: 'success',
            duration: 6000
          } : null,
          error: totalErrores > 0 ? {
            title: 'Errores Detectados',
            message: `${totalErrores} registros no pudieron ser procesados`,
            type: 'warning',
            duration: 10000
          } : null,
          info: {
            title: 'Proceso Completado',
            message: `Hojas procesadas: ${hojaAcudientes} y ${hojaEstudiantes}`,
            type: 'info',
            duration: 4000
          }
        }
      }

      return response.ok(respuestaFinal)

    } catch (error) {
      console.error('❌ ERROR GENERAL EN CARGA MASIVA COMPLETA:', error)
      console.log('=== 🚨 ERROR CRÍTICO ===')
      console.log('🕐 Hora del error:', new Date().toISOString())
      console.log('📄 Error:', error.message)
      console.log('📍 Stack trace:', error.stack)
      console.log('=== 🚨 FIN ERROR CRÍTICO ===\n')

      return response.internalServerError({
        success: false,
        message: 'Error crítico en la carga masiva combinada',
        error: error.message,
        error_type: 'CRITICAL_ERROR',
        timestamp: new Date().toISOString(),
        frontend_notifications: {
          error: {
            title: 'Error Crítico',
            message: 'Ocurrió un error inesperado. Por favor, contacta al administrador.',
            type: 'error',
            duration: 10000
          }
        }
      })
    }
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
        const detallesError = archivoEstudiantes.errors.map(error => ({
          campo: error.fieldName,
          mensaje: error.message
        }))
        
        return response.status(400).json({
          success: false,
          message: 'El archivo de estudiantes no cumple con los requisitos',
          detalles: 'Verifique que el archivo sea .xlsx, .xls o .csv y no exceda 10MB',
          errors: detallesError,
        })
      }

      if (!archivoAcudientes.isValid) {
        const detallesError = archivoAcudientes.errors.map(error => ({
          campo: error.fieldName,
          mensaje: error.message  
        }))
        
        return response.status(400).json({
          success: false,
          message: 'El archivo de acudientes no cumple con los requisitos',
          detalles: 'Verifique que el archivo sea .xlsx, .xls o .csv y no exceda 10MB',
          errors: detallesError,
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
          detalles: `Se procesaron ${resultadoAcudientes.totalRows} filas pero todas tienen errores`,
          data: {
            totalFilas: resultadoAcudientes.totalRows,
            filasValidas: 0,
            filasInvalidas: resultadoAcudientes.invalidRows.length,
            errores: resultadoAcudientes.invalidRows,
            columnasEsperadas: [
              'TIPO DOCUMENTO (o tipo_documento)',
              'NUMERO DOCUMENTO (o numero_documento)',
              'NOMBRES',
              'APELLIDOS',
              'TELEFONO (opcional, 10 dígitos)',
              'CORREO (opcional, formato email)',
              'DIRECCION (opcional)',
              'PARENTESCO (requerido)',
              'OCUPACION (opcional)'
            ]
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
          detalles: `Se procesaron ${resultadoEstudiantes.totalRows} filas pero todas tienen errores`,
          data: {
            totalFilas: resultadoEstudiantes.totalRows,
            filasValidas: 0,
            filasInvalidas: resultadoEstudiantes.invalidRows.length,
            errores: [
              ...resultadoAcudientes.invalidRows,
              ...resultadoEstudiantes.invalidRows,
            ],
            columnasEsperadas: [
              'TIPO DOCUMENTO (o tipo_documento)',
              'NUMERO DOCUMENTO (o numero_documento)',
              'NOMBRES',
              'APELLIDOS',
              'FECHA DE NACIMIENTO (formato: YYYY/MM/DD o DD/MM/YYYY)',
              'SEXO (M o F, opcional)',
              'CURSO (ejemplo: 2A, 11-2)',
              'DOCUMENTO ACUDIENTE (debe existir en archivo de acudientes)'
            ]
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
      
      // Proporcionar mensaje más detallado según el tipo de error
      let mensajeError = 'Error al procesar los archivos'
      let detalles = error.message
      
      if (error.message?.includes('ENOENT')) {
        mensajeError = 'No se pudo leer uno de los archivos'
        detalles = 'Verifique que los archivos se hayan cargado correctamente'
      } else if (error.message?.includes('Invalid file')) {
        mensajeError = 'Formato de archivo inválido'
        detalles = 'Asegúrese de que los archivos sean Excel (.xlsx, .xls) válidos'
      } else if (error.code === '23505') {
        mensajeError = 'Error de duplicados en la base de datos'
        detalles = 'Algunos registros ya existen en el sistema'
      }
      
      return response.status(500).json({
        success: false,
        message: mensajeError,
        detalles: detalles,
        errorTecnico: error.message,
      })
    }
  }
}

