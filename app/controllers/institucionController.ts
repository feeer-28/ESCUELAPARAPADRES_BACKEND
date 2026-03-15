import type { HttpContext } from '@adonisjs/core/http'
import Institucion from '#models/institucion'
import Funcionario from '#models/funcionario'
import Municipio from '#models/municipio'
import Grado from '#models/grado'
import Curso from '#models/curso'
import Docente from '#models/docente'
import Usuario from '#models/usuario'
import jwt from 'jsonwebtoken'
import hash from '@adonisjs/core/services/hash'
import env from '#start/env'



export default class InstitucionController {

  /**

   * Listar todas las instituciones

   * GET /instituciones

   */

  async index({ response }: HttpContext) {

    try {

      const instituciones = await Institucion.query()

        .preload('municipio', (municipioQuery) => {

          municipioQuery.preload('departamento')

        })

        .orderBy('id', 'desc')



      const institucionesFormateadas = instituciones.map((inst) => ({

        id: inst.id,

        nombre: inst.nombre,

        telefono: inst.telefono,

        correo: inst.correo,

        direccion: inst.direccion,

        naturaleza: inst.naturaleza,

        codigoDane: inst.codigoDane,

        nit: inst.nit,

        activo: true,

        municipioId: inst.municipioId,

        municipio: inst.municipio && {

          id: inst.municipio.id,

          nombre: inst.municipio.nombre,

          departamento: inst.municipio.departamento && {

            id: inst.municipio.departamento.id,

            nombre: inst.municipio.departamento.nombre,

          },

        },

      }))



      return response.status(200).json({

        success: true,

        data: institucionesFormateadas,

      })

    } catch (error) {

      console.error('Error al listar instituciones:', error)

      return response.status(500).json({

        success: false,

        message: 'Error al obtener instituciones',

        error: error.message,

      })

    }

  }



  /**

   * Obtener una institución específica con detalles completos

   * GET /instituciones/:id

   */

  async show({ params, response }: HttpContext) {

    try {

      console.log('🔍 DEBUG INSTITUCIÓN SHOW:')
      console.log('📋 params.id recibido:', params.id)
      console.log('📋 Tipo de params.id:', typeof params.id)
      console.log('📋 ¿Es NaN?:', isNaN(params.id))

      const institucion = await Institucion.query()

        .where('id', params.id)

        .preload('municipio', (municipioQuery) => {

          municipioQuery.preload('departamento')

        })

        .firstOrFail()



      return response.status(200).json({

        success: true,

        data: {

          id: institucion.id,

          nombre: institucion.nombre,

          telefono: institucion.telefono,

          correo: institucion.correo,

          direccion: institucion.direccion,

          naturaleza: institucion.naturaleza,

          codigoDane: institucion.codigoDane,

          nit: institucion.nit,

          activo: true,

          municipioId: institucion.municipioId,

          municipio: institucion.municipio && {

            id: institucion.municipio.id,

            nombre: institucion.municipio.nombre,

            departamento: institucion.municipio.departamento && {

              id: institucion.municipio.departamento.id,

              nombre: institucion.municipio.departamento.nombre,

            },

          },

        },

      })

    } catch (error) {

      console.error('Error al obtener institución:', error)

      return response.status(404).json({

        success: false,

        message: 'Institución no encontrada',

      })

    }

  }



  /**

   * Obtener directivos de una institución (coordinadores y orientadores)

   * GET /instituciones/:id/directivos

   */

