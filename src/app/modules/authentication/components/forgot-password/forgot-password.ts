import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css'
})
export class ForgotPassword {
  email: string = '';
  isLoading: boolean = false;
  isSuccess: boolean = false;

  onSubmit() {
    if (this.email) {
      this.isLoading = true;
      // Simular envío de correo
      setTimeout(() => {
        this.isLoading = false;
        this.isSuccess = true;
      }, 2000);
    }
  }
}
