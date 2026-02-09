
 import type { HttpContext } from '@adonisjs/core/http'
 
 import Funcionario from '#models/funcionario'

 import db from '@adonisjs/lucid/services/db'
 import Institucion from '#models/institucion'
 import Role from '#models/role'
 import Usuario from '#models/usuario'

 export default class FuncionariosController {
   async index({ response }: HttpContext) {
     const funcionarios = await Funcionario.query().orderBy('id', 'desc')
     return response.ok(funcionarios)
   }

   async show({ params, response }: HttpContext) {
     const funcionario = await Funcionario.find(params.id)
     if (!funcionario) {
       return response.notFound({ message: 'Funcionario no encontrado' })
     }

     return response.ok(funcionario)
   }

   async store({ request, response }: HttpContext) {
     const nombre = request.input('nombre')
     const apellido = request.input('apellido')
     const telefono = request.input('telefono')
     const correoInstitucional = request.input('correoInstitucional') ?? request.input('correo_institucional')
     const direccion = request.input('direccion')

     const rolIdRaw = request.input('rolId') ?? request.input('rol_id')
     const usuarioIdRaw = request.input('usuarioId') ?? request.input('usuario_id')
     const institucionIdRaw = request.input('institucionId') ?? request.input('institucion_id')

     const correo = String(request.input('correo') ?? request.input('email') ?? '').trim()
     const contrasena = String(request.input('contrasena') ?? request.input('password') ?? '').trim()

     if (!nombre || !apellido || !rolIdRaw) {
       return response.badRequest({ message: 'nombre, apellido y rolId son requeridos' })
     }

     const rolId = Number(rolIdRaw)
     if (Number.isNaN(rolId)) {
       return response.badRequest({ message: 'rolId inválido' })
     }

     const usuarioId = usuarioIdRaw !== undefined && usuarioIdRaw !== null ? Number(usuarioIdRaw) : null
     if (usuarioId !== null && Number.isNaN(usuarioId)) {
       return response.badRequest({ message: 'usuarioId inválido' })
     }

     const institucionId =
       institucionIdRaw !== undefined && institucionIdRaw !== null ? Number(institucionIdRaw) : null
     if (institucionId !== null && Number.isNaN(institucionId)) {
       return response.badRequest({ message: 'institucionId inválido' })
     }

     const rol = await Role.find(rolId)
     if (!rol) {
       return response.badRequest({ message: 'El rolId no existe' })
     }

     if (institucionId !== null) {
       const institucion = await Institucion.find(institucionId)
       if (!institucion) {
         return response.badRequest({ message: 'El institucionId no existe' })
       }

       // Validar jerarquía: para roles 3, 4, 5, 6 debe existir un rector
       if ([3, 4, 5, 6].includes(rolId)) {
         const tieneRector = await Funcionario.query()
           .where('institucion_id', institucionId)
           .where('rol_id', 2)
           .first()

         if (!tieneRector) {
           const rolesMap: { [key: number]: string } = {
             3: 'coordinadores',
             4: 'orientadores',
             5: 'docentes',
             6: 'acudientes',
           }
           const rolNombre = rolesMap[rolId] || 'este rol'

           return response.status(400).json({
             success: false,
             message: `Debe crear primero un rector para la institución antes de asignar ${rolNombre}`,
           })
         }
       }
     }

     if (usuarioId === null && (!correo || !contrasena)) {
       return response.badRequest({ message: 'correo y contrasena son requeridos cuando no se envía usuarioId' })
     }

     try {
       const result = await db.transaction(async (trx) => {
         let usuario: Usuario

         if (usuarioId !== null) {
           const usuarioExistente = await Usuario.find(usuarioId)
           if (!usuarioExistente) {
             const err: any = new Error('El usuarioId no existe')
             err.code = 'USUARIO_NO_EXISTE'
             throw err
           }

           usuario = usuarioExistente
           usuario.rolId = rolId
           await usuario.useTransaction(trx).save()
         } else {
           const usuarioExistente = await Usuario.query().useTransaction(trx).where('correo', correo).first()
           if (usuarioExistente) {
             const err: any = new Error('Este usuario ya existe: el correo ya está registrado')
             err.code = 'USUARIO_CORREO_DUPLICADO'
             throw err
           }

           usuario = await Usuario.create(
             {
               correo,
               contrasenaHash: contrasena,
               estaActivo: true,
               debeCambiarContrasena: false,
               rolId,
             },
             { client: trx }
           )
         }

         const yaExiste = await Funcionario.query().useTransaction(trx).where('usuario_id', usuario.id).first()
         if (yaExiste) {
           const err: any = new Error('Ya existe un funcionario asociado a este usuarioId')
           err.code = 'FUNCIONARIO_DUPLICADO'
           throw err
         }

         const funcionario = await Funcionario.create(
           {
             nombre: String(nombre),
             apellido: String(apellido),
             telefono: telefono ?? null,
             correoInstitucional: correoInstitucional ?? null,
             direccion: direccion ?? null,
             rolId,
             usuarioId: usuario.id,
             institucionId,
           },
           { client: trx }
         )

         return { funcionario, usuario }
       })

       return response.created({
         funcionario: result.funcionario,
         usuario: { id: result.usuario.id, correo: result.usuario.correo, rolId: result.usuario.rolId },
       })
     } catch (error) {
       const msg = String(error?.message ?? 'Error al crear funcionario')
       const code = String((error as any)?.code ?? '')

       if (code === 'USUARIO_CORREO_DUPLICADO' || code === 'FUNCIONARIO_DUPLICADO') {
         return response.conflict({ message: msg })
       }

       if (code === 'USUARIO_NO_EXISTE') {
         return response.badRequest({ message: msg })
       }

       return response.internalServerError({ message: msg })
     }
   }

   async update({ params, request, response }: HttpContext) {
     const funcionario = await Funcionario.find(params.id)
     if (!funcionario) {
       return response.notFound({ message: 'Funcionario no encontrado' })
     }

     const rolIdRaw = request.input('rolId') ?? request.input('rol_id')
     const institucionIdRaw = request.input('institucionId') ?? request.input('institucion_id')

     if (rolIdRaw !== undefined) {
       const rolId = Number(rolIdRaw)
       if (Number.isNaN(rolId)) {
         return response.badRequest({ message: 'rolId inválido' })
       }
       const rol = await Role.find(rolId)
       if (!rol) {
         return response.badRequest({ message: 'El rolId no existe' })
       }
       funcionario.rolId = rolId

       const usuario = await Usuario.find(funcionario.usuarioId)
       if (usuario) {
         usuario.rolId = rolId
         await usuario.save()
       }
     }

     if (institucionIdRaw !== undefined) {
       const institucionId = institucionIdRaw === null ? null : Number(institucionIdRaw)
       if (institucionId !== null && Number.isNaN(institucionId)) {
         return response.badRequest({ message: 'institucionId inválido' })
       }
       if (institucionId !== null) {
         const institucion = await Institucion.find(institucionId)
         if (!institucion) {
           return response.badRequest({ message: 'El institucionId no existe' })
         }
       }
       funcionario.institucionId = institucionId
     }

     const nombre = request.input('nombre')
     const apellido = request.input('apellido')
     const telefono = request.input('telefono')
     const correoInstitucional = request.input('correoInstitucional') ?? request.input('correo_institucional')
     const direccion = request.input('direccion')

     if (nombre !== undefined) funcionario.nombre = nombre
     if (apellido !== undefined) funcionario.apellido = apellido
     if (telefono !== undefined) funcionario.telefono = telefono
     if (correoInstitucional !== undefined) funcionario.correoInstitucional = correoInstitucional
     if (direccion !== undefined) funcionario.direccion = direccion

     const correoUsuario = request.input('correo') ?? request.input('email')
     const contrasenaUsuario = request.input('contrasena') ?? request.input('password')

     if (correoUsuario !== undefined || contrasenaUsuario !== undefined) {
       const usuario = await Usuario.find(funcionario.usuarioId)
       if (!usuario) {
         return response.badRequest({ message: 'No existe usuario asociado a este funcionario' })
       }

       if (correoUsuario !== undefined) {
         const correoStr = String(correoUsuario).trim()
         const existente = await Usuario.query().where('correo', correoStr).andWhereNot('id', usuario.id).first()
         if (existente) {
           return response.conflict({ message: 'Este usuario ya existe: el correo ya está registrado' })
         }
         usuario.correo = correoStr
       }

       if (contrasenaUsuario !== undefined) {
         usuario.contrasenaHash = String(contrasenaUsuario).trim()
       }

       await usuario.save()
     }

     await funcionario.save()
     return response.ok(funcionario)
   }

   async destroy({ params, response }: HttpContext) {
     const funcionario = await Funcionario.find(params.id)
     if (!funcionario) {
       return response.notFound({ message: 'Funcionario no encontrado' })
     }

     await funcionario.delete()
     return response.ok({ message: 'Funcionario eliminado' })
   }
 }
