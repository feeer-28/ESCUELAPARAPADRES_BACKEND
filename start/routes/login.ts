
 import router from '@adonisjs/core/services/router'
 import { middleware } from '#start/kernel'
 
 const LoginController = () => import('#controllers/loginController')
 
 router.post('/login', [LoginController, 'login'])
 
 router
   .group(() => {
     router.post('/logout', [LoginController, 'logout'])
   })
   .use(middleware.jwt())
