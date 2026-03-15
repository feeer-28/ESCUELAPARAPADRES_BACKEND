import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'preferencias_usuario'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table.integer('usuario_id').unsigned().references('id').inTable('usuarios').onDelete('CASCADE').unique()
            table.boolean('notif_nuevas_tareas').defaultTo(true)
            table.boolean('notif_calificaciones').defaultTo(true)
            table.boolean('notif_recordatorios').defaultTo(true)
            table.boolean('notif_eventos').defaultTo(true)
            table.boolean('notif_general').defaultTo(true)
            table.timestamp('actualizado_en').defaultTo(this.now())
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
