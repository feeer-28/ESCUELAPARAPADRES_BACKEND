
 import type { HttpContext } from '@adonisjs/core/http'
 import hash from '@adonisjs/core/services/hash'
 import jwt from 'jsonwebtoken'
 import { DateTime } from 'luxon'
 
 import Acudiente from '#models/acudiente'
 import Docente from '#models/docente'
 import Funcionario from '#models/funcionario'
 import Role from '#models/role'
 import Usuario from '#models/usuario'
 import env from '#start/env'
 
 export default class LoginController {
   async login({ request, response }: HttpContext) {
     const usuarioInput = String(
       request.input('usuario') ?? request.input('correo') ?? request.input('email') ?? ''
     ).trim()
     const contrasena = String(request.input('contrasena') ?? request.input('password') ?? '').trim()
 
     if (!usuarioInput || !contrasena) {
       return response.badRequest({ message: 'usuario y contrasena son requeridos' })
     }
 
     const usuario = await Usuario.query().where('correo', usuarioInput).first()
     if (!usuario) {
       return response.unauthorized({ message: 'Usuario no existe' })
     }
 
     if (!usuario.estaActivo) {
       return response.forbidden({ message: 'Usuario desactivado. Contacta al administrador.' })
     }
 
     const ok = await hash.verify(usuario.contrasenaHash, contrasena)
     if (!ok) {
       return response.unauthorized({ message: 'Credenciales inválidas' })
     }
 
     usuario.ultimoIngreso = DateTime.now()
     await usuario.save()
 
     const rol = await Role.find(usuario.rolId)
     const rolNombre = (rol?.nombre ?? '').toLowerCase()
 
     const secret = env.get('JWT_SECRET', env.get('APP_KEY'))
     const accessToken = jwt.sign(
       {
         sub: usuario.id,
         correo: usuario.correo,
         rolId: usuario.rolId,
       },
       secret,
       { expiresIn: '7d' }
     )
 
     const data: any = {
       token: accessToken,
       tokenType: 'Bearer',
       authorization: `Bearer ${accessToken}`,
       usuario: {
         id: usuario.id,
         correo: usuario.correo,
         rolId: usuario.rolId,
         rolNombre: rol?.nombre ?? null,
         estaActivo: usuario.estaActivo,
         debeCambiarContrasena: usuario.debeCambiarContrasena,
       },
     }
 
     if (rolNombre === 'docente') {
       const docente = await Docente.query().where('usuario_id', usuario.id).first()
       if (docente) {
         await docente.load('cursos')
         data.docente = {
           id: docente.id,
           institucionId: docente.institucionId,
           cursos: docente.cursos,
         }
       }
     } else if (rolNombre === 'acudiente') {
       const acudiente = await Acudiente.query().where('usuario_id', usuario.id).first()
       if (acudiente) {
         await acudiente.load('estudiantes')
         data.acudiente = {
           id: acudiente.id,
           estudiantes: acudiente.estudiantes,
         }
       }
     } else {
       const funcionario = await Funcionario.query()
         .where('usuario_id', usuario.id)
         .preload('institucion')
         .first()
       if (funcionario) {
         data.funcionario = {
           id: funcionario.id,
           institucionId: funcionario.institucionId,
           institucion: funcionario.institucion,
         }
       }
     }

     const rolLabel = rol?.nombre ? String(rol.nombre) : 'desconocido'
     return response.ok({ message: `Iniciaste con rol: ${rolLabel}`, data })
   }

   async logout({ response, jwtUser }: HttpContext) {
     if (!jwtUser) {
       return response.unauthorized({ message: 'No autenticado' })
     }

     return response.ok({ message: 'Logout exitoso' })
   }
 }
