import { Injectable } from '@angular/core';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { GOOGLE_MAPS_CONFIG } from '../config/google-maps.config';

declare global {
  interface Window {
    initMapCallback: () => void;
    google: any;
  }
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private isGoogleMapsLoaded = new BehaviorSubject<boolean>(false);
  private apiKey = GOOGLE_MAPS_CONFIG.API_KEY;
  private isLoading = false;

  constructor() {}

  /**
   * Load Google Maps API
   */
  loadGoogleMaps(): Observable<boolean> {
    return from(this.loadGoogleMapsScript());
  }

  /**
   * Check if Google Maps is already loaded
   */
  isMapsApiLoaded(): boolean {
    return typeof window.google !== 'undefined' && window.google.maps !== undefined;
  }

  /**
   * Get the Google Maps API status as observable
   */
  getMapsApiStatus(): Observable<boolean> {
    return this.isGoogleMapsLoaded.asObservable();
  }

  /**
   * Load Google Maps script dynamically
   */
  private loadGoogleMapsScript(): Promise<boolean> {
    return new Promise((resolve) => {
      // Check if already loaded
      if (this.isMapsApiLoaded()) {
        console.log('Google Maps API already loaded');
        this.isGoogleMapsLoaded.next(true);
        resolve(true);
        return;
      }

      // Check if script is already being loaded
      if (this.isLoading) {
        console.log('Google Maps API is already loading, waiting for completion');
        // Wait for the existing loading process
        const checkInterval = setInterval(() => {
          if (this.isMapsApiLoaded()) {
            clearInterval(checkInterval);
            this.isGoogleMapsLoaded.next(true);
            resolve(true);
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          console.error('Google Maps API loading timeout');
          resolve(false);
        }, 10000);
        return;
      }

      this.isLoading = true;
      console.log('Loading Google Maps API with key:', this.apiKey);

      // Remove any existing script with the same source
      const existingScript = document.querySelector(`script[src*="maps.googleapis.com/maps/api/js"]`);
      if (existingScript) {
        existingScript.remove();
      }

      // Create script element
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}`;
      script.async = true;
      script.defer = true;
      
      // Handle successful load
      script.onload = () => {
        console.log('Google Maps API loaded successfully');
        this.isLoading = false;
        this.isGoogleMapsLoaded.next(true);
        resolve(true);
      };
      
      // Handle errors
      script.onerror = (error) => {
        console.error('Error loading Google Maps API:', error);
        this.isLoading = false;
        this.isGoogleMapsLoaded.next(false);
        resolve(false);
      };
      
      // Handle timeout
      setTimeout(() => {
        if (!this.isMapsApiLoaded()) {
          console.error('Google Maps API loading timeout');
          this.isLoading = false;
          this.isGoogleMapsLoaded.next(false);
          resolve(false);
        }
      }, 15000);
      
      // Append script to head
      document.head.appendChild(script);
    });
  }

  /**
   * Create a new Google Map
   */
  createMap(
    element: HTMLElement, 
    options: google.maps.MapOptions
  ): google.maps.Map {
    if (!this.isMapsApiLoaded()) {
      throw new Error('Google Maps API is not loaded');
    }
    return new google.maps.Map(element, options);
  }

  /**
   * Create a new marker
   */
  createMarker(options: google.maps.MarkerOptions): google.maps.Marker {
    if (!this.isMapsApiLoaded()) {
      throw new Error('Google Maps API is not loaded');
    }
    return new google.maps.Marker(options);
  }

  /**
   * Create an info window
   */
  createInfoWindow(options: google.maps.InfoWindowOptions): google.maps.InfoWindow {
    if (!this.isMapsApiLoaded()) {
      throw new Error('Google Maps API is not loaded');
    }
    return new google.maps.InfoWindow(options);
  }
  
  /**
   * Set API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }
  
  /**
   * Get current API key
   */
  getApiKey(): string {
    return this.apiKey;
  }
  
  /**
   * Get default location
   */
  getDefaultLocation(): { lat: number, lng: number } {
    return GOOGLE_MAPS_CONFIG.DEFAULT_LOCATION;
  }
}