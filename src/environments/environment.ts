export const environment = {
  production: false,
  apiUrl: 'https://lab.vallegrande.edu.pe/jass',

  // Microservicios - URLs reales
  services: {
    gateway: 'https://lab.vallegrande.edu.pe/jass/ms-gateway',
    authentication: 'https://lab.vallegrande.edu.pe/jass/ms-authentication',
    users: 'https://lab.vallegrande.edu.pe/jass/ms-users',
    organizations: 'https://lab.vallegrande.edu.pe/jass/ms-organization',
    waterQuality: 'https://lab.vallegrande.edu.pe/jass/ms-water-quality',
    paymentsBilling: 'https://lab.vallegrande.edu.pe/jass/ms-payments-billing',
    inventoryPurchases: 'https://lab.vallegrande.edu.pe/jass/ms-gateway',
    infrastructure: 'https://rolling-xaviera-infrastructure-ms-f69d285a.koyeb.app',
    distribution: 'https://lab.vallegrande.edu.pe/jass/ms-distribution',
    claimsIncidents: 'https://lab.vallegrande.edu.pe/jass/ms-claims-incidents',
    notifications: 'https://lab.vallegrande.edu.pe/jass/ms-gateway/notifications'
  },

  // Keycloak - URL real
  keycloak: {
    url: 'https://lab.vallegrande.edu.pe/jass/keycloak',
    realm: 'sistema-jass',
    clientId: 'jass-users-service'
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
