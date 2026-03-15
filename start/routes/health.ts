// ==========================================
// HEALTH CHECK ROUTE
// ==========================================

import router from '@adonisjs/core/services/router'

/**
 * Health check endpoint simple
 * GET /health
 */
router.get('/health', async ({ response }) => {
  return response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  })
})
