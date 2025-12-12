/**
 * Page Object Model para la página de Tipos de Incidencias
 * Sistema JASS - Pruebas E2E con Selenium
 * 
 * Actualizado con selectores basados en el HTML real de la aplicación
 */

import { WebDriver, By, until, WebElement, Key } from 'selenium-webdriver';
import { SeleniumConfig } from '../config/selenium.config';

export interface IncidentTypeData {
  typeCode: string;
  typeName: string;
  description: string;
  priorityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresExternalService: boolean;
}

export class IncidentTypesPage {
  private driver: WebDriver;
  private baseUrl: string;

  constructor(driver: WebDriver) {
    this.driver = driver;
    this.baseUrl = SeleniumConfig.baseUrl;
  }

  /**
   * Navega a la página de tipos de incidencias
   */
  async navigate(): Promise<void> {
    const targetUrl = `${this.baseUrl}${SeleniumConfig.routes.incidentTypes}`;
    console.log(`   Navegando a: ${targetUrl}`);
    await this.driver.get(targetUrl);
    
    // Esperar a que la URL cambie
    await this.driver.wait(async () => {
      const currentUrl = await this.driver.getCurrentUrl();
      return currentUrl.includes('incidents/types');
    }, SeleniumConfig.timeouts.pageLoad);
    
    // Esperar a que la página cargue completamente
    await this.driver.sleep(3000);
    await this.waitForPageLoad();
  }

  /**
   * Espera a que la página cargue completamente
   */
  async waitForPageLoad(): Promise<void> {
    await this.driver.sleep(2000);
    
    try {
      // Esperar por el título de la página
      await this.driver.wait(
        until.elementLocated(By.xpath("//h1[contains(text(), 'Tipos') or contains(text(), 'Incidencias')]")),
        SeleniumConfig.timeouts.pageLoad
      );
    } catch {
      console.log('   Esperando carga de página...');
    }
    
    // Esperar a que desaparezca el indicador de carga
    try {
      await this.driver.wait(async () => {
        const loaders = await this.driver.findElements(By.css('.animate-spin'));
        return loaders.length === 0;
      }, 10000);
    } catch {
      // Continuar si no hay loader
    }
  }

  /**
   * Obtiene el título de la página
   */
  async getPageTitle(): Promise<string> {
    try {
      const titleElement = await this.driver.findElement(By.css('h1.text-3xl'));
      return await titleElement.getText();
    } catch {
      try {
        const h1Elements = await this.driver.findElements(By.css('h1'));
        if (h1Elements.length > 0) {
          return await h1Elements[0].getText();
        }
      } catch {
        // Ignorar
      }
      return '';
    }
  }

  /**
   * Obtiene el conteo total de tipos de incidencias desde las estadísticas
   */
  async getTotalTypesCount(): Promise<number> {
    try {
      const statCards = await this.driver.findElements(By.css('.bg-blue-50 .text-3xl'));
      if (statCards.length > 0) {
        const text = await statCards[0].getText();
        return parseInt(text, 10) || 0;
      }
    } catch {
      // Ignorar
    }
    return 0;
  }

  /**
   * Obtiene el conteo de tipos activos
   */
  async getActiveTypesCount(): Promise<number> {
    try {
      const statCards = await this.driver.findElements(By.css('.bg-green-50 .text-3xl'));
      if (statCards.length > 0) {
        const text = await statCards[0].getText();
        return parseInt(text, 10) || 0;
      }
    } catch {
      // Ignorar
    }
    return 0;
  }

  /**
   * Obtiene el conteo de tipos inactivos
   */
  async getInactiveTypesCount(): Promise<number> {
    try {
      const statCards = await this.driver.findElements(By.css('.bg-red-50 .text-3xl'));
      if (statCards.length > 0) {
        const text = await statCards[0].getText();
        return parseInt(text, 10) || 0;
      }
    } catch {
      // Ignorar
    }
    return 0;
  }

  /**
   * Busca tipos de incidencias por texto
   */
  async search(searchText: string): Promise<void> {
    const searchInput = await this.driver.findElement(By.css('input[placeholder*="Buscar"]'));
    await searchInput.clear();
    await searchInput.sendKeys(searchText);
    await this.driver.sleep(1000);
  }

