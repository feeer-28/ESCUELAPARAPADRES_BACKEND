import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import db from '@adonisjs/lucid/services/db'
import Usuario from '#models/usuario'
import Docente from '#models/docente'
import Estudiante from '#models/estudiante'

export default class DebugNotificacion extends BaseCommand {
    static commandName = 'debug:notificacion'
    static description = 'Diagnosticar problemas de notificaciones push'
    static options: CommandOptions = {
        startApp: true
    }

    async run() {
        try {
            this.logger.info('🔍 Iniciando diagnóstico de notificaciones...')

            // Verificar schema de dispositivos_moviles
            this.logger.info('🔍 Inspeccionando columnas de dispositivos_moviles...')
            const colsSchema = await db.raw("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'dispositivos_moviles'") as any

            this.logger.info(`🔍 Raw Schema Result: ${JSON.stringify(colsSchema).substring(0, 200)}...`)

            if (colsSchema.rows) {
                this.logger.info('📋 Columnas encontradas (PG style):')
                colsSchema.rows.forEach((c: any) => this.logger.info(`   - ${c.column_name} (${c.data_type}) [Null: ${c.is_nullable}]`))
            } else if (Array.isArray(colsSchema)) {
                this.logger.info('📋 Columnas encontradas (Array style):')
                colsSchema.forEach((c: any) => this.logger.info(`   - ${c.column_name} (${c.data_type}) [Null: ${c.is_nullable}]`))
            }

            // 1. Buscar al docente
            const emailDocente = 'mariaz@colegio.edu'
            const usuarioDocente = await Usuario.findBy('correo', emailDocente)

            if (!usuarioDocente) {
                this.logger.error(`❌ Docente no encontrado: ${emailDocente}`)
                return
            }
            this.logger.success(`✅ Usuario docente encontrado: ${usuarioDocente.correo} (ID: ${usuarioDocente.id})`)

            const docente = await Docente.findBy('usuario_id', usuarioDocente.id)
            if (!docente) {
                this.logger.error('❌ Perfil de docente no encontrado')
                return
            }
            this.logger.success(`✅ Perfil Docente: ${docente.nombres} ${docente.apellidos}`)

            // 2. Buscar cursos del docente
            await docente.load('cursos')
            const cursos = docente.cursos
            this.logger.info(`✅ Cursos encontrados: ${cursos.length}`)

            if (cursos.length === 0) {
                this.logger.warning('⚠️ El docente no tiene cursos asignados.')
                return
            }

            // Tomamos el primer curso para probar
            const cursoPrueba = cursos[0]
            this.logger.info(`🎯 Probando con curso: ${cursoPrueba.nombre} (ID: ${cursoPrueba.id})`)

            // 3. Buscar estudiantes del curso
            const estudiantes = await Estudiante.query()
                .where('curso_id', cursoPrueba.id)
                .preload('acudientes', (q) => q.preload('usuario'))

            this.logger.info(`👥 Estudiantes en el curso: ${estudiantes.length}`)

            if (estudiantes.length === 0) {
                this.logger.warning('⚠️ No hay estudiantes en este curso.')
                return
            }

            // 4. Buscar padres con tokens
            let padresConToken = 0
            let padresTotal = 0

            for (const estudiante of estudiantes) {
                this.logger.info(`   - Estudiante: ${estudiante.nombres} ${estudiante.apellidos}`)

                for (const acudiente of estudiante.acudientes) {
                    if (!acudiente.usuario) {
                        this.logger.warning(`     ⚠️ Acudiente ${acudiente.nombres} no tiene usuario vinculado`)
                        continue
                    }

                    padresTotal++
                    const userId = acudiente.usuario.id

                    // Verificar tokens
                    const dispositivos = await db.from('dispositivos_moviles')
                        .where('usuario_id', userId)
                        .where('activo', true)
                        .select('*')

                    if (dispositivos.length > 0) {
                        padresConToken++
                        this.logger.success(`     ✅ Padre: ${acudiente.nombres} ${acudiente.apellidos} (ID: ${userId}) tiene ${dispositivos.length} dispositivos`)
                        dispositivos.forEach((d: any) => {
                            const modelo = d.modelo_dispositivo || d.dispositivo || 'Desconocido'
                            const plat = d.plataforma || d.sistema_operativo || 'Desconocido'
                            this.logger.info(`        📱 ${modelo} (${plat}): ${d.token_fcm.substring(0, 15)}...`)
                        })

                        // SOLO POR AHORA: Probar enviar Notificación si encontramos tokens
                        // this.logger.info('     🚀 Enviando notificación de prueba...')
                        // await MovilController.enviarNotificacionPush(...)
                        // (Comentado para evitar spam masivo, pero útil para probar uno específico)

                    } else {
                        // Check for inactive devices
                        const inactivos = await db.from('dispositivos_moviles')
                            .where('usuario_id', userId)
                            .select('*')

                        if (inactivos.length > 0) {
                            this.logger.warning(`     ⚠️ Padre: ${acudiente.nombres} (ID: ${userId}) tiene ${inactivos.length} dispositivos PERO TODOS INACTIVOS o sin 'activo=true'`)
                            inactivos.forEach((d: any) => {
                                this.logger.info(`        - Token: ${d.token_fcm.substring(0, 10)}... | Activo: ${d.activo} | Update: ${d.actualizado_en}`)
                            })
                        } else {
                            this.logger.error(`     ❌ Padre: ${acudiente.nombres} ${acudiente.apellidos} (ID: ${userId}) NO tiene NINGÚN dispositivo registrado en DB`)

                            // AUTO-FIX PARA PRUEBA: Insertar el token que nos dio el usuario si es ID 3
                            if (userId === 3) {
                                this.logger.info('     🔧 INSERTANDO TOKEN DE PRUEBA (Auto-Fix)...')
                                /*
                                // Usamos payload mínimo V2 (Schema confirmado por error ExecConstraints en plataforma)
                                await db.table('dispositivos_moviles').insert({
                                    usuario_id: userId,
                                    token_fcm: 'eRYa1nYlSO652yvXOSKlME:APA91bGl-XHnWSDNJ9S-Zs2ukNKwGN77n_3oHUwUjCGxrIl2Yz0KDmkdtYk_L5wI-AthSXwPusyWWmLVK4oJvLP044cdnmNFcZM2OnB9VovontRZD_W5z8E',
                                    activo: true,

                                    // Campos V2
                                    plataforma: 'Android',
                                    // modelo_dispositivo: REMOVED to see if this was the culprit

                                    creado_en: new Date(),
                                    actualizado_en: new Date()
                                })
                                this.logger.success('     ✅ Token de prueba insertado. Re-ejecuta el script para probar envío.')
                                */
                            }
                        }
                    }
                }
            }

            this.logger.info('--------------------------------------------------')
            this.logger.info(`📊 Resumen:`)
            this.logger.info(`   Total Padres: ${padresTotal}`)
            this.logger.info(`   Con Token FCM: ${padresConToken}`)
            this.logger.info(`   Sin Token: ${padresTotal - padresConToken}`)

            // Verificar schema de dispositivos_moviles
            this.logger.info('🔍 Inspeccionando columnas de dispositivos_moviles...')
            const cols = await db.raw("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'dispositivos_moviles'") as any
            if (cols.rows) {
                this.logger.info('📋 Columnas encontradas:')
                cols.rows.forEach((c: any) => this.logger.info(`   - ${c.column_name} (${c.data_type})`))
            }

            // 5. Verificar estado de notificaciones existentes
            this.logger.info('--------------------------------------------------')
            this.logger.info('🔍 Verificando tabla notificaciones_push...')

            try {
                // Verificar si existe la columna 'datos' (problema potencial de migración)
                const check = await db.raw('SELECT * FROM notificaciones_push LIMIT 1') as any
                const row = check.rows ? check.rows[0] : (check[0] ? check[0] : null)

                if (row) {
                    const hasDatos = 'datos' in row
                    if (hasDatos) {
                        this.logger.success('✅ Columna "datos" existe en notificaciones_push')
                    } else {
                        this.logger.error('❌ Columna "datos" NO existe en notificaciones_push (La inserción fallará)')
                    }
                } else {
                    this.logger.warning('⚠️ Tabla notificaciones_push está vacía, no se puede verificar esquemas por raw query, pero se asume OK si migraciones corrieron.')
                    // Fallback check columns via schema builder if possible or just ignore
                }
            } catch (e) {
                this.logger.error(`Error verificando esquema: ${e.message}`)
            }

            if (padresConToken === 0) {
                this.logger.error('❌ FATAL: Ningún padre tiene token FCM. Las notificaciones no llegarán.')

                // Verificar si se han guardado notificaciones en BD a pesar de no enviarse
                // Tomamos un ID de padre para verificar (el último del loop)
                // Nota: La lógica actual de enviarNotificacionPush PRIMERO verifica dispositivos > 0
                // Si retorna temprano, NO guarda en BD.
                // Pero si el código ha cambiado, verificamos.
            } else {
                this.logger.success('✅ El sistema parece listo para enviar notificaciones.')
            }

        } catch (error) {
            this.logger.error(`💥 Error inesperado: ${error.message}`)
            console.error(error)
        }
    }
}
