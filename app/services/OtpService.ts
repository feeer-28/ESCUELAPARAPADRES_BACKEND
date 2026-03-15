/**
 * Servicio de envío de OTP
 * 
 * Actualmente solo loguea el código en consola.
 * Para producción: configurar SMTP en .env y descomentar la sección de nodemailer.
 * 
 * Variables .env requeridas para SMTP:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=tu-email@gmail.com
 *   SMTP_PASSWORD=tu-app-password
 *   SMTP_FROM=Escuela para Padres <noreply@escuelapadres.com>
 */

// import nodemailer from 'nodemailer'  // npm install nodemailer
// import env from '#start/env'

export default class OtpService {

    /**
     * Enviar código OTP al contacto
     * @returns true si se envió correctamente
     */
    static async enviarCodigo(contacto: string, codigo: string): Promise<boolean> {
        const metodo = contacto.includes('@') ? 'email' : 'sms'

        if (metodo === 'email') {
            return this.enviarPorEmail(contacto, codigo)
        } else {
            return this.enviarPorSms(contacto, codigo)
        }
    }

    /**
     * Enviar OTP por email
     * 
     * Para activar: 
     *   1. npm install nodemailer
     *   2. Configurar variables SMTP en .env
     *   3. Descomentar el bloque de abajo
     */
    private static async enviarPorEmail(email: string, codigo: string): Promise<boolean> {
        try {
            // ──────────────────────────────────────────────
            // DESCOMENTAR CUANDO SE TENGA SMTP CONFIGURADO
            // ──────────────────────────────────────────────
            //
            // const transporter = nodemailer.createTransport({
            //   host: env.get('SMTP_HOST', 'smtp.gmail.com'),
            //   port: Number(env.get('SMTP_PORT', '587')),
            //   secure: false,
            //   auth: {
            //     user: env.get('SMTP_USER'),
            //     pass: env.get('SMTP_PASSWORD'),
            //   },
            // })
            //
            // await transporter.sendMail({
            //   from: env.get('SMTP_FROM', 'Escuela para Padres <noreply@escuelapadres.com>'),
            //   to: email,
            //   subject: 'Código de recuperación - Escuela para Padres',
            //   html: `
            //     <div style="font-family: Arial; max-width: 400px; margin: 0 auto; padding: 20px;">
            //       <h2>Recuperación de contraseña</h2>
            //       <p>Tu código de verificación es:</p>
            //       <div style="background: #f0f0f0; padding: 15px; text-align: center; font-size: 32px; letter-spacing: 8px; font-weight: bold; border-radius: 8px;">
            //         ${codigo}
            //       </div>
            //       <p style="color: #666; margin-top: 15px;">Este código expira en 15 minutos.</p>
            //       <p style="color: #999; font-size: 12px;">Si no solicitaste este código, ignora este mensaje.</p>
            //     </div>
            //   `,
            // })
            //
            // console.log(`[OTP] ✅ Código enviado por email a ${email}`)
            // return true
            // ──────────────────────────────────────────────

            // Modo desarrollo: solo loguear
            console.log(`[OTP] 📧 Código ${codigo} → ${email} (email simulado)`)
            return true
        } catch (error) {
            console.error(`[OTP] ❌ Error enviando email a ${email}:`, error)
            return false
        }
    }

    /**
     * Enviar OTP por SMS
     * 
     * Para activar: integrar Twilio, AWS SNS, u otro proveedor SMS
     */
    private static async enviarPorSms(telefono: string, codigo: string): Promise<boolean> {
        try {
            // TODO: Integrar servicio SMS (Twilio, AWS SNS, etc.)
            console.log(`[OTP] 📱 Código ${codigo} → ${telefono} (SMS simulado)`)
            return true
        } catch (error) {
            console.error(`[OTP] ❌ Error enviando SMS a ${telefono}:`, error)
            return false
        }
    }
}
