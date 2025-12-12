export const environment = {
     production: false,
     apiUrl: 'https://lab.vallegrande.edu.pe/jass',

     // Microservicios - URLs reales
     services: {
          gateway: 'https://lab.vallegrande.edu.pe/jass/ms-gateway',
          infrastructure: 'https://rolling-xaviera-infrastructure-ms-f69d285a.koyeb.app',
          notifications: 'https://lab.vallegrande.edu.pe/jass/ms-gateway/notifications'
     },

     // Configuración de seguridad
     security: {
          tokenRefreshTime: 5 * 60 * 1000, // 5 minutos
          sessionTimeout: 30 * 60 * 1000,  // 30 minutos
          enableAuditLog: true,
          enableXSSProtection: true,
          enableCSRFProtection: false // Deshabilitado para JWT
     },

     // Features flags
     features: {
          multiOrganization: true,
          reportTemplates: true,
          advancedSecurity: true,
          realTimeNotifications: true
     }
};
