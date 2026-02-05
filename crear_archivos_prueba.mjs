import XLSX from 'xlsx'
import { writeFileSync } from 'fs'

// Datos de prueba para acudientes
const acudientes = [
  {
    'TIPO DOCUMENTO': 'CC',
    'NUMERO DOCUMENTO': '1061705869',
    'NOMBRES': 'Jose',
    'APELLIDOS': 'Paccuero',
    'TELEFONO': '3103335634',
    'CORREO': 'jose.paccuero@test.com',
    'DIRECCION': 'Calle 1 #2-3',
    'PARENTESCO': 'PADRE',
    'OCUPACION': 'Ingeniero',
  },
  {
    'TIPO DOCUMENTO': 'CC',
    'NUMERO DOCUMENTO': '1061705862',
    'NOMBRES': 'Maria',
    'APELLIDOS': 'Antonieta',
    'TELEFONO': '3103335635',
    'CORREO': 'maria.antonieta@test.com',
    'DIRECCION': 'Calle 2 #3-4',
    'PARENTESCO': 'MADRE',
    'OCUPACION': 'Contadora',
  },
]

// Datos de prueba para estudiantes
const estudiantes = [
  {
    'TIPO DOCUMENTO': 'TI',
    'NUMERO DOCUMENTO': '1060868158',
    'NOMBRES': 'Andres',
    'APELLIDOS': 'Paccuero',
    'FECHA DE NACIMIENTO': '12/03/2008',
    'SEXO': 'M',
    'CURSO': '2A',
    'DOCUMENTO ACUDIENTE': '1061705869',
    'NOMBRES ACUDIENTE': 'Jose Paccuero',
  },
  {
    'TIPO DOCUMENTO': 'TI',
    'NUMERO DOCUMENTO': '1060868155',
    'NOMBRES': 'Samuel',
    'APELLIDOS': 'Guillermo',
    'FECHA DE NACIMIENTO': '13/05/2008',
    'SEXO': 'M',
    'CURSO': '3A',
    'DOCUMENTO ACUDIENTE': '1061705862',
    'NOMBRES ACUDIENTE': 'Maria Antonieta',
  },
]

// Crear archivo de acudientes
const wsAcudientes = XLSX.utils.json_to_sheet(acudientes)
const wbAcudientes = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wbAcudientes, wsAcudientes, 'Acudientes')
XLSX.writeFile(wbAcudientes, 'ejemplo_acudientes.xlsx')

// Crear archivo de estudiantes
const wsEstudiantes = XLSX.utils.json_to_sheet(estudiantes)
const wbEstudiantes = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wbEstudiantes, wsEstudiantes, 'Estudiantes')
XLSX.writeFile(wbEstudiantes, 'ejemplo_estudiantes.xlsx')

console.log('✅ Archivos de prueba creados:')
console.log('  - ejemplo_acudientes.xlsx')
console.log('  - ejemplo_estudiantes.xlsx')
console.log('\n📋 Contenido:')
console.log('  Acudientes:', acudientes.length)
console.log('  Estudiantes:', estudiantes.length)