  async directivos({ params, response }: HttpContext) {

    try {

      const institucion = await Institucion.findOrFail(params.id)



      // Obtener coordinadores (rolId: 3) y orientadores (rolId: 4)

      const funcionarios = await Funcionario.query()

        .where('institucion_id', institucion.id)

        .preload('usuario', (usuarioQuery) => {

          usuarioQuery.whereIn('rol_id', [3, 4]).where('esta_activo', true)

        })



      // Separar por rol

      const coordinadores: any[] = []

      const orientadores: any[] = []



      for (const func of funcionarios) {

        if (func.usuario) {

          const directivo = {

            id: func.id,

            nombre: func.nombre,

            apellido: func.apellido,

            telefono: func.telefono,

            correo: func.usuario.correo,

            activo: func.usuario.estaActivo,

            usuarioId: func.usuario.id,

          }



          if (func.usuario.rolId === 3) {

            coordinadores.push(directivo)

          } else if (func.usuario.rolId === 4) {

            orientadores.push(directivo)

          }

        }

      }



      return response.status(200).json({

        success: true,

        data: {

          coordinadores,

          orientadores,

        },

      })

    } catch (error) {

      console.error('Error al obtener directivos:', error)

      return response.status(404).json({

        success: false,

        message: 'Institución no encontrada',

      })

    }

  }



  /**

   * Obtener catálogos para formulario de creación de instituciones

   * GET /instituciones/catalogos

   */

  async catalogos({ response }: HttpContext) {

    try {

      // Obtener municipios con departamentos

      const municipios = await Municipio.query()

        .preload('departamento')

        .orderBy('nombre')



      // Catálogos estáticos

      const modalidades = [

        { id: "academica", nombre: "Académica" },

        { id: "tecnica", nombre: "Técnica" },

        { id: "artistica", nombre: "Artística" },

        { id: "deportiva", nombre: "Deportiva" },

        { id: "rural", nombre: "Rural" },

        { id: "bilingue", nombre: "Bilingüe" },

        { id: "integral", nombre: "Integral" }

      ]



      const jornadas = [

        { id: "manana", nombre: "Mañana" },

        { id: "tarde", nombre: "Tarde" },

        { id: "noche", nombre: "Noche" },

        { id: "unica", nombre: "Única" },

        { id: "completa", nombre: "Completa" },

        { id: "fin_semana", nombre: "Fin de Semana" }

      ]



      const naturaleza = [

        { id: "publica", nombre: "Pública" },

        { id: "privada", nombre: "Privada" }

      ]



      return response.status(200).json({

        success: true,

        data: {

          municipios: municipios.map(m => ({

            id: m.id,

            nombre: m.nombre,

            departamento: {

              id: m.departamento.id,

              nombre: m.departamento.nombre

            }

          })),

          modalidades,

          jornadas,

          naturaleza,

          nota: "Los niveles educativos se gestionan dinámicamente. Usa GET /niveles-educativos para ver los disponibles y POST /niveles-educativos para crear nuevos."

        }

      })

    } catch (error) {

      console.error('Error al obtener catálogos:', error)

      return response.status(500).json({

        success: false,

        error: 'Error al obtener catálogos',

        details: error.message

      })

    }

  }



