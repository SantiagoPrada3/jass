export const SECURITY_CONFIG = {
  encryptionKey: 'your-encryption-key-here',
  csrfHeaderName: 'X-CSRF-TOKEN',
  allowedOrigins: ['http://localhost:4200', 'https://sistemajass.com'],
  sessionStoragePrefix: 'jass_',
  auditEvents: [
    'login',
    'logout',
    'data_access',
    'data_modification',
    'security_violation'
  ]
};
