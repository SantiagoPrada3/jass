import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingStateService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private requestCount = 0;

  public loading$ = this.loadingSubject.asObservable();

  /**
   * Establece el estado de loading
   */
  setLoading(loading: boolean): void {
    if (loading) {
      this.requestCount++;
    } else {
      this.requestCount = Math.max(0, this.requestCount - 1);
    }

    // Solo mostrar loading si hay requests pendientes
    this.loadingSubject.next(this.requestCount > 0);
  }

  /**
   * Obtiene el estado actual de loading
   */
  get isLoading(): boolean {
    return this.loadingSubject.value;
  }

  /**
   * Fuerza el estado de loading
   */
  forceLoading(loading: boolean): void {
    this.requestCount = loading ? 1 : 0;
    this.loadingSubject.next(loading);
  }
}