  async store({ request, response }: HttpContext) {

    try {

      const payload = request.only([

        'nombre',

        'telefono',

        'correo',

        'direccion',

        'naturaleza',

        'municipioId',

        'codigoDane',

        'nit',

        'resolucionAprobacion',

        'nivelesEducativos',

        'modalidad',

        'jornadas',

        'telefonoPrincipal',

        'telefonoSecretaria',

        'correoInstitucional',

        'correoRectoria',

        'sitioWeb',

        'direccionCompleta',

        'barrio',

        'estrato',

        'coordenadasGps',

        'capacidadEstudiantes',

        'anoFundacion',

        'enfoquePedagogico',

        'confesional',

        'religion',

        'rectorNombre',

        'rectorDocumento',

        'rectorTelefono',

        'rectorCorreo',

      ])



      // Filtrar campos que no existen en la base de datos

      const payloadFiltrado = Object.fromEntries(

        Object.entries(payload).filter(([key, value]) => 

          !key.includes('Backend') && value !== undefined

        )

      )



      // Validar campos requeridos

      if (!payloadFiltrado.nombre) {

        return response.status(400).json({

          success: false,

          error: 'El nombre de la institución es requerido',

        })

      }



      if (!payloadFiltrado.naturaleza) {

        return response.status(400).json({

          success: false,

          error: 'La naturaleza de la institución es requerida',

        })

      }



      if (!payloadFiltrado.municipioId) {

        return response.status(400).json({

          success: false,

          error: 'El municipio es requerido',

        })

      }



      // Validar que naturaleza sea válida

      if (!['publica', 'privada'].includes(payloadFiltrado.naturaleza?.toLowerCase())) {

        return response.status(400).json({

          success: false,

          error: 'La naturaleza debe ser "publica" o "privada"',

        })

      }



      // Normalizar naturaleza

      payloadFiltrado.naturaleza = payloadFiltrado.naturaleza.toLowerCase()



      // Validar código DANE único (si se proporciona)

      if (payloadFiltrado.codigoDane) {

        const existente = await Institucion.query()

          .where('codigo_dane', payloadFiltrado.codigoDane)

          .first()

        

        if (existente) {

          return response.status(409).json({

            success: false,

            error: 'Ya existe una institución con este código DANE',

          })

        }

      }



      // Validar NIT único (si se proporciona)

      if (payloadFiltrado.nit) {

        const existente = await Institucion.query()

          .where('nit', payloadFiltrado.nit)

          .first()

        

        if (existente) {

          return response.status(409).json({

            success: false,

            error: 'Ya existe una institución con este NIT',

          })

        }

      }



      // Crear institución

      const institucion = await Institucion.create(payloadFiltrado)



      // Cargar relaciones para la respuesta

      await institucion.load('municipio', (municipioQuery) => {

        municipioQuery.preload('departamento')

      })



      return response.status(201).json({

        success: true,

        message: 'Institución creada exitosamente',

        institucion: {

          id: institucion.id,

          nombre: institucion.nombre,

          codigoDane: institucion.codigoDane,

          nit: institucion.nit,

          naturaleza: institucion.naturaleza,

          telefono: institucion.telefono,

          correo: institucion.correo,

          direccion: institucion.direccion,

          telefonoPrincipal: institucion.telefonoPrincipal,

          correoInstitucional: institucion.correoInstitucional,

          direccionCompleta: institucion.direccionCompleta,

          rectorNombre: institucion.rectorNombre,

          rectorDocumento: institucion.rectorDocumento,

          rectorTelefono: institucion.rectorTelefono,

          municipioId: institucion.municipioId,

          municipio: institucion.municipio && {

            id: institucion.municipio.id,

            nombre: institucion.municipio.nombre,

            departamento: institucion.municipio.departamento && {

              id: institucion.municipio.departamento.id,

              nombre: institucion.municipio.departamento.nombre,

            },

          },

          creadoEn: institucion.creadoEn,

        },

      })

    } catch (error) {

      console.error('Error al crear institución:', error)

      return response.status(500).json({

        success: false,

        error: 'Error al crear la institución',

        details: error.message,

      })

    }

  }