  /**
   * Limpia el campo de búsqueda
   */
  async clearSearch(): Promise<void> {
    const searchInput = await this.driver.findElement(By.css('input[placeholder*="Buscar"]'));
    await searchInput.clear();
    await this.driver.sleep(500);
  }

  /**
   * Selecciona un filtro de estado
   */
  async selectStatusFilter(status: 'ALL' | 'ACTIVE' | 'INACTIVE'): Promise<void> {
    // Abrir dropdown
    const dropdownButtons = await this.driver.findElements(By.css('.relative > button'));
    for (const btn of dropdownButtons) {
      const text = await btn.getText();
      if (text.includes('Todos') || text.includes('activos')) {
        await btn.click();
        await this.driver.sleep(300);
        break;
      }
    }
    
    const statusLabels: Record<string, string> = {
      'ALL': 'Todos los tipos',
      'ACTIVE': 'Solo activos',
      'INACTIVE': 'Solo inactivos'
    };
    
    await this.driver.sleep(300);
    const options = await this.driver.findElements(By.css('.absolute button, .dropdown-menu button'));
    for (const option of options) {
      const text = await option.getText();
      if (text.includes(statusLabels[status])) {
        await option.click();
        break;
      }
    }
    await this.driver.sleep(500);
  }

  /**
   * Hace clic en el botón "Nuevo Tipo" usando JavaScript para evitar interceptación
   */
  async clickNewTypeButton(): Promise<void> {
    // Esperar un momento para que la página esté lista
    await this.driver.sleep(1000);
    
    // Buscar el botón por su texto
    const buttons = await this.driver.findElements(By.css('button.bg-blue-600'));
    
    for (const button of buttons) {
      const text = await button.getText();
      if (text.includes('Nuevo Tipo')) {
        // Usar JavaScript para hacer clic y evitar interceptación
        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", button);
        await this.driver.sleep(500);
        await this.driver.executeScript("arguments[0].click();", button);
        await this.driver.sleep(1000);
        return;
      }
    }
    
    throw new Error('No se encontró el botón "Nuevo Tipo"');
  }

