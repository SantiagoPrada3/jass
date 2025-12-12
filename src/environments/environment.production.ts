export const environment = {
  production: true,
  apiUrl: 'https://lab.vallegrande.edu.pe/jass',

  // Microservicios - URLs reales
  services: {
    gateway: 'https://lab.vallegrande.edu.pe/jass/ms-gateway',
    infrastructure: 'https://rolling-xaviera-infrastructure-ms-f69d285a.koyeb.app',
    notifications: 'https://lab.vallegrande.edu.pe/jass/ms-gateway/notifications'
  },

  // Configuración de seguridad
  security: {
    tokenRefreshTime: 5 * 60 * 1000,
    sessionTimeout: 30 * 60 * 1000,
    enableAuditLog: true,
    enableXSSProtection: true,
    enableCSRFProtection: true,
    sanitizePayloads: true,           // Nueva propiedad para controlar la sanitización
    hideConsoleLogsInProduction: true, // Nueva propiedad para ocultar logs en producción
    logLevel: 'error'                 // Solo mostrar errores en producción
  },

  // Features flags
  features: {
    multiOrganization: true,
    reportTemplates: true,
    advancedSecurity: true,
    realTimeNotifications: true
  }
};
