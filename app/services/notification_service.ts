import { getMessaging } from '#config/firebase'
import Usuario from '#models/usuario'

export default class NotificationService {
  /**
   * Enviar notificación a un usuario específico
   */
  static async sendToUser(
    userId: number,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const messaging = getMessaging()
      if (!messaging) {
        console.warn('Firebase Messaging no está configurado')
        return { success: false, error: 'Firebase no configurado' }
      }

      // Buscar token FCM del usuario
      const usuario = await Usuario.find(userId)
      if (!usuario || !usuario.tokenFcm) {
        console.log(`Usuario ${userId} no tiene token FCM registrado`)
        return { success: false, error: 'Usuario sin token FCM' }
      }

      // Convertir data a strings (Firebase solo acepta string values)
      const stringData: Record<string, string> = {}
      if (data) {
        Object.keys(data).forEach((key) => {
          stringData[key] = String(data[key])
        })
      }

      // Enviar notificación
      const message: any = {
        token: usuario.tokenFcm,
        notification: {
          title,
          body,
        },
        data: stringData,
      }

      const response = await messaging.send(message)
      console.log(`✅ Notificación enviada a usuario ${userId}:`, response)

      return { success: true }
    } catch (error: any) {
      console.error(`Error al enviar notificación a usuario ${userId}:`, error)

      // Si el token es inválido, limpiarlo de la BD
      if (
        error.code === 'messaging/invalid-registration-token' ||
        error.code === 'messaging/registration-token-not-registered'
      ) {
        try {
          const usuario = await Usuario.find(userId)
          if (usuario) {
            usuario.tokenFcm = null
            await usuario.save()
            console.log(`Token FCM inválido eliminado para usuario ${userId}`)
          }
        } catch (updateError) {
          console.error('Error al actualizar token FCM:', updateError)
        }
      }

      return { success: false, error: error.message }
    }
  }

  /**
   * Enviar notificación a múltiples usuarios
   */
  static async sendToMultipleUsers(
    userIds: number[],
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    try {
      const messaging = getMessaging()
      if (!messaging) {
        console.warn('Firebase Messaging no está configurado')
        return { success: false, sent: 0, failed: userIds.length }
      }

      // Buscar tokens FCM de los usuarios
      const usuarios = await Usuario.query().whereIn('id', userIds).whereNotNull('token_fcm')

      if (usuarios.length === 0) {
        console.log('Ningún usuario tiene token FCM registrado')
        return { success: false, sent: 0, failed: userIds.length }
      }

      const tokens = usuarios.map((u) => u.tokenFcm!).filter(Boolean)

      if (tokens.length === 0) {
        return { success: false, sent: 0, failed: userIds.length }
      }

      // Convertir data a strings
      const stringData: Record<string, string> = {}
      if (data) {
        Object.keys(data).forEach((key) => {
          stringData[key] = String(data[key])
        })
      }

      // Enviar notificaciones en batch
      const message: any = {
        notification: {
          title,
          body,
        },
        data: stringData,
        tokens,
      }

      const response = await messaging.sendEachForMulticast(message)
      console.log(
        `✅ Notificaciones enviadas: ${response.successCount} exitosas, ${response.failureCount} fallidas`
      )

      // Limpiar tokens inválidos
      if (response.failureCount > 0) {
        const invalidTokens: string[] = []
        response.responses.forEach((resp, idx) => {
          if (!resp.success && tokens[idx]) {
            const error = resp.error
            if (
              error?.code === 'messaging/invalid-registration-token' ||
              error?.code === 'messaging/registration-token-not-registered'
            ) {
              invalidTokens.push(tokens[idx])
            }
          }
        })

        if (invalidTokens.length > 0) {
          await Usuario.query().whereIn('token_fcm', invalidTokens).update({ tokenFcm: null })
          console.log(`Tokens FCM inválidos eliminados: ${invalidTokens.length}`)
        }
      }

      return {
        success: true,
        sent: response.successCount,
        failed: response.failureCount,
      }
    } catch (error: any) {
      console.error('Error al enviar notificaciones múltiples:', error)
      return { success: false, sent: 0, failed: userIds.length }
    }
  }

  /**
   * Enviar notificación a un topic
   */
  static async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const messaging = getMessaging()
      if (!messaging) {
        console.warn('Firebase Messaging no está configurado')
        return { success: false, error: 'Firebase no configurado' }
      }

      // Convertir data a strings
      const stringData: Record<string, string> = {}
      if (data) {
        Object.keys(data).forEach((key) => {
          stringData[key] = String(data[key])
        })
      }

      // Enviar notificación al topic
      const message: any = {
        topic,
        notification: {
          title,
          body,
        },
        data: stringData,
      }

      const response = await messaging.send(message)
      console.log(`✅ Notificación enviada al topic ${topic}:`, response)

      return { success: true }
    } catch (error: any) {
      console.error(`Error al enviar notificación al topic ${topic}:`, error)
      return { success: false, error: error.message }
    }
  }
}
