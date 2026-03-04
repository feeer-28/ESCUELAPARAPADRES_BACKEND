import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Usuario from '#models/usuario'
import Acudiente from '#models/acudiente'
import Estudiante from '#models/estudiante'
import Grado from '#models/grado'
import Curso from '#models/curso'
import Periodo from '#models/periodo'
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

export default class extends BaseSeeder {
  async run() {
    console.log('🔄 Creando datos de prueba para móvil...')

    // 1. Crear usuario acudiente
    const acudienteUsuario = await Usuario.updateOrCreate(
      { correo: 'acudiente.test@gmail.com' },
      {
        correo: 'acudiente.test@gmail.com',
        contrasenaHash: 'Acudiente123!', // El modelo hashea automáticamente
        rolId: 3, // rol acudiente
        estaActivo: true,
        debeCambiarContrasena: false,
      }
    )

    // 2. Crear registro de acudiente
    const acudiente = await Acudiente.updateOrCreate(
      { usuarioId: acudienteUsuario.id },
      {
        usuarioId: acudienteUsuario.id,
        nombres: 'María Fernanda',
        apellidos: 'García López',
        tipoDocumento: 'CC',
        numeroDocumento: '1234567890',
        telefono: '3101234567',
        telefonoAlternativo: '3209876543',
        correo: 'acudiente.test@gmail.com',
        direccion: 'Calle 5 # 10-20, Popayán',
        parentesco: 'Madre',
        ocupacion: 'Profesora',
        tipoTrabajo: 'Dependiente',
        nivelEducativo: 'Profesional',
        aportaEconomia: true,
        horarioTrabajo: 'Diurno',
      }
    )

    // 3. Verificar/Crear datos necesarios (grado, período, curso)
    let grado = await Grado.query().where('nombre', 'Sexto').first()

    if (!grado) {
      grado = await Grado.create({
        nombre: 'Sexto',
        orden: 6,
      })
    }

    let periodo = await Periodo.query().first()

    if (!periodo) {
      periodo = await Periodo.create({
        nombre: '2026',
        fechaInicio: DateTime.fromISO('2026-01-20'),
        fechaFin: DateTime.fromISO('2026-11-30'),
        estaActivo: true,
        institucionId: 1,
      })
    }

    let curso = await Curso.query()
      .where('nombre', 'Sexto A')
      .where('gradoId', grado.id)
      .first()

    if (!curso) {
      curso = await Curso.create({
        nombre: 'Sexto A',
        gradoId: grado.id,
        jornada: 'Mañana',
        institucionId: 1,
      })
    }

    // 4. Crear estudiante
    const estudiante = await Estudiante.updateOrCreate(
      { numeroDocumento: '1098765432' },
      {
        nombres: 'Juan Carlos',
        apellidos: 'García Pérez',
        tipoDocumento: 'TI',
        numeroDocumento: '1098765432',
        fechaNacimiento: DateTime.fromISO('2012-05-15'),
        sexo: 'M',
        grupoSanguineo: 'O',
        rh: '+',
        paisNacimiento: 'Colombia',
        ciudadNacimiento: 'Popayán',
        estrato: 3,
        eps: 'Sura',
        cursoId: curso.id,
      }
    )

    // 5. Vincular acudiente con estudiante (tabla pivot)
    const existeRelacion = await db
      .from('estudiante_acudiente')
      .where('estudiante_id', estudiante.id)
      .where('acudiente_id', acudiente.id)
      .first()

    if (!existeRelacion) {
      await db.table('estudiante_acudiente').insert({
        estudiante_id: estudiante.id,
        acudiente_id: acudiente.id,
        relacion: 'Madre',
        es_principal: true,
        creado_en: new Date(),
      })
    }

    console.log('✅ Datos de prueba creados exitosamente')
    console.log('\n📱 CREDENCIALES PARA APP MÓVIL:')
    console.log('   Email: acudiente.test@gmail.com')
    console.log('   Password: Acudiente123!')
    console.log('\n👥 Estudiante vinculado:')
    console.log(`   ${estudiante.nombres} ${estudiante.apellidos}`)
    console.log(`   Documento: ${estudiante.numeroDocumento}`)
    console.log(`   Curso: ${curso.nombre}`)
  }
}
