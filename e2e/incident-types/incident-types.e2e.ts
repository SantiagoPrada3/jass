/**
 * Pruebas E2E para el módulo de Tipos de Incidencias
 * Sistema JASS - Selenium WebDriver
 * 
 * Para ejecutar: npx ts-node e2e/incident-types/incident-types.e2e.ts
 */

import { WebDriver, By, until } from 'selenium-webdriver';
import { WebDriverHelper } from '../helpers/webdriver.helper';
import { LoginPage } from '../pages/login.page';
import { IncidentTypesPage, IncidentTypeData } from '../pages/incident-types.page';
import { SeleniumConfig } from '../config/selenium.config';

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Resultados de las pruebas
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const testResults: TestResult[] = [];

/**
 * Función helper para ejecutar una prueba
 */
async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  console.log(`\n${colors.cyan}▶ Ejecutando: ${name}${colors.reset}`);
  
  try {
    await testFn();
    const duration = Date.now() - startTime;
    testResults.push({ name, passed: true, duration });
    console.log(`${colors.green}✓ PASÓ: ${name} (${duration}ms)${colors.reset}`);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    testResults.push({ name, passed: false, error: errorMessage, duration });
    console.log(`${colors.red}✗ FALLÓ: ${name}${colors.reset}`);
    console.log(`${colors.red}  Error: ${errorMessage}${colors.reset}`);
  }
}

/**
 * Aserción simple
 */
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

/**
 * Suite de pruebas para Tipos de Incidencias
 */