  async update({ params, request, response }: HttpContext) {

    try {

      const institucion = await Institucion.find(params.id)

      if (!institucion) {

        return response.status(404).json({

          success: false,

          error: 'Institución no encontrada',

        })

      }



      const payload = request.only([

        'nombre',

        'telefono',

        'correo',

        'direccion',

        'naturaleza',

        'municipioId',

        'codigoDane',

        'nit',

        'resolucionAprobacion',

        'nivelesEducativos',

        'modalidad',

        'jornadas',

        'telefonoPrincipal',

        'telefonoSecretaria',

        'correoInstitucional',

        'correoRectoria',

        'sitioWeb',

        'direccionCompleta',

        'barrio',

        'estrato',

        'coordenadasGps',

        'capacidadEstudiantes',

        'anoFundacion',

        'enfoquePedagogico',

        'confesional',

        'religion',

        'rectorNombre',

        'rectorDocumento',

        'rectorTelefono',

        'rectorCorreo',

      ])



      // Validar naturaleza si se proporciona

      if (payload.naturaleza && !['publica', 'privada'].includes(payload.naturaleza?.toLowerCase())) {

        return response.status(400).json({

          success: false,

          error: 'La naturaleza debe ser "publica" o "privada"',

        })

      }



      // Normalizar naturaleza

      if (payload.naturaleza) {

        payload.naturaleza = payload.naturaleza.toLowerCase()

      }



      // Validar código DANE único (si se cambia)

      if (payload.codigoDane && payload.codigoDane !== institucion.codigoDane) {

        const existente = await Institucion.query()

          .where('codigo_dane', payload.codigoDane)

          .whereNot('id', institucion.id)

          .first()

        

        if (existente) {

          return response.status(409).json({

            success: false,

            error: 'Ya existe una institución con este código DANE',

          })

        }

      }



      // Validar NIT único (si se cambia)

      if (payload.nit && payload.nit !== institucion.nit) {

        const existente = await Institucion.query()

          .where('nit', payload.nit)

          .whereNot('id', institucion.id)

          .first()

        

        if (existente) {

          return response.status(409).json({

            success: false,

            error: 'Ya existe una institución con este NIT',

          })

        }

      }



      // Manejar valores nulos para campos NOT NULL

      if (payload.telefonoPrincipal === null || payload.telefonoPrincipal === '') {

        payload.telefonoPrincipal = institucion.telefonoPrincipal || 'N/A'

      }

      if (payload.correoInstitucional === null || payload.correoInstitucional === '') {

        payload.correoInstitucional = institucion.correoInstitucional || 'N/A'

      }

      if (payload.direccionCompleta === null || payload.direccionCompleta === '') {

        payload.direccionCompleta = institucion.direccionCompleta || 'N/A'

      }

      if (payload.rectorNombre === null || payload.rectorNombre === '') {

        payload.rectorNombre = institucion.rectorNombre || 'N/A'

      }

      if (payload.rectorDocumento === null || payload.rectorDocumento === '') {

        payload.rectorDocumento = institucion.rectorDocumento || 'N/A'

      }

      if (payload.rectorTelefono === null || payload.rectorTelefono === '') {

        payload.rectorTelefono = institucion.rectorTelefono || 'N/A'

      }



      institucion.merge(payload)

      await institucion.save()



      // Cargar relaciones para la respuesta

      await institucion.load('municipio', (municipioQuery) => {

        municipioQuery.preload('departamento')

      })



      return response.status(200).json({

        success: true,

        message: 'Institución actualizada exitosamente',

        institucion: {

          id: institucion.id,

          nombre: institucion.nombre,

          codigoDane: institucion.codigoDane,

          nit: institucion.nit,

          naturaleza: institucion.naturaleza,

          telefono: institucion.telefono,

          correo: institucion.correo,

          direccion: institucion.direccion,

          telefonoPrincipal: institucion.telefonoPrincipal,

          correoInstitucional: institucion.correoInstitucional,

          direccionCompleta: institucion.direccionCompleta,

          rectorNombre: institucion.rectorNombre,

          rectorDocumento: institucion.rectorDocumento,

          rectorTelefono: institucion.rectorTelefono,

          municipioId: institucion.municipioId,

          municipio: institucion.municipio && {

            id: institucion.municipio.id,

            nombre: institucion.municipio.nombre,

            departamento: institucion.municipio.departamento && {

              id: institucion.municipio.departamento.id,

              nombre: institucion.municipio.departamento.nombre,

            },

          },

          actualizadoEn: institucion.actualizadoEn,

        },

      })

    } catch (error) {

      console.error('Error al actualizar institución:', error)

      return response.status(500).json({

        success: false,

        error: 'Error al actualizar la institución',

        details: error.message,

      })

    }

  }



  async destroy({ params, response }: HttpContext) {

    const institucion = await Institucion.find(params.id)

    if (!institucion) {

      return response.notFound({ message: 'Institucion no encontrada' })

    }



    await institucion.delete()

    return response.ok({ message: 'Institucion eliminada' })

  }

