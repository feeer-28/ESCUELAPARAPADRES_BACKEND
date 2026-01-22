import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Departamento from '#models/departamento'
import Municipio from '#models/municipio'
import Institucion from '#models/institucion'

export default class extends BaseSeeder {
  async run() {
    // Crear departamento Cauca
    const departamento = await Departamento.updateOrCreate(
      { id: 1 },
      {
        nombre: 'Cauca',
        codigo: '19',
      }
    )

    // Crear municipio Popayán
    const municipio = await Municipio.updateOrCreate(
      { id: 1 },
      {
        nombre: 'Popayán',
        codigo: '19001',
        departamentoId: departamento.id,
      }
    )

    // Crear institución de prueba
    const institucion = await Institucion.updateOrCreate(
      { id: 1 },
      {
        nombre: 'Institución Educativa Test',
        naturaleza: 'Publica',
        telefonoPrincipal: '3001234567',
        correoInstitucional: 'contacto@instituciontest.edu.co',
        municipioId: municipio.id,
        nivelesEducativos: JSON.stringify(['Primaria', 'Secundaria', 'Media']) as any,
      }
    )

    console.log('✅ Datos básicos creados:')
    console.log(`   Departamento: ${departamento.nombre}`)
    console.log(`   Municipio: ${municipio.nombre}`)
    console.log(`   Institución: ${institucion.nombre}`)
  }
}
