import XLSX from 'xlsx'

// Datos de prueba para acudientes
const acudientes = [
  {
    'TIPO DOCUMENTO': 'CC',
    'NUMERO DOCUMENTO': '9999999991',
    'NOMBRES': 'Pedro',
    'APELLIDOS': 'Ramirez',
    'TELEFONO': '3201234567',
    'CORREO': 'pedro.ramirez@test.com',
    'DIRECCION': 'Calle 10 #5-20',
    'PARENTESCO': 'PADRE',
    'OCUPACION': 'Médico',
  },
  {
    'TIPO DOCUMENTO': 'CC',
    'NUMERO DOCUMENTO': '9999999992',
    'NOMBRES': 'Laura',
    'APELLIDOS': 'Gomez',
    'TELEFONO': '3209876543',
    'CORREO': 'laura.gomez@test.com',
    'DIRECCION': 'Carrera 5 #8-15',
    'PARENTESCO': 'MADRE',
    'OCUPACION': 'Abogada',
  },
]

// Datos de prueba para estudiantes (usando curso "Sexto" que existe)
const estudiantes = [
  {
    'TIPO DOCUMENTO': 'TI',
    'NUMERO DOCUMENTO': '9999999993',
    'NOMBRES': 'Sofia',
    'APELLIDOS': 'Ramirez',
    'FECHA DE NACIMIENTO': '15/08/2010',
    'SEXO': 'F',
    'CURSO': 'Sexto',
    'DOCUMENTO ACUDIENTE': '9999999991',
    'NOMBRES ACUDIENTE': 'Pedro Ramirez',
  },
  {
    'TIPO DOCUMENTO': 'TI',
    'NUMERO DOCUMENTO': '9999999994',
    'NOMBRES': 'Diego',
    'APELLIDOS': 'Gomez',
    'FECHA DE NACIMIENTO': '20/03/2011',
    'SEXO': 'M',
    'CURSO': 'Sexto',
    'DOCUMENTO ACUDIENTE': '9999999992',
    'NOMBRES ACUDIENTE': 'Laura Gomez',
  },
]

// Crear archivo de acudientes
const wsAcudientes = XLSX.utils.json_to_sheet(acudientes)
const wbAcudientes = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wbAcudientes, wsAcudientes, 'Acudientes')
XLSX.writeFile(wbAcudientes, 'ejemplo_acudientes_v2.xlsx')

// Crear archivo de estudiantes
const wsEstudiantes = XLSX.utils.json_to_sheet(estudiantes)
const wbEstudiantes = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wbEstudiantes, wsEstudiantes, 'Estudiantes')
XLSX.writeFile(wbEstudiantes, 'ejemplo_estudiantes_v2.xlsx')

console.log('✅ Archivos de prueba V2 creados:')
console.log('  - ejemplo_acudientes_v2.xlsx')
console.log('  - ejemplo_estudiantes_v2.xlsx')
console.log('\n📋 Contenido:')
console.log('  Acudientes:', acudientes.length)
console.log('  Estudiantes:', estudiantes.length)
console.log('  Curso: Sexto (existe en la institución)')
