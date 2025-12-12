import { Injectable } from '@angular/core';
import { TokenPayload } from '../models/auth';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly TOKEN_EXPIRY_KEY = 'token_expiry';

  /**
   * Almacena los tokens en localStorage
   */
  setTokens(accessToken: string, refreshToken: string, expiresIn: number): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);

    // Calcular tiempo de expiración y guardar
    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Obtiene el access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Obtiene el refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Elimina todos los tokens
   */
  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Verifica si hay un token válido
   */
  hasValidToken(): boolean {
    const token = this.getAccessToken();
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);

    if (!token || !expiryTime) return false;

    // Verificar si el token no ha expirado
    return Date.now() < parseInt(expiryTime);
  }

  /**
   * Decodifica el JWT token
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      const payload = token.split('.')[1];
      const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(decodedPayload);
    } catch (error) {
      console.error('Error decodificando token:', error);
      return null;
    }
  }

  /**
   * Obtiene el payload del token actual
   */
  getTokenPayload(): TokenPayload | null {
    const token = this.getAccessToken();
    if (!token) return null;

    return this.decodeToken(token);
  }

  /**
   * Verifica si el token está próximo a expirar (dentro de 5 minutos)
   */
  isTokenExpiringSoon(): boolean {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return true;

    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return parseInt(expiryTime) < fiveMinutesFromNow;
  }

  /**
   * Obtiene el tiempo restante del token en segundos
   */
  getTokenRemainingTime(): number {
    const expiryTime = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiryTime) return 0;

    return Math.max(0, (parseInt(expiryTime) - Date.now()) / 1000);
  }
}
