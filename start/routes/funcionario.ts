
 import router from '@adonisjs/core/services/router'
 //import { middleware } from '#start/kernel'
 import FuncionariosController from '#controllers/funcionariosController'
 
 router
   .group(() => {
     router.get('/funcionarios', [FuncionariosController, 'index'])
     router.get('/funcionarios/:id', [FuncionariosController, 'show'])
     router.post('/funcionarios', [FuncionariosController, 'store'])
     router.put('/funcionarios/:id', [FuncionariosController, 'update'])
     router.patch('/funcionarios/:id', [FuncionariosController, 'update'])
     router.delete('/funcionarios/:id', [FuncionariosController, 'destroy'])
   })
   