  /**
   * Verifica si el modal/panel lateral de creación está abierto
   */
  async isModalOpen(): Promise<boolean> {
    try {
      // El modal es un panel lateral con position fixed
      const panels = await this.driver.findElements(By.css('div[style*="position: fixed"][style*="right: 0"]'));
      for (const panel of panels) {
        const isDisplayed = await panel.isDisplayed();
        if (isDisplayed) {
          return true;
        }
      }
      
      // También buscar por el header del modal
      const headers = await this.driver.findElements(By.xpath("//*[contains(text(), 'Crear Nuevo Tipo de Incidente')]"));
      return headers.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Llena el formulario de tipo de incidencia
   */
  async fillIncidentTypeForm(data: IncidentTypeData): Promise<void> {
    console.log(`   Llenando formulario con: ${data.typeName}`);
    
    // Esperar a que el modal esté completamente cargado
    await this.driver.sleep(1000);
    
    // Código del tipo - input con name="typeCode"
    try {
      const codeInput = await this.driver.findElement(By.css('input[name="typeCode"]'));
      await codeInput.clear();
      await codeInput.sendKeys(data.typeCode);
      console.log(`   - Código: ${data.typeCode}`);
    } catch (e) {
      console.log('   - Campo código no editable o no encontrado');
    }

    // Nombre del tipo - input con name="typeName"
    const nameInput = await this.driver.findElement(By.css('input[name="typeName"]'));
    await nameInput.clear();
    await nameInput.sendKeys(data.typeName);
    console.log(`   - Nombre: ${data.typeName}`);

    // Descripción - textarea con name="description"
    const descInput = await this.driver.findElement(By.css('textarea[name="description"]'));
    await descInput.clear();
    await descInput.sendKeys(data.description);
    console.log(`   - Descripción: ${data.description.substring(0, 30)}...`);

    // Nivel de prioridad - select con name="priorityLevel"
    const prioritySelect = await this.driver.findElement(By.css('select[name="priorityLevel"]'));
    await prioritySelect.click();
    await this.driver.sleep(200);
    
    const priorityOption = await this.driver.findElement(By.css(`select[name="priorityLevel"] option[value="${data.priorityLevel}"]`));
    await priorityOption.click();
    console.log(`   - Prioridad: ${data.priorityLevel}`);

    // Checkbox de servicio externo - input[name="requiresExternalService"]
    if (data.requiresExternalService) {
      const checkbox = await this.driver.findElement(By.css('input[name="requiresExternalService"]'));
      const isChecked = await checkbox.isSelected();
      if (!isChecked) {
        await this.driver.executeScript("arguments[0].click();", checkbox);
        console.log('   - Servicio externo: activado');
      }
    }
    
    await this.driver.sleep(500);
  }

  /**
   * Hace clic en el botón de guardar/crear del formulario
   */
  async clickSaveButton(): Promise<void> {
    // Buscar el botón "Crear Tipo" en el footer del modal
    const buttons = await this.driver.findElements(By.css('button[type="submit"]'));
    
    for (const button of buttons) {
      const text = await button.getText();
      if (text.includes('Crear Tipo') || text.includes('Guardar')) {
        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", button);
        await this.driver.sleep(300);
        await this.driver.executeScript("arguments[0].click();", button);
        console.log('   - Clic en botón Crear Tipo');
        await this.driver.sleep(2000);
        return;
      }
    }
    
    throw new Error('No se encontró el botón de guardar');
  }

  /**
   * Cierra el modal haciendo clic en el botón X o Cancelar
   */
  async closeModal(): Promise<void> {
    try {
      // Buscar el botón X (que tiene el símbolo ×)
      const closeButtons = await this.driver.findElements(By.xpath("//button[contains(., '×')]"));
      if (closeButtons.length > 0) {
        await this.driver.executeScript("arguments[0].click();", closeButtons[0]);
        await this.driver.sleep(500);
        return;
      }
      
      // Alternativa: buscar botón Cancelar
      const cancelButtons = await this.driver.findElements(By.xpath("//button[contains(text(), 'Cancelar')]"));
      if (cancelButtons.length > 0) {
        await this.driver.executeScript("arguments[0].click();", cancelButtons[0]);
        await this.driver.sleep(500);
        return;
      }
      
      // Último recurso: presionar Escape
      await this.driver.actions().sendKeys(Key.ESCAPE).perform();
    } catch {
      await this.driver.actions().sendKeys(Key.ESCAPE).perform();
    }
    await this.driver.sleep(500);
  }

  /**
   * Obtiene todas las filas de la tabla de tipos de incidencias
   */
  async getTableRows(): Promise<WebElement[]> {
    try {
      return await this.driver.findElements(By.css('table tbody tr'));
    } catch {
      return [];
    }
  }

  /**
   * Obtiene el número de filas en la tabla
   */
  async getTableRowCount(): Promise<number> {
    const rows = await this.getTableRows();
    return rows.length;
  }

  /**
   * Busca una fila por el nombre del tipo de incidencia
   */
  async findRowByTypeName(typeName: string): Promise<WebElement | null> {
    const rows = await this.getTableRows();
    for (const row of rows) {
      const text = await row.getText();
      if (text.includes(typeName)) {
        return row;
      }
    }
    return null;
  }

  /**
   * Hace clic en el botón de ver detalles/editar de una fila
   */
  async clickEditButton(row: WebElement): Promise<void> {
    // Buscar el botón "Ver Detalles" que permite ver y luego editar
    const buttons = await row.findElements(By.css('button'));
    for (const button of buttons) {
      const text = await button.getText();
      if (text.includes('Ver Detalles') || text.includes('Editar')) {
        await this.driver.executeScript("arguments[0].click();", button);
        await this.driver.sleep(1000);
        return;
      }
    }
    throw new Error('No se encontró el botón de editar');
  }

  /**
   * Habilita el modo edición en el panel de detalles
   */
  async enableEditMode(): Promise<void> {
    // El botón Editar está en el header del panel lateral
    // Buscar en el área del panel (div con position fixed y background slate)
    try {
      // Buscar el botón Editar en el panel
      const editButtons = await this.driver.findElements(By.xpath("//button[text()='Editar' or contains(text(), 'Editar')]"));
      
      for (const button of editButtons) {
        const isDisplayed = await button.isDisplayed();
        if (isDisplayed) {
          await this.driver.executeScript("arguments[0].click();", button);
          console.log('   - Modo edición habilitado');
          await this.driver.sleep(500);
          return;
        }
      }
      
      // Alternativa: buscar por estilo del botón (borde blanco en fondo oscuro)
      const headerButtons = await this.driver.findElements(By.css('div[style*="background-color: #1e293b"] button'));
      for (const button of headerButtons) {
        const text = await button.getText();
        if (text.includes('Editar')) {
          await this.driver.executeScript("arguments[0].click();", button);
          console.log('   - Modo edición habilitado (alt)');
          await this.driver.sleep(500);
          return;
        }
      }
    } catch (e) {
      console.log('   - No se encontró botón Editar, posiblemente ya en modo edición');
    }
  }

  /**
   * Hace clic en el botón de eliminar de una fila
   */
  async clickDeleteButton(row: WebElement): Promise<void> {
    const buttons = await row.findElements(By.css('button'));
    for (const button of buttons) {
      const text = await button.getText();
      if (text.includes('Eliminar')) {
        await this.driver.executeScript("arguments[0].click();", button);
        await this.driver.sleep(500);
        return;
      }
    }
    throw new Error('No se encontró el botón de eliminar');
  }

  /**
   * Confirma la eliminación en el modal de confirmación
   */
  async confirmDelete(): Promise<void> {
    await this.driver.sleep(500);
    const buttons = await this.driver.findElements(By.css('button'));
    for (const button of buttons) {
      const text = await button.getText();
      if (text.includes('Eliminar') || text.includes('Confirmar') || text.includes('Sí')) {
        const classes = await button.getAttribute('class');
        // Buscar el botón rojo de confirmar
        if (classes && (classes.includes('bg-red') || classes.includes('text-white'))) {
          await this.driver.executeScript("arguments[0].click();", button);
          await this.driver.sleep(1500);
          return;
        }
      }
    }
    throw new Error('No se encontró el botón de confirmar eliminación');
  }

  /**
   * Verifica si se muestra una notificación de éxito
   */
  async isSuccessNotificationVisible(): Promise<boolean> {
    try {
      const toast = await this.driver.findElement(By.css('.toast-success, [class*="toast-success"]'));
      return await toast.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Verifica si se muestra una notificación de error
   */
  async isErrorNotificationVisible(): Promise<boolean> {
    try {
      const toast = await this.driver.findElement(By.css('.toast-error, [class*="toast-error"]'));
      return await toast.isDisplayed();
    } catch {
      return false;
    }
  }

  /**
   * Obtiene el mensaje de la notificación actual
   */
  async getNotificationMessage(): Promise<string | null> {
    try {
      const toast = await this.driver.findElement(By.css('.toast-notification, [class*="toast"]'));
      return await toast.getText();
    } catch {
      return null;
    }
  }

  /**
   * Hace clic en el botón de descargar reporte
   */
  async clickDownloadReportButton(): Promise<void> {
    // Primero cerrar cualquier modal/panel que esté abierto
    try {
      await this.closeModal();
    } catch {
      // No hay modal abierto
    }
    await this.driver.sleep(500);
    
    // Scroll hacia arriba para asegurar que el botón esté visible
    await this.driver.executeScript("window.scrollTo(0, 0);");
    await this.driver.sleep(500);
    
    const buttons = await this.driver.findElements(By.css('button.bg-green-600'));
    for (const button of buttons) {
      const text = await button.getText();
      if (text.includes('Descargar') || text.includes('Reporte')) {
        // Hacer scroll al elemento
        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", button);
        await this.driver.sleep(500);
        // Usar JavaScript para evitar interceptación
        await this.driver.executeScript("arguments[0].click();", button);
        console.log('   - Clic en botón Descargar Reporte');
        await this.driver.sleep(1500);
        return;
      }
    }
    throw new Error('No se encontró el botón de descargar reporte');
  }

  /**
   * Espera un tiempo específico
   */
  async wait(ms: number): Promise<void> {
    await this.driver.sleep(ms);
  }
}
