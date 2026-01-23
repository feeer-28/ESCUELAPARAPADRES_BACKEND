import router from '@adonisjs/core/services/router'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

router.post('/setup/migrations', async ({ response }) => {
  try {
    const { stdout, stderr } = await execAsync('node ace migration:run --force')
    return response.json({
      success: true,
      message: 'Migraciones ejecutadas',
      output: stdout,
      errors: stderr,
    })
  } catch (error) {
    return response.status(500).json({
      success: false,
      message: 'Error ejecutando migraciones',
      error: error.message,
    })
  }
})

router.post('/setup/seeders', async ({ response }) => {
  try {
    const { stdout, stderr } = await execAsync('node ace db:seed --force')
    return response.json({
      success: true,
      message: 'Seeders ejecutados',
      output: stdout,
      errors: stderr,
    })
  } catch (error) {
    return response.status(500).json({
      success: false,
      message: 'Error ejecutando seeders',
      error: error.message,
    })
  }
})
