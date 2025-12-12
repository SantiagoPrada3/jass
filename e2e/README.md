# Pruebas E2E con Selenium WebDriver - Sistema JASS

## Descripción

Este directorio contiene las pruebas end-to-end (E2E) para el módulo de **Tipos de Incidencias** del Sistema JASS, utilizando Selenium WebDriver.

## Estructura del Proyecto

```
e2e/
├── config/
│   └── selenium.config.ts     # Configuración de Selenium y credenciales
├── helpers/
│   └── webdriver.helper.ts    # Helper para gestión del WebDriver
├── pages/
│   ├── login.page.ts          # Page Object para Login
│   └── incident-types.page.ts # Page Object para Tipos de Incidencias
├── incident-types/
│   └── incident-types.e2e.ts  # Suite de pruebas E2E
├── run-e2e-tests.ts           # Script principal de ejecución
├── tsconfig.json              # Configuración de TypeScript
└── README.md                  # Este archivo
```

## Prerrequisitos

1. **Node.js** (v18 o superior)
2. **Google Chrome** instalado en el sistema
3. **ChromeDriver** (se instala automáticamente con las dependencias)
4. La aplicación Angular debe estar ejecutándose en `http://localhost:4200`

## Instalación

Las dependencias ya están configuradas en el `package.json`. Si necesitas reinstalar:

```bash
npm install selenium-webdriver chromedriver @types/selenium-webdriver ts-node --save-dev
```

## Credenciales de Prueba

Las credenciales están configuradas en `e2e/config/selenium.config.ts`:

- **Email**: `isael.fatama@jass.gob.pe`
- **Password**: `Admin123!`

> ⚠️ **Importante**: No subas credenciales reales a repositorios públicos. Usa variables de entorno en producción.

## Ejecución de Pruebas

### 1. Iniciar la aplicación Angular

```bash
npm start
```

Espera a que la aplicación esté disponible en `http://localhost:4200`

### 2. Ejecutar las pruebas E2E

**Ejecutar todas las pruebas E2E:**
```bash
npm run e2e
```

**Ejecutar solo pruebas de Tipos de Incidencias:**
```bash
npm run e2e:incident-types
```

**Ejecutar directamente con ts-node:**
```bash
npx ts-node e2e/incident-types/incident-types.e2e.ts
```

## Pruebas Incluidas

La suite de pruebas de Tipos de Incidencias incluye:

| # | Prueba | Descripción |
|---|--------|-------------|
| 1 | Login con credenciales válidas | Verifica el proceso de autenticación |
| 2 | Navegación a Tipos de Incidencias | Verifica la navegación al módulo |
| 3 | Verificar estadísticas | Valida los contadores de la página |
| 4 | Abrir modal de nuevo tipo | Verifica apertura del formulario |
| 5 | Cerrar modal sin guardar | Verifica cierre del modal |
| 6 | Crear nuevo tipo de incidencia | Crea un registro de prueba |
| 7 | Buscar tipo de incidencia | Verifica la funcionalidad de búsqueda |
| 8 | Filtrar por estado | Verifica filtros de estado |
| 9 | Editar tipo de incidencia | Modifica el registro creado |
| 10 | Descargar reporte | Verifica la descarga de reportes |
| 11 | Eliminar tipo de incidencia | Limpia el registro de prueba |

## Configuración

### Configuración del Navegador

En `e2e/config/selenium.config.ts`:

```typescript
browser: {
  name: 'chrome',
  headless: false, // Cambiar a true para ejecución sin interfaz gráfica
  windowSize: {
    width: 1920,
    height: 1080
  }
}
```

### Timeouts

```typescript
timeouts: {
  implicit: 10000,    // Espera implícita
  pageLoad: 30000,    // Carga de página
  script: 30000,      // Ejecución de scripts
  elementWait: 15000  // Espera de elementos
}
```

## Patrones Utilizados

### Page Object Model (POM)

Cada página tiene su propio archivo con métodos para interactuar con la UI:

- `LoginPage`: Métodos para autenticación
- `IncidentTypesPage`: Métodos para el módulo de tipos de incidencias

### Helper de WebDriver

`WebDriverHelper` proporciona métodos estáticos para:
- Gestión del ciclo de vida del driver
- Captura de pantallas
- Navegación
- Ejecución de scripts

## Resolución de Problemas

### Error: Chrome no encontrado

Asegúrate de que Chrome esté instalado y accesible desde la línea de comandos.

### Error: Timeout en elementos

Aumenta los valores de timeout en `selenium.config.ts` o verifica que la aplicación esté cargando correctamente.

### Error: Selector no encontrado

Los selectores CSS están definidos en `selenium.config.ts`. Actualízalos si la estructura HTML de la aplicación cambia.

### Error: Login fallido

1. Verifica las credenciales en la configuración
2. Asegúrate de que el servidor de autenticación esté disponible
3. Verifica la URL de login en las rutas de la aplicación

## Ejecución en CI/CD

Para ejecución en entornos sin interfaz gráfica:

1. Cambia `headless: true` en la configuración
2. Asegúrate de que Chrome esté instalado en el runner
3. Considera usar contenedores Docker con Chrome preinstalado

## Contribución

Para agregar nuevas pruebas:

1. Crea un nuevo Page Object si es necesario en `e2e/pages/`
2. Agrega los métodos de interacción con la página
3. Crea el archivo de pruebas en el directorio correspondiente
4. Agrega el script de ejecución en `package.json`

## Licencia

Propiedad de JASS - Sistema de Gestión de Agua y Saneamiento
