/**
 * Configuración de Selenium WebDriver para pruebas E2E
 * Sistema JASS - Módulo de Tipos de Incidencias
 */

// Detectar si estamos en entorno CI (GitLab CI)
const isCI = process.env.CI === 'true' || process.env.GITLAB_CI === 'true';

// Mostrar info de ambiente al cargar
if (isCI) {
  console.log('🔧 Configuración CI detectada');
  console.log('   BASE_URL env:', process.env.BASE_URL || 'no definida');
  console.log('   SELENIUM_REMOTE_URL env:', process.env.SELENIUM_REMOTE_URL || 'no definida');
}

export const SeleniumConfig = {
  // Detectar si estamos en CI
  isCI: isCI,
  
  // URL base de la aplicación
  // En CI, usamos la variable BASE_URL que se configura dinámicamente con la IP del contenedor
  baseUrl: process.env.BASE_URL || 'http://localhost:4200',
  
  // URL del Selenium Grid remoto (solo para CI)
  seleniumGridUrl: process.env.SELENIUM_REMOTE_URL || 'http://selenium:4444/wd/hub',
  
  // Credenciales de prueba
  credentials: {
    email: 'isael.fatama@jass.gob.pe',
    password: 'Admin123!'
  },
  
  // Timeouts en milisegundos (más largos en CI)
  timeouts: {
    implicit: isCI ? 20000 : 10000,
    pageLoad: isCI ? 60000 : 30000,
    script: isCI ? 60000 : 30000,
    elementWait: isCI ? 30000 : 15000
  },
  
  // Rutas de la aplicación
  routes: {
    login: '/',
    welcome: '/welcome',
    dashboard: '/admin/dashboard',
    incidentTypes: '/admin/incidents/types'
  },
  
  // Configuración del navegador
  browser: {
    name: 'chrome',
    headless: false, // Cambiar a true para ejecución sin interfaz gráfica
    windowSize: {
      width: 1920,
      height: 1080
    }
  },
  
  // Selectores CSS comunes
  selectors: {
    // Login
    usernameInput: 'input#email, input[name="email"], input[placeholder*="Usuario"]',
    passwordInput: 'input#password, input[name="password"], input[type="password"]',
    loginButton: 'button[type="submit"]',
    
    // Incident Types
    incidentTypesTable: 'table, .incident-types-table',
    newTypeButton: 'button:has-text("Nuevo Tipo"), .btn-new-type',
    searchInput: 'input[placeholder*="Buscar"]',
    statusDropdown: '.status-dropdown, select[name="status"]',
    
    // Modal
    modal: '.modal, [role="dialog"]',
    modalTitle: '.modal-title, h2',
    modalCloseButton: '.modal-close, button[aria-label="Cerrar"]',
    
    // Form inputs
    typeCodeInput: 'input[name="typeCode"], #typeCode',
    typeNameInput: 'input[name="typeName"], #typeName',
    descriptionInput: 'textarea[name="description"], #description',
    prioritySelect: 'select[name="priorityLevel"], #priorityLevel',
    estimatedTimeInput: 'input[name="estimatedResolutionTime"], #estimatedResolutionTime',
    requiresExternalCheckbox: 'input[name="requiresExternalService"], #requiresExternalService',
    
    // Buttons
    saveButton: 'button[type="submit"]:has-text("Guardar"), .btn-save',
    cancelButton: 'button:has-text("Cancelar"), .btn-cancel',
    deleteButton: 'button:has-text("Eliminar"), .btn-delete',
    editButton: 'button:has-text("Editar"), .btn-edit',
    
    // Notifications
    toast: '.toast-notification, .notification',
    toastSuccess: '.toast-success',
    toastError: '.toast-error'
  }
};
