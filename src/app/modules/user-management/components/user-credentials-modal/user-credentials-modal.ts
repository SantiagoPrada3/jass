import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserCreationResponse } from '../../models/user.model';
import { NotificationService } from '../../../../shared/services/notification.service';

@Component({
     standalone: true,
     imports: [CommonModule],
     selector: 'app-user-credentials-modal',
     templateUrl: './user-credentials-modal.html',
     styleUrl: './user-credentials-modal.css'
})
export class UserCredentialsModal {
     @Input() isOpen: boolean = false;
     @Input() userCreationData: UserCreationResponse | null = null;
     @Output() close = new EventEmitter<void>();

     constructor(private notificationService: NotificationService) { }

     /**
      * Copia el texto al portapapeles
      */
     async copyToClipboard(text: string, type: 'username' | 'password'): Promise<void> {
          try {
               await navigator.clipboard.writeText(text);

               const message = type === 'username' ? 'Usuario copiado al portapapeles' : 'Contraseña copiada al portapapeles';
               this.notificationService.success('¡Copiado!', message);
          } catch (error) {
               console.error('Error copiando al portapapeles:', error);
               this.notificationService.error('Error', 'No se pudo copiar al portapapeles');
          }
     }

     /**
      * Copia todas las credenciales al portapapeles
      */
     async copyAllCredentials(): Promise<void> {
          if (!this.userCreationData) return;

          const credentialsText = `
📋 CREDENCIALES DE ACCESO - ${this.userCreationData.userInfo.firstName} ${this.userCreationData.userInfo.lastName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Usuario: ${this.userCreationData.username}
🔑 Contraseña Temporal: ${this.userCreationData.temporaryPassword}

📌 INFORMACIÓN IMPORTANTE:
• El usuario debe cambiar su contraseña en el primer acceso
• Estas credenciales son temporales por seguridad
• Guarde esta información de forma segura

🏢 Código de Usuario: ${this.userCreationData.userInfo.userCode}
📅 Fecha de Creación: ${new Date().toLocaleDateString('es-ES')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

          try {
               await navigator.clipboard.writeText(credentialsText.trim());
               this.notificationService.success('¡Credenciales copiadas!', 'Todas las credenciales han sido copiadas al portapapeles');
          } catch (error) {
               console.error('Error copiando credenciales:', error);
               this.notificationService.error('Error', 'No se pudieron copiar las credenciales');
          }
     }

     /**
      * Cierra el modal
      */
     onClose(): void {
          this.close.emit();
     }

     /**
      * Imprime las credenciales
      */
     printCredentials(): void {
          if (!this.userCreationData) return;

          const printContent = `
               <html>
                    <head>
                         <title>Credenciales de Acceso - ${this.userCreationData.userInfo.firstName} ${this.userCreationData.userInfo.lastName}</title>
                         <style>
                              body { font-family: Arial, sans-serif; padding: 20px; }
                              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
                              .credentials { background: #f9f9f9; padding: 20px; border-radius: 8px; }
                              .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
                              .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
                         </style>
                    </head>
                    <body>
                         <div class="header">
                              <h1>CREDENCIALES DE ACCESO</h1>
                              <h2>${this.userCreationData.userInfo.firstName} ${this.userCreationData.userInfo.lastName}</h2>
                              <p>Código de Usuario: <strong>${this.userCreationData.userInfo.userCode}</strong></p>
                         </div>

                         <div class="credentials">
                              <h3>Datos de Acceso:</h3>
                              <p><strong>Usuario:</strong> ${this.userCreationData.username}</p>
                              <p><strong>Contraseña Temporal:</strong> ${this.userCreationData.temporaryPassword}</p>
                         </div>

                         <div class="warning">
                              <h3>⚠️ INFORMACIÓN IMPORTANTE:</h3>
                              <ul>
                                   <li>El usuario debe cambiar su contraseña en el primer acceso</li>
                                   <li>Estas credenciales son temporales por seguridad</li>
                                   <li>Guarde esta información de forma segura</li>
                                   <li>No comparta estas credenciales por medios no seguros</li>
                              </ul>
                         </div>

                         <div class="footer">
                              <p>Fecha de generación: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}</p>
                              <p>Sistema de Gestión JASS</p>
                         </div>
                    </body>
               </html>
          `;

          const printWindow = window.open('', '_blank');
          if (printWindow) {
               printWindow.document.write(printContent);
               printWindow.document.close();
               printWindow.print();

               this.notificationService.success('Credenciales enviadas a imprimir', 'El documento se ha enviado a la impresora');
          } else {
               this.notificationService.error('Error', 'No se pudo abrir la ventana de impresión');
          }
     }

     /**
      * Formatea la fecha de creación
      */
     getFormattedDate(): string {
          if (!this.userCreationData) return '';

          return new Date(this.userCreationData.userInfo.createdAt).toLocaleString('es-ES', {
               year: 'numeric',
               month: 'long',
               day: 'numeric',
               hour: '2-digit',
               minute: '2-digit'
          });
     }
}
