/**
 * Helper de WebDriver para pruebas E2E
 * Sistema JASS - Configuración y gestión del driver de Selenium
 */

import { Builder, WebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import * as path from 'path';
import { SeleniumConfig } from '../config/selenium.config';

// Path al chromedriver local (solo usado cuando no es CI)
const chromedriverPath = path.resolve(__dirname, '../../node_modules/chromedriver/lib/chromedriver/chromedriver.exe');

export class WebDriverHelper {
  private static driver: WebDriver | null = null;

  /**
   * Obtiene o crea una instancia del WebDriver
   */
  static async getDriver(): Promise<WebDriver> {
    if (!this.driver) {
      this.driver = await this.createDriver();
    }
    return this.driver;
  }

  /**
   * Crea una nueva instancia del WebDriver
   * En CI: Conecta a Selenium Grid remoto
   * En local: Usa chromedriver local
   */
  private static async createDriver(): Promise<WebDriver> {
    try {
      console.log('Configurando Chrome options...');
      console.log('Entorno CI:', SeleniumConfig.isCI ? 'Sí' : 'No');
      console.log('Base URL:', SeleniumConfig.baseUrl);
      
      const options = new chrome.Options();
      
      // Configuración del navegador - en CI siempre headless
      if (SeleniumConfig.browser.headless || SeleniumConfig.isCI) {
        options.addArguments('--headless=new');
        console.log('Modo headless activado');
      }
      
      options.addArguments(
        `--window-size=${SeleniumConfig.browser.windowSize.width},${SeleniumConfig.browser.windowSize.height}`,
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--allow-running-insecure-content'
      );

      let driver: WebDriver;

      if (SeleniumConfig.isCI) {
        // === MODO CI: Conectar a Selenium Grid remoto ===
        console.log('Conectando a Selenium Grid remoto...');
        console.log('Selenium Grid URL:', SeleniumConfig.seleniumGridUrl);
        
        driver = await new Builder()
          .forBrowser('chrome')
          .setChromeOptions(options)
          .usingServer(SeleniumConfig.seleniumGridUrl)
          .build();
          
        console.log('Conectado a Selenium Grid!');
      } else {
        // === MODO LOCAL: Usar chromedriver local ===
        console.log('Configurando ChromeDriver local...');
        console.log('Path chromedriver:', chromedriverPath);
        
        const service = new chrome.ServiceBuilder(chromedriverPath);
        
        driver = await new Builder()
          .forBrowser('chrome')
          .setChromeOptions(options)
          .setChromeService(service)
          .build();
          
        console.log('ChromeDriver local iniciado!');
      }

      console.log('WebDriver construido, configurando timeouts...');

      // Configurar timeouts
      await driver.manage().setTimeouts({
        implicit: SeleniumConfig.timeouts.implicit,
        pageLoad: SeleniumConfig.timeouts.pageLoad,
        script: SeleniumConfig.timeouts.script
      });

      // Maximizar ventana (solo en modo no-headless)
      if (!SeleniumConfig.isCI && !SeleniumConfig.browser.headless) {
        await driver.manage().window().maximize();
      }

      console.log('WebDriver listo!');
      return driver;
    } catch (error) {
      console.error('Error al crear WebDriver:', error);
      throw error;
    }
  }

  /**
   * Cierra el WebDriver y limpia la instancia
   */
  static async closeDriver(): Promise<void> {
    if (this.driver) {
      try {
        await this.driver.quit();
      } catch (error) {
        console.error('Error al cerrar el driver:', error);
      }
      this.driver = null;
    }
  }

  /**
   * Reinicia el WebDriver (cierra y crea uno nuevo)
   */
  static async restartDriver(): Promise<WebDriver> {
    await this.closeDriver();
    return await this.getDriver();
  }

  /**
   * Toma una captura de pantalla y la guarda
   */
  static async takeScreenshot(filename: string): Promise<string> {
    const driver = await this.getDriver();
    const screenshot = await driver.takeScreenshot();
    
    // En un entorno real, guardarías el archivo
    // Por ahora, retornamos el base64
    console.log(`Screenshot guardada: ${filename}`);
    return screenshot;
  }

  /**
   * Obtiene la URL actual
   */
  static async getCurrentUrl(): Promise<string> {
    const driver = await this.getDriver();
    return await driver.getCurrentUrl();
  }

  /**
   * Navega a una URL específica
   */
  static async navigateTo(url: string): Promise<void> {
    const driver = await this.getDriver();
    await driver.get(url);
  }

  /**
   * Refresca la página actual
   */
  static async refresh(): Promise<void> {
    const driver = await this.getDriver();
    await driver.navigate().refresh();
  }

  /**
   * Navega hacia atrás en el historial
   */
  static async goBack(): Promise<void> {
    const driver = await this.getDriver();
    await driver.navigate().back();
  }

  /**
   * Navega hacia adelante en el historial
   */
  static async goForward(): Promise<void> {
    const driver = await this.getDriver();
    await driver.navigate().forward();
  }

  /**
   * Limpia las cookies del navegador
   */
  static async clearCookies(): Promise<void> {
    const driver = await this.getDriver();
    await driver.manage().deleteAllCookies();
  }

  /**
   * Ejecuta JavaScript en el contexto de la página
   */
  static async executeScript<T>(script: string, ...args: unknown[]): Promise<T> {
    const driver = await this.getDriver();
    return await driver.executeScript(script, ...args) as T;
  }

  /**
   * Espera un tiempo específico (usar con moderación)
   */
  static async sleep(ms: number): Promise<void> {
    const driver = await this.getDriver();
    await driver.sleep(ms);
  }
}
