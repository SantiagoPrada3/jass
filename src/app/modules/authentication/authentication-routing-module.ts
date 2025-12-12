import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { Login } from './components/login/login';
import { ForgotPassword } from './components/forgot-password/forgot-password';
import { RoleSelector } from './components/role-selector/role-selector';

const routes: Routes = [

  {
    path: '', component: Login
  },
  {
    path: 'forgot-password', component: ForgotPassword
  },
  {
    path: 'role-selector', component: RoleSelector
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthenticationRoutingModule { }
