import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthenticationRoutingModule } from './authentication-routing-module';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { Login } from './components/login/login';
import { RoleSelector } from './components/role-selector/role-selector';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    AuthenticationRoutingModule,
    Login, // standalone component
    ForgotPassword,  // standalone component
    RoleSelector // standalone component
  ]
})
export class AuthenticationModule { }
