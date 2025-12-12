import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Niveles de log soportados
 */
export enum LogLevel {
     Off = 0,
     Error,
     Warning,
     Info,
     Debug
}

/**
 * Servicio de logging que maneja la salida de mensajes de acuerdo
 * al entorno de ejecución (desarrollo o producción)
 */
@Injectable({
     providedIn: 'root'
})
export class LoggingService {
     private level: LogLevel;

     constructor() {
          // En producción, solo mostramos errores
          // En desarrollo, mostramos todos los niveles
          this.level = environment.production ? LogLevel.Error : LogLevel.Debug;

          // Si estamos en producción y la propiedad hideConsoleLogsInProduction está disponible
          if (environment.production &&
               environment.security &&
               'hideConsoleLogsInProduction' in environment.security) {
               // Si se establece explícitamente que se deben ocultar los logs
               if (environment.security.hideConsoleLogsInProduction === true) {
                    this.level = LogLevel.Error; // Solo mostramos errores críticos
               }
          }
     }

     /**
      * Muestra un mensaje de error, siempre visible incluso en producción
      * @param message Mensaje a mostrar
      * @param data Datos adicionales opcionales
      */
     error(message: string, data?: any): void {
          this.logWith(LogLevel.Error, message, data);
     }

     /**
      * Muestra un mensaje de advertencia, no visible en producción
      * @param message Mensaje a mostrar
      * @param data Datos adicionales opcionales
      */
     warn(message: string, data?: any): void {
          this.logWith(LogLevel.Warning, message, data);
     }

     /**
      * Muestra un mensaje informativo, no visible en producción
      * @param message Mensaje a mostrar
      * @param data Datos adicionales opcionales
      */
     info(message: string, data?: any): void {
          this.logWith(LogLevel.Info, message, data);
     }

     /**
      * Muestra un mensaje de depuración, no visible en producción
      * @param message Mensaje a mostrar
      * @param data Datos adicionales opcionales
      */
     debug(message: string, data?: any): void {
          this.logWith(LogLevel.Debug, message, data);
     }

     /**
      * Método interno para manejar los logs según el nivel
      */
     private logWith(level: LogLevel, message: string, data?: any): void {
          // Si el nivel actual de log es menor que el nivel configurado, no mostramos nada
          if (level > this.level) {
               return;
          }

          // En producción, podemos elegir no mostrar ciertos niveles
          if (environment.production && level < LogLevel.Error) {
               return;
          } const timestamp = new Date().toISOString();
          const logMessage = `[${timestamp}] ${LogLevel[level]}: ${message}`;

          this.writeToConsole(level, logMessage, data);
     }

     /**
      * Método para escribir en consola según el nivel
      */
     private writeToConsole(level: LogLevel, message: string, data?: any): void {
          const hasData = data !== undefined;

          switch (level) {
               case LogLevel.Error:
                    hasData ? console.error(message, data) : console.error(message);
                    break;
               case LogLevel.Warning:
                    hasData ? console.warn(message, data) : console.warn(message);
                    break;
               case LogLevel.Info:
                    hasData ? console.info(message, data) : console.info(message);
                    break;
               case LogLevel.Debug:
                    hasData ? console.debug(message, data) : console.debug(message);
                    break;
               default:
                    break;
          }
     }
}
