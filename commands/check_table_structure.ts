import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'

export default class CheckTableStructure extends BaseCommand {
  static commandName = 'check:table:structure'
  static description = 'Ver estructura de tabla funcionarios'

  static options: CommandOptions = {}

  async run() {
    try {
      const columns = await db.rawQuery(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = 'funcionarios' 
        ORDER BY ordinal_position;
      `)
      
      this.logger.info('📋 Estructura de la tabla FUNCIONARIOS:')
      console.table(columns.rows)
      
    } catch (error) {
      this.logger.error('Error al consultar estructura:', error)
    }
  }
}