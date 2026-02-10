import type { HttpContext } from '@adonisjs/core/http'
import Funcionario from '#models/funcionario'
import Curso from '#models/curso'
import Grado from '#models/grado'
import Usuario from '#models/usuario'
import Periodo from '#models/periodo'
import db from '@adonisjs/lucid/services/db'

export default class CoordinadoresController {
  /**
   * Dashboard general del coordinador
   * GET /coordinadores/estadisticas
   */
  async estadisticas({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser) {
        return response.status(401).json({
          success: false,
          message: 'Usuario no autenticado',
        })
      }

      if (jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Solo los coordinadores pueden acceder a estas estadísticas',
        })
      }

      // Obtener institución del coordinador
      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador || !coordinador.institucionId) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no tiene institución asignada',
        })
      }

      const institucionId = coordinador.institucionId

      // Total de cursos
      const totalCursosResult = await db
        .from('cursos')
        .where('institucion_id', institucionId)
        .count('* as total')
      const totalCursos = Number(totalCursosResult[0]?.total || 0)

      // Total de docentes (rolId: 5)
      const totalDocentesResult = await db
        .from('funcionarios')
        .where('institucion_id', institucionId)
        .where('rol_id', 5)
        .count('* as total')
      const totalDocentes = Number(totalDocentesResult[0]?.total || 0)

      // Total de orientadores (rolId: 4)
      const totalOrientadoresResult = await db
        .from('funcionarios')
        .where('institucion_id', institucionId)
        .where('rol_id', 4)
        .count('* as total')
      const totalOrientadores = Number(totalOrientadoresResult[0]?.total || 0)

      // Total de estudiantes
      const totalEstudiantesResult = await db
        .from('estudiantes as e')
        .join('cursos as c', 'e.curso_id', 'c.id')
        .where('c.institucion_id', institucionId)
        .count('e.id as total')
      const totalEstudiantes = Number(totalEstudiantesResult[0]?.total || 0)

      // Tareas creadas en la institución
      const tareasResult = await db
        .from('asignaciones')
        .where('institucion_id', institucionId)
        .count('* as total')
      const tareasCreadas = Number(tareasResult[0]?.total || 0)

      // Calificaciones realizadas
      const calificacionesResult = await db
        .from('calificaciones')
        .where('institucion_id', institucionId)
        .count('* as total')
      const tareasCalificadas = Number(calificacionesResult[0]?.total || 0)

      const tareasPendientes = Math.max(0, tareasCreadas - tareasCalificadas)

      // Promedio general
      const promedioResult = await db
        .from('calificaciones')
        .where('institucion_id', institucionId)
        .avg('nota as promedio')
      const promedioGeneral = promedioResult[0]?.promedio
        ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
        : 0

      return response.status(200).json({
        success: true,
        data: {
          totalCursos,
          totalDocentes,
          totalOrientadores,
          totalEstudiantes,
          tareasCreadas,
          tareasCalificadas,
          tareasPendientes,
          promedioGeneral,
          cursosConAlerta: 0,
        },
      })
    } catch (error) {
      console.error('Error al obtener estadísticas del coordinador:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas',
        error: error.message,
      })
    }
  }

  /**
   * Lista de cursos con métricas académicas
   * GET /coordinadores/cursos
   */
  async cursos({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const institucionId = coordinador.institucionId

      const cursos = await Curso.query()
        .where('institucion_id', institucionId!)
        .preload('grado')
        .orderBy('grado_id')
        .orderBy('nombre')

      const cursosConMetricas = await Promise.all(
        cursos.map(async (curso) => {
          // Total estudiantes del curso
          const estudiantesResult = await db
            .from('estudiantes')
            .where('curso_id', curso.id)
            .count('* as total')
          const totalEstudiantes = Number(estudiantesResult[0]?.total || 0)

          // Promedio general del curso
          const promedioResult = await db
            .from('calificaciones as c')
            .join('asignaciones as a', 'c.asignacion_id', 'a.id')
            .where('a.curso_id', curso.id)
            .avg('c.nota as promedio')

          const promedioGeneral = promedioResult[0]?.promedio
            ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
            : 0

          // Tareas del curso
          const tareasResult = await db
            .from('asignaciones')
            .where('curso_id', curso.id)
            .count('* as total')
          const tareasCreadas = Number(tareasResult[0]?.total || 0)

          return {
            id: curso.id,
            nombre: curso.nombre,
            grado: {
              id: curso.grado?.id,
              nombre: curso.grado?.nombre,
            },
            jornada: curso.jornada || 'No especificada',
            totalEstudiantes,
            promedioGeneral,
            tareasCreadas,
            tieneAlertas: promedioGeneral > 0 && promedioGeneral < 3.0,
          }
        })
      )

      return response.status(200).json({
        success: true,
        data: cursosConMetricas,
      })
    } catch (error) {
      console.error('Error al obtener cursos:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener cursos',
        error: error.message,
      })
    }
  }

  /**
   * Alertas académicas consolidadas
   * GET /coordinadores/alertas
   */
  async alertas({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const institucionId = coordinador.institucionId
      const alertas: any[] = []

      // Cursos con promedio bajo
      const cursos = await Curso.query().where('institucion_id', institucionId!).preload('grado')

      for (const curso of cursos) {
        const promedioResult = await db
          .from('calificaciones as c')
          .join('asignaciones as a', 'c.asignacion_id', 'a.id')
          .where('a.curso_id', curso.id)
          .avg('c.nota as promedio')

        const promedio = promedioResult[0]?.promedio
          ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
          : 0

        if (promedio > 0 && promedio < 3.0) {
          alertas.push({
            tipo: 'promedio_bajo',
            nivel: 'critico',
            curso: {
              id: curso.id,
              nombre: curso.nombre,
            },
            mensaje: `Promedio general del curso por debajo de 3.0 (${promedio})`,
            fecha: new Date().toISOString(),
          })
        }
      }

      const resumen = {
        criticas: alertas.filter((a) => a.nivel === 'critico').length,
        moderadas: alertas.filter((a) => a.nivel === 'moderado').length,
        leves: alertas.filter((a) => a.nivel === 'leve').length,
      }

      return response.status(200).json({
        success: true,
        data: {
          alertas: alertas.sort((a, b) => {
            const nivelOrder: Record<string, number> = { critico: 0, moderado: 1, leve: 2 }
            return nivelOrder[a.nivel] - nivelOrder[b.nivel]
          }),
          resumen,
        },
      })
    } catch (error) {
      console.error('Error al obtener alertas:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener alertas',
        error: error.message,
      })
    }
  }

  /**
   * Personal completo (docentes + orientadores) con métricas
   * GET /coordinadores/personal
   */
  async personal({ response, jwtUser }: HttpContext) {
    try {
      const coordinador = await Funcionario.query().where('usuario_id', jwtUser!.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const institucionId = coordinador.institucionId

      // Obtener docentes y orientadores en una sola consulta
      const personal = await db
        .from('funcionarios as f')
        .leftJoin('usuarios as u', 'f.usuario_id', 'u.id')
        .leftJoin('roles as r', 'f.rol_id', 'r.id')
        .where('f.institucion_id', institucionId!)
        .whereIn('f.rol_id', [4, 5]) // 4: orientador, 5: docente
        .select(
          'f.id',
          'f.nombre',
          'f.apellido',
          'f.rol_id',
          'u.correo',
          'u.esta_activo',
          'r.nombre as rol_nombre'
        )
        .orderBy('f.rol_id')
        .orderBy('f.nombre')

      const personalConMetricas = await Promise.all(
        personal.map(async (persona) => {
          const esDocente = persona.rol_id === 5

          if (esDocente) {
            // Buscar si existe en la tabla docentes
            const docenteInfo = await db
              .from('docentes')
              .where('usuario_id', persona.id)
              .first()

            let tareasCreadas = 0
            if (docenteInfo) {
              const tareasResult = await db
                .from('asignaciones')
                .where('docente_id', docenteInfo.id)
                .count('* as total')
              tareasCreadas = Number(tareasResult[0]?.total || 0)
            }

            return {
              id: persona.id,
              nombre: persona.nombre,
              apellido: persona.apellido,
              correo: persona.correo,
              tipo: 'docente',
              rolNombre: persona.rol_nombre,
              estaActivo: persona.esta_activo,
              tienePerfilCompleto: !!docenteInfo,
              metricas: {
                tareasCreadas,
              },
            }
          } else {
            // Métricas de orientador (por ahora básicas)
            return {
              id: persona.id,
              nombre: persona.nombre,
              apellido: persona.apellido,
              correo: persona.correo,
              tipo: 'orientador',
              rolNombre: persona.rol_nombre,
              estaActivo: persona.esta_activo,
              metricas: {
                casosAcompanamiento: 0,
              },
            }
          }
        })
      )

      // Resumen por tipo
      const resumen = {
        totalDocentes: personalConMetricas.filter((p) => p.tipo === 'docente').length,
        totalOrientadores: personalConMetricas.filter((p) => p.tipo === 'orientador').length,
        totalActivos: personalConMetricas.filter((p) => p.estaActivo).length,
      }

      return response.status(200).json({
        success: true,
        data: personalConMetricas,
        resumen,
      })
    } catch (error) {
      console.error('Error al obtener personal:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener personal',
        error: error.message,
      })
    }
  }

  /**
   * Docentes con seguimiento académico
   * GET /coordinadores/docentes
   */
  async docentes({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const institucionId = coordinador.institucionId

      // Obtener docentes directamente de funcionarios con rol_id = 5
      const docentes = await db
        .from('funcionarios as f')
        .leftJoin('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId!)
        .where('f.rol_id', 5)
        .select('f.id', 'f.nombre', 'f.apellido', 'u.correo')

      const docentesConMetricas = await Promise.all(
        docentes.map(async (docente) => {
          // Buscar si existe en la tabla docentes
          const docenteInfo = await db
            .from('docentes')
            .where('usuario_id', docente.id)
            .first()

          let tareasCreadas = 0
          if (docenteInfo) {
            const tareasResult = await db
              .from('asignaciones')
              .where('docente_id', docenteInfo.id)
              .count('* as total')
            tareasCreadas = Number(tareasResult[0]?.total || 0)
          }

          return {
            id: docente.id,
            nombre: docente.nombre,
            apellido: docente.apellido,
            correo: docente.correo,
            tienePerfilCompleto: !!docenteInfo,
            tareasCreadas,
            estadoAcademico: 'bien',
          }
        })
      )

      return response.status(200).json({
        success: true,
        data: docentesConMetricas,
      })
    } catch (error) {
      console.error('Error al obtener docentes:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener docentes',
        error: error.message,
      })
    }
  }

  /**
   * Orientadores con métricas de acompañamiento
   * GET /coordinadores/orientadores
   */
  async orientadores({ response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const institucionId = coordinador.institucionId

      // Obtener orientadores directamente de funcionarios con rol_id = 4
      const orientadores = await db
        .from('funcionarios as f')
        .leftJoin('usuarios as u', 'f.usuario_id', 'u.id')
        .where('f.institucion_id', institucionId!)
        .where('f.rol_id', 4)
        .select('f.id', 'f.nombre', 'f.apellido', 'f.telefono', 'u.correo', 'u.esta_activo')

      const orientadoresConMetricas = orientadores.map((orientador) => {
        return {
          id: orientador.id,
          nombre: orientador.nombre,
          apellido: orientador.apellido,
          telefono: orientador.telefono,
          correo: orientador.correo,
          estaActivo: orientador.esta_activo,
          gradosAsignados: [],
          cursosAcompanados: 0,
          intervencionesAcademicas: 0,
          casosAcompanamiento: 0,
          cursosConAlerta: 0,
        }
      })

      return response.status(200).json({
        success: true,
        data: orientadoresConMetricas,
      })
    } catch (error) {
      console.error('Error al obtener orientadores:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener orientadores',
        error: error.message,
      })
    }
  }

  /**
   * Detalle de rendimiento de un curso
   * GET /coordinadores/cursos/:id/rendimiento
   */
  async rendimientoCurso({ params, response, jwtUser }: HttpContext) {
    try {
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const coordinador = await Funcionario.query().where('usuario_id', jwtUser.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const cursoId = params.id

      // Verificar que el curso pertenece a la institución del coordinador
      const curso = await Curso.query()
        .where('id', cursoId)
        .where('institucion_id', coordinador.institucionId!)
        .first()

      if (!curso) {
        return response.status(404).json({
          success: false,
          message: 'Curso no encontrado o no pertenece a su institución',
        })
      }

      // Promedio general
      const promedioResult = await db
        .from('calificaciones as c')
        .join('asignaciones as a', 'c.asignacion_id', 'a.id')
        .where('a.curso_id', cursoId)
        .avg('c.nota as promedio')

      const promedioGeneral = promedioResult[0]?.promedio
        ? parseFloat(Number(promedioResult[0].promedio).toFixed(1))
        : 0

      // Distribución por rangos
      const calificaciones = await db
        .from('calificaciones as c')
        .join('asignaciones as a', 'c.asignacion_id', 'a.id')
        .where('a.curso_id', cursoId)
        .select('c.nota')

      const total = calificaciones.length
      const distribucion = { superior: 0, alto: 0, basico: 0, bajo: 0 }

      calificaciones.forEach((cal) => {
        const nota = Number(cal.nota)
        if (nota >= 4.6) distribucion.superior++
        else if (nota >= 4.0) distribucion.alto++
        else if (nota >= 3.0) distribucion.basico++
        else distribucion.bajo++
      })

      const distribucionRangos = {
        superior: {
          cantidad: distribucion.superior,
          porcentaje: total > 0 ? Math.round((distribucion.superior / total) * 100) : 0,
        },
        alto: {
          cantidad: distribucion.alto,
          porcentaje: total > 0 ? Math.round((distribucion.alto / total) * 100) : 0,
        },
        basico: {
          cantidad: distribucion.basico,
          porcentaje: total > 0 ? Math.round((distribucion.basico / total) * 100) : 0,
        },
        bajo: {
          cantidad: distribucion.bajo,
          porcentaje: total > 0 ? Math.round((distribucion.bajo / total) * 100) : 0,
        },
      }

      return response.status(200).json({
        success: true,
        data: {
          cursoId: curso.id,
          cursoNombre: curso.nombre,
          promedioGeneral,
          distribucionRangos,
          totalCalificaciones: total,
          tendencia: 'estable',
        },
      })
    } catch (error) {
      console.error('Error al obtener rendimiento del curso:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener rendimiento',
        error: error.message,
      })
    }
  }

  /**
   * Crear docente en la institución del coordinador
   * POST /coordinadores/docentes
   */
  async crearDocente({ request, response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del coordinador
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      const { correo, contrasena, nombre, apellido, telefono } = request.only([
        'correo',
        'contrasena',
        'nombre',
        'apellido',
        'telefono',
      ])

      // Validar campos requeridos
      if (!correo || !contrasena || !nombre || !apellido) {
        return response.status(400).json({
          success: false,
          message: 'Los campos correo, contraseña, nombre y apellido son requeridos',
        })
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(correo)) {
        return response.status(400).json({
          success: false,
          message: 'El formato del correo es inválido',
        })
      }

      // Validar formato de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      if (!passwordRegex.test(contrasena)) {
        return response.status(400).json({
          success: false,
          message:
            'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)',
        })
      }

      // Verificar que el correo no esté registrado
      const existeCorreo = await Usuario.findBy('correo', correo)
      if (existeCorreo) {
        return response.status(400).json({
          success: false,
          message: 'El correo ya está registrado en el sistema',
        })
      }

      // Crear usuario con rol de docente (rolId = 5)
      const usuario = await Usuario.create({
        correo,
        contrasenaHash: contrasena,
        rolId: 5, // docente
        estaActivo: true,
        debeCambiarContrasena: true,
      })

      // Crear funcionario (docente) en la institución del coordinador
      const docente = await Funcionario.create({
        nombre,
        apellido,
        telefono: telefono || null,
        institucionId,
        usuarioId: usuario.id,
        rolId: 5,
      })

      return response.status(201).json({
        success: true,
        message: 'Docente creado exitosamente',
        data: {
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            rolId: usuario.rolId,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
          },
          docente: {
            id: docente.id,
            nombre: docente.nombre,
            apellido: docente.apellido,
            telefono: docente.telefono,
            institucionId: docente.institucionId,
          },
        },
      })
    } catch (error) {
      console.error('Error al crear docente:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear docente',
        error: error.message,
      })
    }
  }

  /**
   * Crear orientador en la institución del coordinador
   * POST /coordinadores/orientadores
   */
  async crearOrientador({ request, response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del coordinador
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      const { correo, contrasena, nombre, apellido, telefono } = request.only([
        'correo',
        'contrasena',
        'nombre',
        'apellido',
        'telefono',
      ])

      // Validar campos requeridos
      if (!correo || !contrasena || !nombre || !apellido) {
        return response.status(400).json({
          success: false,
          message: 'Los campos correo, contraseña, nombre y apellido son requeridos',
        })
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(correo)) {
        return response.status(400).json({
          success: false,
          message: 'El formato del correo es inválido',
        })
      }

      // Validar formato de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      if (!passwordRegex.test(contrasena)) {
        return response.status(400).json({
          success: false,
          message:
            'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)',
        })
      }

      // Verificar que el correo no esté registrado
      const existeCorreo = await Usuario.findBy('correo', correo)
      if (existeCorreo) {
        return response.status(400).json({
          success: false,
          message: 'El correo ya está registrado en el sistema',
        })
      }

      // Crear usuario con rol de orientador (rolId = 4)
      const usuario = await Usuario.create({
        correo,
        contrasenaHash: contrasena,
        rolId: 4, // orientador
        estaActivo: true,
        debeCambiarContrasena: true,
      })

      // Crear funcionario (orientador) en la institución del coordinador
      const orientador = await Funcionario.create({
        nombre,
        apellido,
        telefono: telefono || null,
        institucionId,
        usuarioId: usuario.id,
        rolId: 4,
      })

      return response.status(201).json({
        success: true,
        message: 'Orientador creado exitosamente',
        data: {
          usuario: {
            id: usuario.id,
            correo: usuario.correo,
            rolId: usuario.rolId,
            debeCambiarContrasena: usuario.debeCambiarContrasena,
          },
          orientador: {
            id: orientador.id,
            nombre: orientador.nombre,
            apellido: orientador.apellido,
            telefono: orientador.telefono,
            institucionId: orientador.institucionId,
          },
        },
      })
    } catch (error) {
      console.error('Error al crear orientador:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear orientador',
        error: error.message,
      })
    }
  }

  /**
   * Actualizar orientador en la institución del coordinador
   * PUT /coordinadores/orientadores/:id
   */
  async actualizarOrientador({ params, request, response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del coordinador
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      if (!institucionId) {
        return response.status(400).json({
          success: false,
          message: 'El coordinador no tiene una institución asignada',
        })
      }

      // Buscar el orientador y verificar que pertenece a la institución del coordinador
      const orientador = await Funcionario.query()
        .where('id', params.id)
        .where('institucion_id', institucionId)
        .where('rol_id', 4) // Solo orientadores
        .first()

      if (!orientador) {
        return response.status(404).json({
          success: false,
          message: 'Orientador no encontrado o no pertenece a su institución',
        })
      }

      const { correo, nombre, apellido, telefono, estaActivo } = request.only([
        'correo',
        'nombre',
        'apellido',
        'telefono',
        'estaActivo',
      ])

      // Actualizar datos del funcionario
      if (nombre !== undefined) orientador.nombre = nombre
      if (apellido !== undefined) orientador.apellido = apellido
      if (telefono !== undefined) orientador.telefono = telefono

      await orientador.save()

      // Actualizar datos del usuario si se proporciona correo o estado
      if (correo !== undefined || estaActivo !== undefined) {
        const usuario = await Usuario.findOrFail(orientador.usuarioId)

        if (correo !== undefined && correo !== usuario.correo) {
          // Validar formato de correo
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          if (!emailRegex.test(correo)) {
            return response.status(400).json({
              success: false,
              message: 'El formato del correo es inválido',
            })
          }

          // Verificar que el nuevo correo no esté registrado
          const existeCorreo = await Usuario.query()
            .where('correo', correo)
            .whereNot('id', usuario.id)
            .first()

          if (existeCorreo) {
            return response.status(400).json({
              success: false,
              message: 'El correo ya está registrado en el sistema',
            })
          }

          usuario.correo = correo
        }

        if (estaActivo !== undefined) {
          usuario.estaActivo = estaActivo
        }

        await usuario.save()
      }

      // Recargar datos actualizados
      await orientador.refresh()
      const usuario = await Usuario.findOrFail(orientador.usuarioId)

      return response.status(200).json({
        success: true,
        message: 'Orientador actualizado exitosamente',
        data: {
          id: orientador.id,
          nombre: orientador.nombre,
          apellido: orientador.apellido,
          telefono: orientador.telefono,
          correo: usuario.correo,
          estaActivo: usuario.estaActivo,
          institucionId: orientador.institucionId,
        },
      })
    } catch (error) {
      console.error('Error al actualizar orientador:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar orientador',
        error: error.message,
      })
    }
  }

  /**
   * Eliminar orientador de la institución del coordinador
   * DELETE /coordinadores/orientadores/:id
   */
  async eliminarOrientador({ params, response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del coordinador
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      if (!institucionId) {
        return response.status(400).json({
          success: false,
          message: 'El coordinador no tiene una institución asignada',
        })
      }

      // Buscar el orientador y verificar que pertenece a la institución del coordinador
      const orientador = await Funcionario.query()
        .where('id', params.id)
        .where('institucion_id', institucionId)
        .where('rol_id', 4) // Solo orientadores
        .first()

      if (!orientador) {
        return response.status(404).json({
          success: false,
          message: 'Orientador no encontrado o no pertenece a su institución',
        })
      }

      // Obtener usuario asociado antes de eliminar
      const usuarioId = orientador.usuarioId

      // Eliminar orientador (funcionario)
      await orientador.delete()

      // Eliminar usuario asociado
      const usuario = await Usuario.find(usuarioId)
      if (usuario) {
        await usuario.delete()
      }

      return response.status(200).json({
        success: true,
        message: 'Orientador eliminado exitosamente',
      })
    } catch (error) {
      console.error('Error al eliminar orientador:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar orientador',
        error: error.message,
      })
    }
  }

  /**
   * Listar acudientes/padres de familia de la institución
   * GET /coordinadores/acudientes
   */
  async listarAcudientes({ response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del coordinador
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      if (!institucionId) {
        return response.status(400).json({
          success: false,
          message: 'El coordinador no tiene una institución asignada',
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
      console.error('Error al listar acudientes:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar acudientes',
        error: error.message,
      })
    }
  }

  /**
   * Ver datos de la institución del coordinador
   * GET /coordinadores/mi-institucion
   */
  async miInstitucion({ response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del coordinador
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .preload('institucion', (query) => {
          query.preload('municipio', (municipioQuery) => {
            municipioQuery.preload('departamento')
          })
        })
        .firstOrFail()

      const institucion = coordinador.institucion

      if (!institucion) {
        return response.status(404).json({
          success: false,
          message: 'Institución no encontrada',
        })
      }

      return response.status(200).json({
        success: true,
        data: {
          id: institucion.id,
          nombre: institucion.nombre,
          telefono: institucion.telefono,
          correo: institucion.correo,
          direccion: institucion.direccion,
          codigoDane: institucion.codigoDane,
          nit: institucion.nit,
          municipioId: institucion.municipioId,
          municipio: institucion.municipio?.nombre,
          departamento: institucion.municipio?.departamento?.nombre,
          rectorNombre: institucion.rectorNombre,
          rectorDocumento: institucion.rectorDocumento,
          rectorCorreo: institucion.rectorCorreo,
          rectorTelefono: institucion.rectorTelefono,
        },
      })
    } catch (error) {
      console.error('Error al obtener institución:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al obtener institución',
        error: error.message,
      })
    }
  }

  /**
   * Crear personal (docente u orientador)
   * POST /coordinadores/personal
   */
  async crearPersonal({ request, response, jwtUser }: HttpContext) {
    try {
      const coordinador = await Funcionario.query().where('usuario_id', jwtUser!.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      const { tipo, correo, contrasena, nombre, apellido, telefono } = request.only([
        'tipo',
        'correo',
        'contrasena',
        'nombre',
        'apellido',
        'telefono',
      ])

      // Validar campos requeridos
      if (!tipo || !correo || !contrasena || !nombre || !apellido) {
        return response.status(400).json({
          success: false,
          message: 'Los campos tipo, correo, contraseña, nombre y apellido son requeridos',
          errors: {
            required: ['tipo', 'correo', 'contrasena', 'nombre', 'apellido'],
          },
        })
      }

      // Validar tipo
      if (tipo !== 'docente' && tipo !== 'orientador') {
        return response.status(400).json({
          success: false,
          message: 'El tipo debe ser "docente" o "orientador"',
        })
      }

      // Validar formato de correo
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(correo)) {
        return response.status(400).json({
          success: false,
          message: 'El formato del correo es inválido',
        })
      }

      // Validar formato de contraseña
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
      if (!passwordRegex.test(contrasena)) {
        return response.status(400).json({
          success: false,
          message:
            'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial (@$!%*?&)',
        })
      }

      // Verificar que el correo no esté registrado
      const existeCorreo = await Usuario.findBy('correo', correo)
      if (existeCorreo) {
        return response.status(400).json({
          success: false,
          message: 'El correo ya está registrado en el sistema',
          errors: {
            correo: 'Este correo ya existe en el sistema',
          },
        })
      }

      const institucionId = coordinador.institucionId
      const rolId = tipo === 'docente' ? 5 : 4

      // Crear usuario
      const usuario = await Usuario.create({
        correo,
        contrasenaHash: contrasena,
        rolId,
        estaActivo: true,
        debeCambiarContrasena: true,
      })

      // Crear funcionario
      const funcionario = await Funcionario.create({
        nombre,
        apellido,
        telefono: telefono || null,
        institucionId,
        usuarioId: usuario.id,
        rolId,
      })

      // Buscar si existe en tabla docentes (para tienePerfilCompleto)
      let tienePerfilCompleto = false
      if (tipo === 'docente') {
        const docenteInfo = await db.from('docentes').where('usuario_id', usuario.id).first()
        tienePerfilCompleto = !!docenteInfo
      }

      return response.status(201).json({
        success: true,
        message: `${tipo === 'docente' ? 'Docente' : 'Orientador'} creado exitosamente`,
        data: {
          id: funcionario.id,
          nombre: funcionario.nombre,
          apellido: funcionario.apellido,
          correo: usuario.correo,
          telefono: funcionario.telefono,
          tipo,
          rolNombre: tipo === 'docente' ? 'docente' : 'orientador',
          estaActivo: usuario.estaActivo,
          tienePerfilCompleto,
          metricas: tipo === 'docente' ? { tareasCreadas: 0 } : { casosAcompanamiento: 0 },
        },
      })
    } catch (error) {
      console.error('Error al crear personal:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear personal',
        error: error.message,
      })
    }
  }

  /**
   * Actualizar personal (docente u orientador)
   * PUT /coordinadores/personal/:id
   */
  async actualizarPersonal({ params, request, response, jwtUser }: HttpContext) {
    try {
      const coordinador = await Funcionario.query().where('usuario_id', jwtUser!.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      // Buscar el funcionario a actualizar
      const funcionario = await Funcionario.find(params.id)
      if (!funcionario) {
        return response.status(404).json({
          success: false,
          message: 'Personal no encontrado',
        })
      }

      // Verificar que pertenece a la misma institución
      if (funcionario.institucionId !== coordinador.institucionId) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para actualizar este personal',
        })
      }

      const { nombre, apellido, telefono, correo } = request.only([
        'nombre',
        'apellido',
        'telefono',
        'correo',
      ])

      // Actualizar datos del funcionario
      if (nombre) funcionario.nombre = nombre
      if (apellido) funcionario.apellido = apellido
      if (telefono !== undefined) funcionario.telefono = telefono

      await funcionario.save()

      // Actualizar correo del usuario si se proporciona
      if (correo) {
        const usuario = await Usuario.find(funcionario.usuarioId)
        if (usuario) {
          // Verificar que el correo no esté en uso por otro usuario
          const existeCorreo = await Usuario.query()
            .where('correo', correo)
            .whereNot('id', usuario.id)
            .first()

          if (existeCorreo) {
            return response.status(400).json({
              success: false,
              message: 'El correo ya está registrado por otro usuario',
              errors: {
                correo: 'Este correo ya existe en el sistema',
              },
            })
          }

          usuario.correo = correo
          await usuario.save()
        }
      }

      // Obtener datos actualizados con usuario
      await funcionario.load('usuario')
      const tipo = funcionario.rolId === 5 ? 'docente' : 'orientador'

      return response.status(200).json({
        success: true,
        message: 'Personal actualizado exitosamente',
        data: {
          id: funcionario.id,
          nombre: funcionario.nombre,
          apellido: funcionario.apellido,
          correo: funcionario.usuario?.correo,
          telefono: funcionario.telefono,
          tipo,
          estaActivo: funcionario.usuario?.estaActivo,
        },
      })
    } catch (error) {
      console.error('Error al actualizar personal:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar personal',
        error: error.message,
      })
    }
  }

  /**
   * Cambiar estado de personal (activar/desactivar)
   * PATCH /coordinadores/personal/:id/estado
   */
  async cambiarEstadoPersonal({ params, request, response, jwtUser }: HttpContext) {
    try {
      const coordinador = await Funcionario.query().where('usuario_id', jwtUser!.id).first()

      if (!coordinador) {
        return response.status(404).json({
          success: false,
          message: 'Coordinador no encontrado',
        })
      }

      // Buscar el funcionario
      const funcionario = await Funcionario.find(params.id)
      if (!funcionario) {
        return response.status(404).json({
          success: false,
          message: 'Personal no encontrado',
        })
      }

      // Verificar que pertenece a la misma institución
      if (funcionario.institucionId !== coordinador.institucionId) {
        return response.status(403).json({
          success: false,
          message: 'No tienes permiso para modificar este personal',
        })
      }

      const { estaActivo } = request.only(['estaActivo'])

      if (estaActivo === undefined) {
        return response.status(400).json({
          success: false,
          message: 'El campo estaActivo es requerido',
        })
      }

      // Actualizar estado del usuario
      const usuario = await Usuario.find(funcionario.usuarioId)
      if (!usuario) {
        return response.status(404).json({
          success: false,
          message: 'Usuario no encontrado',
        })
      }

      usuario.estaActivo = estaActivo
      await usuario.save()

      return response.status(200).json({
        success: true,
        message: `Personal ${estaActivo ? 'activado' : 'desactivado'} exitosamente`,
        data: {
          id: funcionario.id,
          estaActivo: usuario.estaActivo,
        },
      })
    } catch (error) {
      console.error('Error al cambiar estado de personal:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al cambiar estado de personal',
        error: error.message,
      })
    }
  }

  /**
   * Listar períodos académicos de la institución del coordinador
   * GET /coordinadores/periodos
   */
  async listarPeriodos({ response, jwtUser }: HttpContext) {
    try {
      // Obtener la institución del coordinador
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      // Obtener períodos de la institución
      const periodos = await Periodo.query()
        .where('institucion_id', institucionId!)
        .orderBy('fecha_inicio', 'desc')

      return response.status(200).json({
        success: true,
        data: periodos.map((periodo) => ({
          id: periodo.id,
          nombre: periodo.nombre,
          fechaInicio: periodo.fechaInicio.toFormat('yyyy-MM-dd'),
          fechaFin: periodo.fechaFin.toFormat('yyyy-MM-dd'),
          estaActivo: periodo.estaActivo,
          institucionId: periodo.institucionId,
        })),
        total: periodos.length,
      })
    } catch (error) {
      console.error('Error al listar períodos:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar períodos',
        error: error.message,
      })
    }
  }

  /**
   * Crear curso en la institución del coordinador
   * POST /coordinadores/cursos
   */
  async crearCurso({ request, response, jwtUser }: HttpContext) {
    try {
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      if (!institucionId) {
        return response.status(400).json({
          success: false,
          message: 'El coordinador no tiene una institución asignada',
        })
      }

      const { nombre, gradoId, jornada } = request.only(['nombre', 'gradoId', 'jornada'])

      // Validar campos requeridos
      if (!nombre || !gradoId) {
        return response.status(400).json({
          success: false,
          message: 'Los campos nombre y gradoId son requeridos',
        })
      }

      // Validar que el grado existe
      const grado = await Grado.find(gradoId)
      if (!grado) {
        return response.status(404).json({
          success: false,
          message: 'El grado especificado no existe',
        })
      }

      // Verificar que no exista un curso con el mismo nombre en la institución
      const cursoExistente = await Curso.query()
        .where('nombre', nombre)
        .where('institucion_id', institucionId)
        .where('grado_id', gradoId)
        .first()

      if (cursoExistente) {
        return response.status(400).json({
          success: false,
          message: 'Ya existe un curso con ese nombre en ese grado',
        })
      }

      // Crear el curso
      const curso = await Curso.create({
        nombre,
        gradoId,
        jornada: jornada || 'Completa',
        institucionId,
      })

      await curso.load('grado')

      return response.status(201).json({
        success: true,
        message: 'Curso creado exitosamente',
        data: {
          id: curso.id,
          nombre: curso.nombre,
          gradoId: curso.gradoId,
          grado: {
            id: curso.grado.id,
            nombre: curso.grado.nombre,
          },
          jornada: curso.jornada,
          institucionId: curso.institucionId,
          totalEstudiantes: 0,
        },
      })
    } catch (error) {
      console.error('Error al crear curso:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear curso',
        error: error.message,
      })
    }
  }

  /**
   * Actualizar curso de la institución del coordinador
   * PUT /coordinadores/cursos/:id
   */
  async actualizarCurso({ params, request, response, jwtUser }: HttpContext) {
    try {
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      if (!institucionId) {
        return response.status(400).json({
          success: false,
          message: 'El coordinador no tiene una institución asignada',
        })
      }

      // Buscar el curso y verificar que pertenece a la institución
      const curso = await Curso.query()
        .where('id', params.id)
        .where('institucion_id', institucionId)
        .first()

      if (!curso) {
        return response.status(404).json({
          success: false,
          message: 'Curso no encontrado o no pertenece a su institución',
        })
      }

      const { nombre, gradoId, jornada } = request.only(['nombre', 'gradoId', 'jornada'])

      // Si se va a cambiar el nombre o grado, verificar que no exista otro curso igual
      if ((nombre && nombre !== curso.nombre) || (gradoId && gradoId !== curso.gradoId)) {
        const cursoExistente = await Curso.query()
          .where('nombre', nombre || curso.nombre)
          .where('grado_id', gradoId || curso.gradoId)
          .where('institucion_id', institucionId)
          .whereNot('id', curso.id)
          .first()

        if (cursoExistente) {
          return response.status(400).json({
            success: false,
            message: 'Ya existe otro curso con ese nombre en ese grado',
          })
        }
      }

      // Validar que el grado existe si se proporciona
      if (gradoId) {
        const grado = await Grado.find(gradoId)
        if (!grado) {
          return response.status(404).json({
            success: false,
            message: 'El grado especificado no existe',
          })
        }
        curso.gradoId = gradoId
      }

      // Actualizar datos
      if (nombre) curso.nombre = nombre
      if (jornada) curso.jornada = jornada

      await curso.save()
      await curso.load('grado')

      // Obtener total de estudiantes
      const estudiantesResult = await db
        .from('estudiantes')
        .where('curso_id', curso.id)
        .count('* as total')
      const totalEstudiantes = Number(estudiantesResult[0]?.total || 0)

      return response.status(200).json({
        success: true,
        message: 'Curso actualizado exitosamente',
        data: {
          id: curso.id,
          nombre: curso.nombre,
          gradoId: curso.gradoId,
          grado: {
            id: curso.grado.id,
            nombre: curso.grado.nombre,
          },
          jornada: curso.jornada,
          institucionId: curso.institucionId,
          totalEstudiantes,
        },
      })
    } catch (error) {
      console.error('Error al actualizar curso:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar curso',
        error: error.message,
      })
    }
  }

  /**
   * Eliminar curso de la institución del coordinador
   * DELETE /coordinadores/cursos/:id
   */
  async eliminarCurso({ params, response, jwtUser }: HttpContext) {
    try {
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      if (!institucionId) {
        return response.status(400).json({
          success: false,
          message: 'El coordinador no tiene una institución asignada',
        })
      }

      // Buscar el curso y verificar que pertenece a la institución
      const curso = await Curso.query()
        .where('id', params.id)
        .where('institucion_id', institucionId)
        .first()

      if (!curso) {
        return response.status(404).json({
          success: false,
          message: 'Curso no encontrado o no pertenece a su institución',
        })
      }

      // Verificar si hay estudiantes en el curso
      const estudiantesResult = await db
        .from('estudiantes')
        .where('curso_id', curso.id)
        .count('* as total')
      const totalEstudiantes = Number(estudiantesResult[0]?.total || 0)

      if (totalEstudiantes > 0) {
        return response.status(400).json({
          success: false,
          message: `No se puede eliminar el curso porque tiene ${totalEstudiantes} estudiante(s) matriculado(s)`,
          data: {
            totalEstudiantes,
          },
        })
      }

      // Verificar si hay tareas asignadas al curso
      const tareasResult = await db
        .from('asignaciones')
        .where('curso_id', curso.id)
        .count('* as total')
      const totalTareas = Number(tareasResult[0]?.total || 0)

      if (totalTareas > 0) {
        return response.status(400).json({
          success: false,
          message: `No se puede eliminar el curso porque tiene ${totalTareas} tarea(s) asignada(s)`,
          data: {
            totalTareas,
          },
        })
      }

      await curso.delete()

      return response.status(200).json({
        success: true,
        message: 'Curso eliminado exitosamente',
      })
    } catch (error) {
      console.error('Error al eliminar curso:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar curso',
        error: error.message,
      })
    }
  }

  /**
   * Listar grados con información de cursos
   * GET /coordinadores/grados
   */
  async listarGrados({ response, jwtUser }: HttpContext) {
    try {
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser!.id)
        .firstOrFail()

      const institucionId = coordinador.institucionId

      if (!institucionId) {
        return response.status(400).json({
          success: false,
          message: 'El coordinador no tiene una institución asignada',
        })
      }

      // Obtener todos los grados
      const grados = await Grado.query().orderBy('orden', 'asc')

      // Para cada grado, obtener información de cursos de la institución
      const gradosConInfo = await Promise.all(
        grados.map(async (grado) => {
          // Obtener cursos del grado en la institución del coordinador
          const cursos = await Curso.query()
            .where('grado_id', grado.id)
            .where('institucion_id', institucionId)
            .orderBy('nombre', 'asc')

          // Obtener total de estudiantes por curso
          const cursosConEstudiantes = await Promise.all(
            cursos.map(async (curso) => {
              const estudiantesResult = await db
                .from('estudiantes')
                .where('curso_id', curso.id)
                .count('* as total')
              const totalEstudiantes = Number(estudiantesResult[0]?.total || 0)

              return {
                id: curso.id,
                nombre: curso.nombre,
                jornada: curso.jornada,
                totalEstudiantes,
              }
            })
          )

          const totalCursos = cursosConEstudiantes.length
          const totalEstudiantes = cursosConEstudiantes.reduce(
            (sum, curso) => sum + curso.totalEstudiantes,
            0
          )

          return {
            id: grado.id,
            nombre: grado.nombre,
            orden: grado.orden,
            cursos: cursosConEstudiantes,
            totalCursos,
            totalEstudiantes,
          }
        })
      )

      return response.status(200).json({
        success: true,
        data: gradosConInfo,
      })
    } catch (error) {
      console.error('Error al listar grados:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al listar grados',
        error: error.message,
      })
    }
  }

  /**
   * Crear grado
   * POST /coordinadores/grados
   */
  async crearGrado({ request, response, jwtUser }: HttpContext) {
    try {
      // Validar que es coordinador
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const { nombre, orden } = request.only(['nombre', 'orden'])

      // Validar campos requeridos
      if (!nombre) {
        return response.status(400).json({
          success: false,
          message: 'El campo nombre es requerido',
        })
      }

      // Verificar que no exista un grado con el mismo nombre
      const gradoExistente = await Grado.findBy('nombre', nombre)
      if (gradoExistente) {
        return response.status(400).json({
          success: false,
          message: 'Ya existe un grado con ese nombre',
        })
      }

      // Crear el grado
      const grado = await Grado.create({
        nombre,
        orden: orden || null,
      })

      return response.status(201).json({
        success: true,
        message: 'Grado creado exitosamente',
        data: {
          id: grado.id,
          nombre: grado.nombre,
          orden: grado.orden,
          totalCursos: 0,
          totalEstudiantes: 0,
        },
      })
    } catch (error) {
      console.error('Error al crear grado:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al crear grado',
        error: error.message,
      })
    }
  }

  /**
   * Actualizar grado
   * PUT /coordinadores/grados/:id
   */
  async actualizarGrado({ params, request, response, jwtUser }: HttpContext) {
    try {
      // Validar que es coordinador
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const grado = await Grado.find(params.id)
      if (!grado) {
        return response.status(404).json({
          success: false,
          message: 'Grado no encontrado',
        })
      }

      const { nombre, orden } = request.only(['nombre', 'orden'])

      // Si se va a cambiar el nombre, verificar que no exista otro grado con ese nombre
      if (nombre && nombre !== grado.nombre) {
        const gradoExistente = await Grado.query()
          .where('nombre', nombre)
          .whereNot('id', grado.id)
          .first()

        if (gradoExistente) {
          return response.status(400).json({
            success: false,
            message: 'Ya existe otro grado con ese nombre',
          })
        }
        grado.nombre = nombre
      }

      if (orden !== undefined) {
        grado.orden = orden
      }

      await grado.save()

      // Obtener información actualizada
      const coordinador = await Funcionario.query()
        .where('usuario_id', jwtUser.id)
        .firstOrFail()
      const institucionId = coordinador.institucionId

      if (!institucionId) {
        return response.status(200).json({
          success: true,
          message: 'Grado actualizado exitosamente',
          data: {
            id: grado.id,
            nombre: grado.nombre,
            orden: grado.orden,
            totalCursos: 0,
          },
        })
      }

      const cursosResult = await db
        .from('cursos')
        .where('grado_id', grado.id)
        .where('institucion_id', institucionId)
        .count('* as total')
      const totalCursos = Number(cursosResult[0]?.total || 0)

      return response.status(200).json({
        success: true,
        message: 'Grado actualizado exitosamente',
        data: {
          id: grado.id,
          nombre: grado.nombre,
          orden: grado.orden,
          totalCursos,
        },
      })
    } catch (error) {
      console.error('Error al actualizar grado:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al actualizar grado',
        error: error.message,
      })
    }
  }

  /**
   * Eliminar grado
   * DELETE /coordinadores/grados/:id
   */
  async eliminarGrado({ params, response, jwtUser }: HttpContext) {
    try {
      // Validar que es coordinador
      if (!jwtUser || jwtUser.rolId !== 3) {
        return response.status(403).json({
          success: false,
          message: 'Acceso denegado',
        })
      }

      const grado = await Grado.find(params.id)
      if (!grado) {
        return response.status(404).json({
          success: false,
          message: 'Grado no encontrado',
        })
      }

      // Verificar si hay cursos asociados al grado
      const cursosResult = await db
        .from('cursos')
        .where('grado_id', grado.id)
        .count('* as total')
      const totalCursos = Number(cursosResult[0]?.total || 0)

      if (totalCursos > 0) {
        return response.status(400).json({
          success: false,
          message: `No se puede eliminar el grado porque tiene ${totalCursos} curso(s) asociado(s)`,
          data: {
            totalCursos,
          },
        })
      }

      await grado.delete()

      return response.status(200).json({
        success: true,
        message: 'Grado eliminado exitosamente',
      })
    } catch (error) {
      console.error('Error al eliminar grado:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al eliminar grado',
        error: error.message,
      })
    }
  }
}
