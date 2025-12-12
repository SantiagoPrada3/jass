import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '../../../../core/auth/services/auth';
import { LoginRequest } from '../../../../core/auth/models/auth';
import { NotificationService } from '../../../../shared/services/notification.service';
import { Toast } from '../../../../shared/components/ui/notifications/toast/toast';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule,
    Toast
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationService = inject(NotificationService);

  username: string = '';
  password: string = '';
  showPassword: boolean = false;
  rememberMe: boolean = false;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onEmailChange(event: any): void {
    this.username = event.target.value;
  }

  onSubmit(): void {
    if (!this.username.trim() || !this.password.trim()) {
      this.notificationService.warning(
        '📝 Campos Requeridos',
        'Por favor, ingresa tu usuario y contraseña para continuar.',
        4000
      );
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    // Mostrar notificación de carga
    this.notificationService.info(
      '🔄 Iniciando sesión',
      'Verificando tus credenciales, por favor espera...',
      2000
    );

    const loginRequest: LoginRequest = {
      username: this.username,
      password: this.password,
      rememberMe: this.rememberMe
    };

    this.authService.login(loginRequest).subscribe({
      next: (user) => {
        this.isLoading = false;
        // Mostrar notificación de éxito
        this.notificationService.success(
          '✅ Inicio de Sesión Exitoso',
          `¡Bienvenido! Redirigiendo al dashboard...`,
          3000
        );
        // No necesitamos redirigir aquí, el servicio de autenticación se encarga de redirigir a la pantalla de bienvenida
        // Y la pantalla de bienvenida se encarga de redirigir al dashboard según el rol
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Error al iniciar sesión. Verifica tus credenciales.';

        // Determinar el título y mensaje basado en el tipo de error
        let title = '🔒 Error de Autenticación';
        let message = this.errorMessage || 'Error desconocido';

        const errorText = message.toLowerCase();

        if (errorText.includes('credenciales inválidas') || errorText.includes('invalid credentials') || errorText.includes('usuario o contraseña')) {
          title = '🚫 Credenciales Incorrectas';
          message = 'El usuario o contraseña que ingresaste no son correctos. Por favor verifica e intenta nuevamente.';
        } else if (errorText.includes('conexión') || errorText.includes('connection') || errorText.includes('network')) {
          title = '🌐 Error de Conexión';
          message = 'No se pudo conectar con el servidor. Verifica tu conexión a internet e intenta nuevamente.';
        } else if (errorText.includes('servidor') || errorText.includes('server') || errorText.includes('internal')) {
          title = '⚠️ Error del Servidor';
          message = 'Hay un problema temporal con el servidor. Intenta nuevamente en unos momentos.';
        } else if (errorText.includes('timeout') || errorText.includes('tiempo')) {
          title = '⏱️ Tiempo Agotado';
          message = 'La petición ha tardado demasiado tiempo. Verifica tu conexión e intenta nuevamente.';
        }

        this.notificationService.error(
          title,
          message,
          8000 // 8 segundos para errores importantes
        );

        console.error('Error de autenticación completo:', {
          error,
          message: error.message,
          stack: error.stack,
          response: error.error
        });
      }
    });
  }
}
