import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'notificaciones_push'

    async up() {
        const hasTable = await this.schema.hasTable(this.tableName)
        if (!hasTable) return // Should exist

        // Check columns
        const hasMensaje = await this.schema.hasColumn(this.tableName, 'mensaje')
        const hasCuerpo = await this.schema.hasColumn(this.tableName, 'cuerpo')
        const hasDatos = await this.schema.hasColumn(this.tableName, 'datos')

        this.schema.alterTable(this.tableName, (table) => {
            // Rename mensaje -> cuerpo
            if (hasMensaje && !hasCuerpo) {
                table.renameColumn('mensaje', 'cuerpo')
            }

            // Add datos if missing
            if (!hasDatos) {
                table.text('datos').nullable()
            }
        })
    }

    async down() {
        const hasCuerpo = await this.schema.hasColumn(this.tableName, 'cuerpo')
        const hasDatos = await this.schema.hasColumn(this.tableName, 'datos')

        this.schema.alterTable(this.tableName, (table) => {
            if (hasCuerpo) {
                table.renameColumn('cuerpo', 'mensaje')
            }
            if (hasDatos) {
                table.dropColumn('datos')
            }
        })
    }
}
