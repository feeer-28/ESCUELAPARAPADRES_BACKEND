import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Evento from '#models/evento_v2'
import { DateTime } from 'luxon'

export default class EventosSeeder extends BaseSeeder {
  async run() {
    // Eventos de prueba para la institución ID 1
    const eventos = [
      {
        titulo: 'Reunión General de Padres',
        descripcion: 'Reunión informativa sobre el progreso académico del semestre. Se tratarán temas importantes sobre el rendimiento estudiantil y actividades próximas.',
        tipoEvento: 'reunion',
        fechaEvento: DateTime.now().plus({ days: 7 }),
        fechaRecordatorio: DateTime.now().plus({ days: 6 }),
        institucionId: 1,
        creadoPor: 1
      },
      {
        titulo: 'Día de la Familia',
        descripcion: 'Celebración del día de la familia con actividades lúdicas y educativas para toda la comunidad escolar. Incluirá juegos, comida compartida y presentaciones artísticas.',
        tipoEvento: 'social',
        fechaEvento: DateTime.now().plus({ days: 14 }),
        fechaRecordatorio: DateTime.now().plus({ days: 12 }),
        institucionId: 1,
        creadoPor: 1
      },
      {
        titulo: 'Feria de Ciencias',
        descripcion: 'Exposición de proyectos científicos creados por los estudiantes. Los padres están invitados a conocer las innovaciones y descubrimientos de sus hijos.',
        tipoEvento: 'academico',
        fechaEvento: DateTime.now().plus({ days: 21 }),
        fechaRecordatorio: DateTime.now().plus({ days: 19 }),
        institucionId: 1,
        creadoPor: 1
      },
      {
        titulo: 'Campeonato Deportivo Interno',
        descripcion: 'Competencia deportiva entre diferentes cursos. Incluirá fútbol, voleibol y atletismo. Los padres pueden asistir a apoyar a sus hijos.',
        tipoEvento: 'deportivo',
        fechaEvento: DateTime.now().plus({ days: 10 }),
        fechaRecordatorio: DateTime.now().plus({ days: 8 }),
        institucionId: 1,
        creadoPor: 1
      },
      {
        titulo: 'Festival Cultural',
        descripcion: 'Presentación artística de los estudiantes incluyendo música, danza y teatro. Evento para mostrar los talentos culturales de la institución.',
        tipoEvento: 'cultural',
        fechaEvento: DateTime.now().plus({ days: 28 }),
        fechaRecordatorio: DateTime.now().plus({ days: 26 }),
        institucionId: 1,
        creadoPor: 1
      },
      {
        titulo: 'Taller de Convivencia',
        descripcion: 'Taller para padres sobre estrategias de convivencia familiar y manejo de conflictos. Dictado por psicólogos especializados.',
        tipoEvento: 'reunion',
        fechaEvento: DateTime.now().plus({ days: 5 }),
        fechaRecordatorio: DateTime.now().plus({ days: 4 }),
        institucionId: 1,
        creadoPor: 1
      },
      {
        titulo: 'Entrega de Boletines',
        descripcion: 'Día oficial de entrega de boletines de calificaciones. Los padres podrán recoger los resultados académicos y hablar con los docentes.',
        tipoEvento: 'academico',
        fechaEvento: DateTime.now().plus({ days: 3 }),
        fechaRecordatorio: DateTime.now().plus({ days: 2 }),
        institucionId: 1,
        creadoPor: 1
      },
      {
        titulo: 'Jornada de Vacunación',
        descripcion: 'Campaña de vacunación escolar en colaboración con la secretaría de salud. Importante para la salud de todos los estudiantes.',
        tipoEvento: 'otro',
        fechaEvento: DateTime.now().plus({ days: 12 }),
        fechaRecordatorio: DateTime.now().plus({ days: 10 }),
        institucionId: 1,
        creadoPor: 1
      }
    ]

    // Crear eventos
    for (const eventoData of eventos) {
      await Evento.firstOrCreate(
        { 
          titulo: eventoData.titulo,
          institucionId: eventoData.institucionId 
        },
        eventoData
      )
    }

    console.log(`✅ ${eventos.length} eventos de prueba creados`)
  }
}