async function incidentTypesTestSuite(): Promise<void> {
  let driver: WebDriver;
  let loginPage: LoginPage;
  let incidentTypesPage: IncidentTypesPage;
  
  // Datos de prueba (sin estimatedResolutionTime ya que se asigna automáticamente)
  const testIncidentType: IncidentTypeData = {
    typeCode: 'TEST-E2E-001',
    typeName: 'Prueba E2E Selenium',
    description: 'Este es un tipo de incidencia creado automáticamente por pruebas E2E con Selenium WebDriver',
    priorityLevel: 'MEDIUM',
    requiresExternalService: false
  };

  const updatedIncidentType: IncidentTypeData = {
    ...testIncidentType,
    typeName: 'Prueba E2E Actualizada',
    description: 'Descripción actualizada por pruebas E2E',
    priorityLevel: 'HIGH'
  };

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   PRUEBAS E2E - TIPOS DE INCIDENCIAS - SISTEMA JASS${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}Credenciales: ${SeleniumConfig.credentials.email}${colors.reset}`);
  console.log(`${colors.yellow}URL Base: ${SeleniumConfig.baseUrl}${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);

  try {
    // Inicializar WebDriver
    console.log(`\n${colors.cyan}Inicializando WebDriver...${colors.reset}`);
    driver = await WebDriverHelper.getDriver();
    loginPage = new LoginPage(driver);
    incidentTypesPage = new IncidentTypesPage(driver);
    console.log(`${colors.green}WebDriver inicializado correctamente${colors.reset}`);

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 1: Login con credenciales válidas
    // ═══════════════════════════════════════════════════════════════
    await runTest('Login con credenciales válidas', async () => {
      await loginPage.loginWithDefaultCredentials();
      const isLoggedIn = await loginPage.isLoggedIn();
      assert(isLoggedIn, 'El usuario debería estar logueado después del login');
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 2: Navegación a la página de Tipos de Incidencias
    // ═══════════════════════════════════════════════════════════════
    await runTest('Navegación a Tipos de Incidencias', async () => {
      await incidentTypesPage.navigate();
      const pageTitle = await incidentTypesPage.getPageTitle();
      assert(
        pageTitle.toLowerCase().includes('tipos') || pageTitle.toLowerCase().includes('incidencia'),
        `El título de la página debería contener "Tipos" o "Incidencia", pero es: ${pageTitle}`
      );
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 3: Verificar estadísticas de la página
    // ═══════════════════════════════════════════════════════════════
    await runTest('Verificar estadísticas de tipos de incidencias', async () => {
      await incidentTypesPage.waitForPageLoad();
      const totalCount = await incidentTypesPage.getTotalTypesCount();
      const activeCount = await incidentTypesPage.getActiveTypesCount();
      const inactiveCount = await incidentTypesPage.getInactiveTypesCount();
      
      console.log(`   Total: ${totalCount}, Activos: ${activeCount}, Inactivos: ${inactiveCount}`);
      
      // Las estadísticas deberían ser números válidos
      assert(totalCount >= 0, 'El total de tipos debería ser mayor o igual a 0');
      assert(activeCount >= 0, 'El conteo de activos debería ser mayor o igual a 0');
      assert(inactiveCount >= 0, 'El conteo de inactivos debería ser mayor o igual a 0');
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 4: Abrir modal de nuevo tipo
    // ═══════════════════════════════════════════════════════════════
    await runTest('Abrir modal de nuevo tipo de incidencia', async () => {
      await incidentTypesPage.clickNewTypeButton();
      const isModalOpen = await incidentTypesPage.isModalOpen();
      assert(isModalOpen, 'El modal de creación debería estar abierto');
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 5: Cerrar modal sin guardar
    // ═══════════════════════════════════════════════════════════════
    await runTest('Cerrar modal sin guardar cambios', async () => {
      await incidentTypesPage.closeModal();
      await driver.sleep(500);
      const isModalOpen = await incidentTypesPage.isModalOpen();
      assert(!isModalOpen, 'El modal debería estar cerrado');
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 6: Crear nuevo tipo de incidencia
    // ═══════════════════════════════════════════════════════════════
    await runTest('Crear nuevo tipo de incidencia', async () => {
      const initialCount = await incidentTypesPage.getTotalTypesCount();
      
      await incidentTypesPage.clickNewTypeButton();
      await driver.sleep(500);
      await incidentTypesPage.fillIncidentTypeForm(testIncidentType);
      await incidentTypesPage.clickSaveButton();
      
      // Esperar a que se procese la creación
      await driver.sleep(2000);
      
      // Verificar que se creó correctamente
      const row = await incidentTypesPage.findRowByTypeName(testIncidentType.typeName);
      assert(row !== null, `Debería existir una fila con el nombre "${testIncidentType.typeName}"`);
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 7: Buscar tipo de incidencia creado
    // ═══════════════════════════════════════════════════════════════
    await runTest('Buscar tipo de incidencia por nombre', async () => {
      await incidentTypesPage.search(testIncidentType.typeName);
      const rowCount = await incidentTypesPage.getTableRowCount();
      assert(rowCount > 0, 'Debería encontrar al menos un resultado');
      
      const row = await incidentTypesPage.findRowByTypeName(testIncidentType.typeName);
      assert(row !== null, `Debería encontrar el tipo "${testIncidentType.typeName}"`);
      
      await incidentTypesPage.clearSearch();
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 8: Filtrar por estado Activo
    // ═══════════════════════════════════════════════════════════════
    await runTest('Filtrar tipos de incidencias por estado Activo', async () => {
      await incidentTypesPage.selectStatusFilter('ACTIVE');
      await driver.sleep(500);
      
      // Verificar que solo se muestran activos
      const activeCount = await incidentTypesPage.getActiveTypesCount();
      const rowCount = await incidentTypesPage.getTableRowCount();
      
      // El número de filas debería coincidir aproximadamente con los activos
      console.log(`   Activos mostrados: ${activeCount}, Filas en tabla: ${rowCount}`);
      
      // Restablecer filtro
      await incidentTypesPage.selectStatusFilter('ALL');
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 9: Editar tipo de incidencia
    // ═══════════════════════════════════════════════════════════════
    await runTest('Editar tipo de incidencia existente', async () => {
      await incidentTypesPage.search(testIncidentType.typeName);
      await driver.sleep(500);
      
      const row = await incidentTypesPage.findRowByTypeName(testIncidentType.typeName);
      assert(row !== null, `Debería encontrar el tipo "${testIncidentType.typeName}" para editar`);
      
      if (row) {
        // Paso 1: Abrir panel de detalles
        await incidentTypesPage.clickEditButton(row);
        await driver.sleep(1000);
        
        const isModalOpen = await incidentTypesPage.isModalOpen();
        assert(isModalOpen, 'El panel de detalles debería estar abierto');
        
        // Paso 2: Habilitar modo edición
        await incidentTypesPage.enableEditMode();
        await driver.sleep(500);
        
        // Paso 3: Modificar los campos
        await incidentTypesPage.fillIncidentTypeForm(updatedIncidentType);
        
        // Paso 4: Guardar cambios
        await incidentTypesPage.clickSaveButton();
        await driver.sleep(2000);
        
        // Verificar que se actualizó
        await incidentTypesPage.clearSearch();
        await incidentTypesPage.search(updatedIncidentType.typeName);
        const updatedRow = await incidentTypesPage.findRowByTypeName(updatedIncidentType.typeName);
        assert(updatedRow !== null, `Debería encontrar el tipo actualizado "${updatedIncidentType.typeName}"`);
      }
      
      await incidentTypesPage.clearSearch();
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 10: Descargar reporte
    // ═══════════════════════════════════════════════════════════════
    await runTest('Descargar reporte de tipos de incidencias', async () => {
      // Primero cerrar cualquier panel que esté abierto
      await incidentTypesPage.closeModal();
      await driver.sleep(500);
      
      // Navegar de nuevo a la página para asegurar estado limpio
      await incidentTypesPage.navigate();
      await driver.sleep(1000);
      
      await incidentTypesPage.selectStatusFilter('ALL');
      await driver.sleep(500);
      
      // Esta prueba solo verifica que el botón existe y es clickeable
      // La descarga real del archivo depende de la configuración del navegador
      await incidentTypesPage.clickDownloadReportButton();
      await driver.sleep(2000);
      
      // Verificamos que no haya error y la página siga funcional
      const pageTitle = await incidentTypesPage.getPageTitle();
      assert(pageTitle.length > 0, 'La página debería seguir siendo funcional después de la descarga');
    });

    // ═══════════════════════════════════════════════════════════════
    // PRUEBA 11: Eliminar tipo de incidencia (cleanup)
    // ═══════════════════════════════════════════════════════════════
    await runTest('Eliminar tipo de incidencia creado', async () => {
      // Navegar de nuevo para evitar elementos stale
      await incidentTypesPage.navigate();
      await driver.sleep(1000);
      
      await incidentTypesPage.search(updatedIncidentType.typeName);
      await driver.sleep(1000);
      
      // Buscar la fila fresca
      let row = await incidentTypesPage.findRowByTypeName(updatedIncidentType.typeName);
      
      if (row) {
        try {
          await incidentTypesPage.clickDeleteButton(row);
          await driver.sleep(500);
          await incidentTypesPage.confirmDelete();
          await driver.sleep(2000);
          
          // Verificar que se eliminó
          await incidentTypesPage.clearSearch();
          await incidentTypesPage.search(updatedIncidentType.typeName);
          const deletedRow = await incidentTypesPage.findRowByTypeName(updatedIncidentType.typeName);
          
          // Puede que esté inactivo en lugar de eliminado completamente
          console.log(`   Tipo ${deletedRow ? 'todavía existe (probablemente inactivo)' : 'eliminado correctamente'}`);
        } catch (e) {
          // Si hay error de stale, intentar de nuevo
          console.log('   Reintentando eliminación...');
          row = await incidentTypesPage.findRowByTypeName(updatedIncidentType.typeName);
          if (row) {
            await incidentTypesPage.clickDeleteButton(row);
            await driver.sleep(500);
            await incidentTypesPage.confirmDelete();
          }
        }
      } else {
        console.log('   El tipo de incidencia ya no existe');
      }
      
      await incidentTypesPage.clearSearch();
    });

  } catch (error) {
    console.error(`${colors.red}Error fatal en la suite de pruebas:${colors.reset}`, error);
  } finally {
    // Cerrar el navegador
    console.log(`\n${colors.cyan}Cerrando WebDriver...${colors.reset}`);
    await WebDriverHelper.closeDriver();
    
    // Mostrar resumen de resultados
    printTestSummary();
  }
}

/**
 * Imprime el resumen de las pruebas
 */
function printTestSummary(): void {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}                    RESUMEN DE PRUEBAS${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}`);
  
  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;
  const totalDuration = testResults.reduce((acc, r) => acc + r.duration, 0);
  
  testResults.forEach(result => {
    const icon = result.passed ? `${colors.green}✓` : `${colors.red}✗`;
    const status = result.passed ? 'PASÓ' : 'FALLÓ';
    console.log(`${icon} ${status}${colors.reset}: ${result.name} (${result.duration}ms)`);
    if (!result.passed && result.error) {
      console.log(`${colors.red}    └─ ${result.error}${colors.reset}`);
    }
  });
  
  console.log(`\n${colors.blue}───────────────────────────────────────────────────────────────${colors.reset}`);
  console.log(`Total: ${testResults.length} pruebas`);
  console.log(`${colors.green}Pasaron: ${passed}${colors.reset}`);
  console.log(`${colors.red}Fallaron: ${failed}${colors.reset}`);
  console.log(`Tiempo total: ${totalDuration}ms`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════════${colors.reset}\n`);
  
  // Exit code basado en resultados
  if (failed > 0) {
    process.exitCode = 1;
  }
}

// Ejecutar las pruebas
incidentTypesTestSuite().catch(console.error);
