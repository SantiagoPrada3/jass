/**
 * Page Object Model para la página de Login
 * Sistema JASS - Pruebas E2E con Selenium
 */

import { WebDriver, By, until, WebElement } from 'selenium-webdriver';
import { SeleniumConfig } from '../config/selenium.config';

export class LoginPage {
  private driver: WebDriver;
  private baseUrl: string;

  constructor(driver: WebDriver) {
    this.driver = driver;
    this.baseUrl = SeleniumConfig.baseUrl;
  }

  /**
   * Navega a la página de login
   */
  async navigate(): Promise<void> {
    await this.driver.get(`${this.baseUrl}${SeleniumConfig.routes.login}`);
    await this.driver.wait(until.elementLocated(By.css('body')), SeleniumConfig.timeouts.pageLoad);
    // Esperar a que el formulario de login esté visible
    await this.driver.sleep(2000);
  }

  /**
   * Ingresa el nombre de usuario en el campo correspondiente
   */
  async enterUsername(username: string): Promise<void> {
    const usernameInput = await this.waitForElement(SeleniumConfig.selectors.usernameInput);
    await usernameInput.clear();
    await usernameInput.sendKeys(username);
  }

  /**
   * Ingresa la contraseña en el campo correspondiente
   */
  async enterPassword(password: string): Promise<void> {
    const passwordInput = await this.waitForElement(SeleniumConfig.selectors.passwordInput);
    await passwordInput.clear();
    await passwordInput.sendKeys(password);
  }

  /**
   * Hace clic en el botón de login
   */
  async clickLoginButton(): Promise<void> {
    const loginButton = await this.waitForElement(SeleniumConfig.selectors.loginButton);
    await loginButton.click();
  }

  /**
   * Realiza el proceso completo de login
   */
  async login(username: string, password: string): Promise<void> {
    await this.navigate();
    await this.enterUsername(username);
    await this.enterPassword(password);
    await this.clickLoginButton();
    
    // Esperar a que el login sea exitoso y la URL cambie
    // La aplicación redirige a /welcome después del login exitoso
    await this.driver.wait(async () => {
      const currentUrl = await this.driver.getCurrentUrl();
      return currentUrl.includes('welcome') || currentUrl.includes('admin') || currentUrl.includes('dashboard');
    }, SeleniumConfig.timeouts.pageLoad);
    
    // Esperar a que se complete la animación de bienvenida y se redirija al dashboard
    await this.driver.sleep(5000);
  }

  /**
   * Realiza login con las credenciales predeterminadas de la configuración
   */
  async loginWithDefaultCredentials(): Promise<void> {
    await this.login(
      SeleniumConfig.credentials.email,
      SeleniumConfig.credentials.password
    );
  }

  /**
   * Verifica si hay un mensaje de error visible
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      const errorElement = await this.driver.findElement(By.css('.error-message, .alert-error, .text-red-500'));
      return await errorElement.getText();
    } catch {
      return null;
    }
  }

  /**
   * Verifica si el usuario está logueado
   */
  async isLoggedIn(): Promise<boolean> {
    const currentUrl = await this.driver.getCurrentUrl();
    return currentUrl.includes('admin') || currentUrl.includes('dashboard') || currentUrl.includes('welcome');
  }

  /**
   * Espera a que un elemento esté presente y sea visible
   */
  private async waitForElement(selector: string): Promise<WebElement> {
    const selectors = selector.split(', ');
    
    for (const sel of selectors) {
      try {
        const element = await this.driver.wait(
          until.elementLocated(By.css(sel.trim())),
          SeleniumConfig.timeouts.elementWait
        );
        await this.driver.wait(until.elementIsVisible(element), SeleniumConfig.timeouts.elementWait);
        return element;
      } catch {
        continue;
      }
    }
    
    throw new Error(`No se encontró ningún elemento con los selectores: ${selector}`);
  }
}
