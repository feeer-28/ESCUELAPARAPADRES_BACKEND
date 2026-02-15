import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'otp_codes'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')
            table.string('contacto', 255).notNullable()
            table.string('codigo', 6).notNullable()
            table.integer('intentos').defaultTo(0)
            table.boolean('usado').defaultTo(false)
            table.timestamp('expira_en').notNullable()
            table.timestamp('creado_en').defaultTo(this.now())

            table.index(['contacto', 'codigo'])
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}