  /**
   * Crear institución completa con grados y cursos
   * POST /instituciones/completa
   */
  async storeCompleto({ request, response }: HttpContext) {
    try {
      const payload = request.only([
        'institucion',
        'grados'
      ])

      console.log('=== STORE COMPLETO ===')
      console.log('Payload recibido:', JSON.stringify(payload, null, 2))

      if (!payload.institucion || !payload.grados || !Array.isArray(payload.grados)) {
        return response.status(400).json({
          success: false,
          error: 'institucion y grados (array) son requeridos'
        })
      }

      const institucionData = payload.institucion
      
      // Extraer la contraseña del rector antes de crear la institución
      const contrasenaRector = institucionData.rectorContrasena || 'Temp123456'
      // Eliminar el campo para que no intente guardarlo en la BD
      delete institucionData.rectorContrasena
      
      if (!institucionData.nombre || !institucionData.naturaleza || !institucionData.municipioId) {
        return response.status(400).json({
          success: false,
          error: 'nombre, naturaleza y municipioId son requeridos'
        })
      }

      // Validar código DANe único si se proporciona
      if (institucionData.codigoDane) {
        const existingInstitucion = await Institucion.query()
          .where('codigo_dane', institucionData.codigoDane)
          .first()
        
        if (existingInstitucion) {
          return response.status(400).json({
            success: false,
            error: `Ya existe una institución con el código DANe: ${institucionData.codigoDane}`
          })
        }
      } else {
        // Generar código DANe único automáticamente
        let codigoDaneUnico = `AUTO_${Date.now()}`
        let intentos = 0
        const maxIntentos = 10
        
        while (intentos < maxIntentos) {
          const existing = await Institucion.query()
            .where('codigo_dane', codigoDaneUnico)
            .first()
          
          if (!existing) {
            institucionData.codigoDane = codigoDaneUnico
            console.log(`Código DANe generado automáticamente: ${codigoDaneUnico}`)
            break
          }
          
          codigoDaneUnico = `AUTO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          intentos++
        }
        
        if (intentos >= maxIntentos) {
          return response.status(500).json({
            success: false,
            error: 'No se pudo generar un código DANe único automáticamente'
          })
        }
      }

      // Validar y convertir el campo jornadas si existe
      if (institucionData.jornadas) {
        // Si jornadas es un string, intentar parsearlo como JSON
        if (typeof institucionData.jornadas === 'string') {
          try {
            institucionData.jornadas = JSON.parse(institucionData.jornadas)
          } catch (parseError) {
            console.error('Error al parsear jornadas:', parseError)
            // Si no se puede parsear, dejarlo como array vacío
            institucionData.jornadas = []
          }
        }
        // Asegurarse que sea un array
        if (!Array.isArray(institucionData.jornadas)) {
          institucionData.jornadas = []
        }
      }

      // Validar y convertir el campo nivelesEducativos si existe
      if (institucionData.nivelesEducativos) {
        // Si nivelesEducativos es un string, intentar parsearlo como JSON
        if (typeof institucionData.nivelesEducativos === 'string') {
          try {
            institucionData.nivelesEducativos = JSON.parse(institucionData.nivelesEducativos)
          } catch (parseError) {
            console.error('Error al parsear nivelesEducativos:', parseError)
            // Si no se puede parsear, dejarlo como array vacío
            institucionData.nivelesEducativos = []
          }
        }
        // Asegurarse que sea un array
        if (!Array.isArray(institucionData.nivelesEducativos)) {
          institucionData.nivelesEducativos = []
        }
      }

      console.log('Datos de institución a crear:', JSON.stringify(institucionData, null, 2))

      // Crear institución
      const institucion = await Institucion.create(institucionData)

      // Crear rector si se proporcionaron datos
      let rectorCreado = null
      let correoRector = institucionData.rectorCorreo || institucionData.correoRectoria
      const nombreRector = institucionData.rectorNombre
      
      if (nombreRector && correoRector) {
        try {
          // Validar que el correo del rector no exista
          const existingUsuario = await Usuario.query()
            .where('correo', correoRector)
            .first()
          
          if (existingUsuario) {
            console.log(`El correo ${correoRector} ya existe, generando correo único automáticamente`)
            
            // Generar correo único automáticamente
            let correoUnico = correoRector
            let intentos = 0
            const maxIntentos = 10
            
            while (intentos < maxIntentos) {
              const timestamp = Date.now()
              const randomSuffix = Math.random().toString(36).substr(2, 5)
              correoUnico = correoRector.replace('@', `_${timestamp}${randomSuffix}@`)
              
              const existing = await Usuario.query()
                .where('correo', correoUnico)
                .first()
              
              if (!existing) {
                console.log(`Correo único generado: ${correoUnico}`)
                correoRector = correoUnico
                break
              }
              
              intentos++
            }
            
            if (intentos >= maxIntentos) {
              return response.status(500).json({
                success: false,
                error: 'No se pudo generar un correo único para el rector automáticamente'
              })
            }
          }

          // Validar contraseña si no es la temporal
          if (contrasenaRector !== 'Temp123456' && contrasenaRector.length < 6) {
            return response.status(400).json({
              success: false,
              error: 'La contraseña del rector debe tener al menos 6 caracteres'
            })
          }

          console.log('=== CREANDO USUARIO RECTOR ===')
          console.log('📧 Correo final:', correoRector)
          console.log('🔐 Contraseña (texto plano):', contrasenaRector)
          
          // Crear usuario para el rector - el modelo hashea automáticamente
          const usuarioRector = await Usuario.create({
            correo: correoRector,
            contrasenaHash: contrasenaRector, // Texto plano, el modelo lo hashea
            rolId: 2, // Rector
            estaActivo: true,
            debeCambiarContrasena: contrasenaRector === 'Temp123456',
          })
          
          console.log('✅ Usuario rector creado con ID:', usuarioRector.id)
          console.log('📧 Correo guardado:', usuarioRector.correo)
          console.log('🔐 Hash guardado por modelo:', usuarioRector.contrasenaHash)

          // Crear funcionario (rector)
          const nombresApellidos = nombreRector.split(' ')
          const nombres = nombresApellidos.slice(0, 2).join(' ')
          const apellidos = nombresApellidos.slice(2).join(' ') || ''

          rectorCreado = await Funcionario.create({
            nombre: nombres,
            apellido: apellidos,
            telefono: institucionData.rectorTelefono || '',
            correoInstitucional: correoRector,
            direccion: institucionData.direccion || '',
            rolId: 2, // Rector
            usuarioId: usuarioRector.id,
            institucionId: institucion.id
          })

          console.log('Rector creado exitosamente como funcionario')
          console.log('📧 Correo del rector:', correoRector)
          console.log('🔐 Contraseña del rector:', contrasenaRector)
          console.log('🔄 ¿Debe cambiar contraseña?:', contrasenaRector === 'Temp123456')
        } catch (error) {
          console.error('Error al crear rector:', error)
        }
      }

      // Crear grados y cursos
      const gradosCreados = []
      console.log('=== CREANDO GRADOS Y CURSOS ===')
      console.log('Total grados a crear:', payload.grados.length)
      console.log('Grados recibidos:', JSON.stringify(payload.grados, null, 2))
      
      for (const gradoData of payload.grados) {
        console.log('📋 Procesando grado:', gradoData.nombre)
        
        if (!gradoData.nombre || !gradoData.cursos || !Array.isArray(gradoData.cursos)) {
          console.log('❌ Grado inválido, saltando...')
          console.log(' - Nombre:', gradoData.nombre)
          console.log(' - Cursos:', gradoData.cursos)
          console.log(' - ¿Es array cursos?', Array.isArray(gradoData.cursos))
          continue
        }

        // Verificar si el grado ya existe en esta institución
        const existingGrado = await Grado.query()
          .where('nombre', gradoData.nombre)
          .where('institucion_id', institucion.id)
          .first()
        
        if (existingGrado) {
          console.log('⚠️ El grado', gradoData.nombre, 'ya existe en esta institución, saltando...')
          continue
        }

        console.log('✅ Creando grado:', gradoData.nombre, 'para institución:', institucion.id)
        
        try {
          // Crear nombre único para el grado agregando prefijo de institución
          const nombreUnicoGrado = `${institucion.id}_${gradoData.nombre}`
          
          const grado = await Grado.create({
            nombre: nombreUnicoGrado,
            orden: gradoData.orden || gradosCreados.length + 1,
            institucionId: institucion.id,
            esAutomatico: true
          })

          console.log('✅ Grado creado con ID:', grado.id, 'nombre:', nombreUnicoGrado)

          const cursos = []
          console.log('📚 Total cursos a crear para este grado:', gradoData.cursos.length)
          
          for (const cursoData of gradoData.cursos) {
            console.log('📚 Creando curso:', cursoData.nombre)
            
            if (!cursoData.nombre) {
              console.log('❌ Curso sin nombre, saltando...')
              continue
            }

            // Verificar si el curso ya existe en esta institución
            const existingCurso = await Curso.query()
              .where('nombre', cursoData.nombre)
              .where('institucion_id', institucion.id)
              .first()
            
            if (existingCurso) {
              console.log('⚠️ El curso', cursoData.nombre, 'ya existe en esta institución, saltando...')
              continue
            }

            const curso = await Curso.create({
              nombre: `${institucion.id}_${cursoData.nombre}`,
              gradoId: grado.id,
              institucionId: institucion.id,
              jornada: cursoData.jornada || 'mañana'
            })

            console.log('✅ Curso creado con ID:', curso.id, 'nombre:', cursoData.nombre, 'jornada:', curso.jornada)

            cursos.push({
              id: curso.id,
              nombre: cursoData.nombre, // Mostrar nombre original en la respuesta
              jornada: curso.jornada
            })
          }

          gradosCreados.push({
            id: grado.id,
            nombre: gradoData.nombre, // Mostrar nombre original en la respuesta
            orden: grado.orden,
            cursos: cursos
          })
          
          console.log('✅ Grado completado:', grado.nombre, 'con', cursos.length, 'cursos')
          
        } catch (error) {
          // Si el error es de constraint unique, significa que ya existe
          if (error.message.includes('duplicate key') && error.message.includes('grados_nombre_key')) {
            console.log('⚠️ El grado', gradoData.nombre, 'ya existe (constraint global), saltando...')
            continue
          }
          // Si es otro error, lo relanzamos
          throw error
        }
      }

      console.log('=== RESUMEN FINAL ===')
      console.log('📋 Total grados creados:', gradosCreados.length)
      console.log('📚 Total cursos creados:', gradosCreados.reduce((total, g) => total + g.cursos.length, 0))

      return response.status(201).json({
        success: true,
        message: 'Institución creada exitosamente con estructura académica completa',
        data: {
          institucion: {
            id: institucion.id,
            nombre: institucion.nombre,
            naturaleza: institucion.naturaleza,
            municipioId: institucion.municipioId
          },
          rector: rectorCreado ? {
            id: rectorCreado.id,
            nombre: rectorCreado.nombre,
            apellido: rectorCreado.apellido,
            correo: rectorCreado.correoInstitucional,
            institucionId: rectorCreado.institucionId
          } : null,
          credencialesRector: rectorCreado ? {
            correo: correoRector,
            contrasena: contrasenaRector,
            mensaje: contrasenaRector === 'Temp123456' 
              ? '🔑 CONTRASEÑA TEMPORAL - Se recomienda cambiarla en el primer login'
              : '🔑 CONTRASEÑA PERSONALIZADA - Guardar estas credenciales',
            esTemporal: contrasenaRector === 'Temp123456',
            correoModificado: correoRector !== (institucionData.rectorCorreo || institucionData.correoRectoria),
            correoOriginal: institucionData.rectorCorreo || institucionData.correoRectoria
          } : null,
          estructura: {
            totalGrados: gradosCreados.length,
            grados: gradosCreados
          }
        }
      })

    } catch (error) {
      console.error('Error al crear institución completa:', error)
      return response.status(500).json({
        success: false,
        error: 'Error al crear institución completa',
        details: error.message
      })
    }
  }

}

