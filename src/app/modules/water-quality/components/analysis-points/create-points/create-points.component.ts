import { Component, Input, Output, EventEmitter, SimpleChanges, OnInit, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { WaterQualityApi } from '../../../services/water-quality-api';
import { TestingPoints } from '../../../models/quality-test.model';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { Toast } from '../../../../../shared/components/ui/notifications/toast/toast';
import { AuthService } from '../../../../../core/auth/services/auth';
import { GoogleMapsService } from '../../../services/google-maps.service';
import { GOOGLE_MAPS_CONFIG } from '../../../config/google-maps.config';

// Declare google namespace for TypeScript
declare global {
  interface Window {
    initMapCallback: () => void;
  }
}

export interface Zone {
  zoneId: string;
  organizationId: string;
  zoneCode: string;
  zoneName: string;
  description: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Street {
  streetId: string;
  zoneId: string;
  streetCode: string;
  streetName: string;
  streetType: string;
  status: 'ACTIVE' | 'INACTIVE';
}
@Component({
  selector: 'app-create-points',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Toast], // Agregamos Toast a las importaciones
  templateUrl: './create-points.component.html',
  styleUrls: ['./create-points.component.css']
})
export class CreatePointsComponent implements OnInit, AfterViewInit {
  @Input() isOpen: boolean = false;
  @Input() editingPoint: TestingPoints | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() pointCreated = new EventEmitter<TestingPoints>();
  @Output() pointUpdated = new EventEmitter<TestingPoints>();

  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef;

  isLoading: boolean = false;
  isSaving: boolean = false;
  isMapLoaded: boolean = false;

  createForm: FormGroup;
  validationErrors: { [key: string]: string } = {};

  availableZones: Zone[] = [];
  availableStreets: Street[] = [];
  filteredStreets: Street[] = [];

  // Google Maps variables
  private map: google.maps.Map | null = null;
  private marker: google.maps.Marker | null = null;
  private defaultLocation = GOOGLE_MAPS_CONFIG.DEFAULT_LOCATION; // Default location from config

  pointTypes = [
    {
      value: 'DOMICILIO',
      label: 'DOMICILIO',
      description: 'Punto en vivienda particular'
    },
    {
      value: 'RESERVOIR',
      label: 'RESERVORIO',
      description: 'Tanque de almacenamiento'
    },
    {
      value: 'RED_DISTRIBUCION',
      label: 'RED DISTRIBUCIÓN',
      description: 'Punto en la red de distribución'
    }
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly waterQualityApi: WaterQualityApi,
    private readonly notificationService: NotificationService,
    private readonly authService: AuthService,
    private readonly googleMapsService: GoogleMapsService
  ) {
    this.createForm = this.fb.group({
      pointName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      pointType: ['', Validators.required],
      zoneId: ['', Validators.required],
      street: [''], // Solo visible cuando tipo es DOMICILIO
      locationDescription: ['', Validators.maxLength(500)],
      latitude: [0, Validators.required],
      longitude: [0, Validators.required]
    });

    // Escuchar cambios en el tipo de punto
    this.createForm.get('pointType')?.valueChanges.subscribe(type => {
      this.onPointTypeChange(type);
    });

    // Escuchar cambios en la zona
    this.createForm.get('zoneId')?.valueChanges.subscribe(zoneId => {
      this.onZoneChange(zoneId);
    });

    // Validación en tiempo real
    this.createForm.valueChanges.subscribe(() => this.validateFormRealTime());

    // Validación individual por campo
    Object.keys(this.createForm.controls).forEach(key => {
      this.createForm.get(key)?.valueChanges.subscribe(() => {
        this.validateField(key);
      });
    });
  }

  ngOnInit(): void {
    this.loadZones();
    // Las calles se cargarán después de que las zonas estén disponibles
  }

  ngAfterViewInit(): void {
    // Initialize map after view is ready
    if (this.isOpen) {
      setTimeout(() => {
        this.initMap();
        // If editing, populate form with existing data
        if (this.editingPoint) {
          this.populateFormForEditing(this.editingPoint);
        }
      }, 100);
    }
  }

  private loadZones(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      console.warn('No organization ID found for current user');
      return;
    }

    this.isLoading = true;
    this.waterQualityApi.getZonesByOrganization(currentUser.organizationId).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response && response.data && Array.isArray(response.data)) {
          console.log('Raw zones data received:', response.data.length, 'zones');
          console.log('Organization ID for filtering:', currentUser.organizationId);
          
          // Mostrar algunas zonas sin filtrar para debugging
          if (response.data.length > 0) {
            console.log('First 3 raw zones:', response.data.slice(0, 3).map(z => ({name: z.zoneName, id: z.zoneId, orgId: z.organizationId})));
          }
          
          // Filtrar y mapear zonas activas
          this.availableZones = response.data
            .filter((zone: any) => {
              const belongsToOrg = zone.organizationId === currentUser.organizationId;
              const isActive = zone.status === 'ACTIVE';
              if (!belongsToOrg) {
                console.log('Zone filtered out - Org mismatch:', {zoneId: zone.zoneId, zoneOrg: zone.organizationId, userOrg: currentUser.organizationId});
              }
              if (!isActive) {
                console.log('Zone filtered out - Not active:', {zoneId: zone.zoneId, status: zone.status});
              }
              return belongsToOrg && isActive;
            })
            .map((zone: any) => ({
              zoneId: zone.zoneId,
              organizationId: zone.organizationId,
              zoneCode: zone.zoneCode,
              zoneName: zone.zoneName,
              description: zone.description,
              status: zone.status
            }));
          console.log('Loaded zones count:', this.availableZones.length);
          console.log('Organization ID for loaded zones:', currentUser.organizationId);
          // Mostrar solo los nombres de las zonas para debugging
          if (this.availableZones.length > 0) {
            console.log('First 3 filtered zones:', this.availableZones.slice(0, 3).map(z => ({name: z.zoneName, id: z.zoneId, orgId: z.organizationId})));
          }
          
          // Cargar calles después de que las zonas estén disponibles
          this.loadStreets();
        } else {
          console.warn('No zones data received or invalid format');
          this.availableZones = [];
          this.loadStreets(); // Cargar calles incluso si no hay zonas
        }
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Error loading zones:', error);
        this.availableZones = [];
        this.loadStreets(); // Cargar calles incluso si hay error en zonas
        this.notificationService.warning(
          'Zonas no disponibles',
          'Error al cargar las zonas. Intente nuevamente.'
        );
      }
    });
  }

  private loadStreets(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      console.warn('No organization ID found for current user');
      return;
    }

    // Cargar todas las calles de todas las zonas de la organización
    this.waterQualityApi.getStreetsByZone('').subscribe({
      next: (response) => {
        if (response && response.data && Array.isArray(response.data)) {
          // Filtrar solo calles activas
          this.availableStreets = response.data
            .filter((street: any) => street.status === 'ACTIVE')
            .map((street: any) => ({
              streetId: street.streetId,
              zoneId: street.zoneId,
              streetCode: street.streetCode,
              streetName: street.streetName,
              streetType: street.streetType,
              status: street.status
            }));
          
          // Filtrar calles solo para zonas de la organización actual
          if (this.availableZones && this.availableZones.length > 0) {
            const orgZoneIds = this.availableZones.map(zone => zone.zoneId);
            this.availableStreets = this.availableStreets.filter(street => 
              orgZoneIds.includes(street.zoneId)
            );
          }
          
          console.log('Loaded streets count:', this.availableStreets.length);
          // Mostrar solo los nombres de las calles para debugging
          if (this.availableStreets.length > 0) {
            console.log('First 3 streets:', this.availableStreets.slice(0, 3).map(s => ({name: s.streetName, zoneId: s.zoneId})));
          }
        } else {
          console.warn('No streets data received or invalid format');
          this.availableStreets = [];
        }
      },
      error: (error) => {
        console.error('Error loading streets:', error);
        this.availableStreets = [];
      }
    });
  }

  private onPointTypeChange(pointType: string): void {
    console.log('Point type changed to:', pointType); // Log para ver cuándo cambia el tipo de punto
    const streetControl = this.createForm.get('street');

    if (pointType === 'DOMICILIO') {
      streetControl?.setValidators([Validators.required]);
    } else {
      streetControl?.clearValidators();
      streetControl?.setValue('');
    }
    streetControl?.updateValueAndValidity();
  }

  private onZoneChange(zoneId: string): void {
    if (zoneId) {
      this.filteredStreets = this.availableStreets.filter(street => street.zoneId === zoneId);
      console.log('Filtered streets count for zone', zoneId, ':', this.filteredStreets.length);
    } else {
      this.filteredStreets = [];
    }

    // Limpiar selección de calle si ya no está disponible
    const currentStreet = this.createForm.get('street')?.value;
    if (currentStreet && !this.filteredStreets.find(s => s.streetId === currentStreet)) {
      this.createForm.patchValue({ street: '' });
    }
  }

  get isDomicilioType(): boolean {
    const pointType = this.createForm.get('pointType')?.value;
    console.log('Checking isDomicilioType, pointType:', pointType);
    return pointType === 'DOMICILIO';
  }

  validateFormRealTime(): void {
    Object.keys(this.createForm.controls).forEach(key => {
      this.validateField(key);
    });
  }

  validateField(fieldName: string): void {
    const control = this.createForm.get(fieldName);
    if (!control) return;

    const value = control.value;

    // Limpiar error previo
    delete this.validationErrors[fieldName];

    switch (fieldName) {
      case 'pointName':
        if (!value || value.trim().length === 0) {
          this.validationErrors[fieldName] = 'El nombre es obligatorio';
        } else if (value.trim().length < 3) {
          this.validationErrors[fieldName] = 'El nombre debe tener al menos 3 caracteres';
        } else if (value.trim().length > 100) {
          this.validationErrors[fieldName] = 'El nombre no puede exceder 100 caracteres';
        }
        break;

      case 'pointType':
        if (!value) {
          this.validationErrors[fieldName] = 'Debe seleccionar un tipo de punto';
        }
        break;

      case 'zoneId':
        if (!value) {
          this.validationErrors[fieldName] = 'Debe seleccionar una zona';
        }
        break;

      case 'street':
        if (this.isDomicilioType && !value) {
          this.validationErrors[fieldName] = 'Debe seleccionar una calle para puntos de domicilio';
        }
        break;

      case 'locationDescription':
        if (value && value.length > 500) {
          this.validationErrors[fieldName] = 'La descripción no puede exceder 500 caracteres';
        }
        break;
        
      case 'latitude':
        const latValue = Number(value);
        if (value !== null && value !== undefined && value !== '' && (latValue < -90 || latValue > 90)) {
          this.validationErrors[fieldName] = 'La latitud debe estar entre -90 y 90';
        }
        break;

      case 'longitude':
        const lngValue = Number(value);
        if (value !== null && value !== undefined && value !== '' && (lngValue < -180 || lngValue > 180)) {
          this.validationErrors[fieldName] = 'La longitud debe estar entre -180 y 180';
        }
        break;
    }
  }

  getFieldClass(fieldName: string): string {
    const hasError = this.validationErrors[fieldName];
    const control = this.createForm.get(fieldName);
    const hasValue = control?.value && control.value.toString().trim().length > 0;

    if (hasError) {
      return 'border-red-500 focus:ring-red-500 focus:border-red-500 bg-red-50';
    } else if (hasValue && !hasError) {
      return 'border-green-500 focus:ring-green-500 focus:border-green-500 bg-green-50';
    } else {
      return 'border-gray-300 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-400';
    }
  }

  hasValidationErrors(): boolean {
    return Object.keys(this.validationErrors).length > 0;
  }

  getValidationErrorsList(): string[] {
    return Object.values(this.validationErrors);
  }

  isFormValid(): boolean {
    return this.createForm.valid && Object.keys(this.validationErrors).length === 0;
  }

  getFormProgress(): number {
    let totalFields = 3; // pointName, pointType, zoneId (campos básicos requeridos)
    let completedFields = 0;

    // Agregar campo de calle si es tipo domicilio
    if (this.isDomicilioType) {
      totalFields++;
    }

    if (this.createForm.get('pointName')?.value && !this.validationErrors['pointName']) completedFields++;
    if (this.createForm.get('pointType')?.value && !this.validationErrors['pointType']) completedFields++;
    if (this.createForm.get('zoneId')?.value && !this.validationErrors['zoneId']) completedFields++;

    if (this.isDomicilioType) {
      if (this.createForm.get('street')?.value && !this.validationErrors['street']) completedFields++;
    }

    return Math.round((completedFields / totalFields) * 100);
  }

  getFormProgressMessage(): string {
    const progress = this.getFormProgress();
    if (progress === 100) {
      return '¡Formulario completo! Listo para crear el punto.';
    } else if (progress >= 75) {
      return 'Casi terminado, complete los campos restantes.';
    } else if (progress >= 50) {
      return 'Buen progreso, continúe completando los campos.';
    } else if (progress >= 25) {
      return 'Complete los campos requeridos para continuar.';
    } else {
      return 'Comience completando los campos básicos.';
    }
  }

  onCreatePoint(): void {
    this.validateFormRealTime();
    if (Object.keys(this.validationErrors).length > 0) {
      this.notificationService.error(
        'Formulario inválido',
        'Por favor corrige los campos marcados en rojo'
      );
      return;
    }

    if (this.editingPoint) {
      this.updatePoint();
    } else {
      this.createPoint();
    }
  }

  private createPoint(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organizationId) {
      this.notificationService.error(
        'Error de configuración',
        'No se pudo obtener la información de la organización'
      );
      return;
    }

    this.isSaving = true;

    const selectedStreetId = this.createForm.get('street')?.value;
    const selectedStreet = this.filteredStreets.find(s => s.streetId === selectedStreetId);

    const testingPoint: TestingPoints = {
      id: '',
      organizationId: currentUser.organizationId,
      pointCode: '',
      pointName: this.createForm.get('pointName')?.value,
      pointType: this.createForm.get('pointType')?.value,
      zoneId: this.createForm.get('zoneId')?.value,
      locationDescription: this.createForm.get('locationDescription')?.value || '',
      street: selectedStreet?.streetId || '',
      coordinates: {
        latitude: Number(this.createForm.get('latitude')?.value) || 0,
        longitude: Number(this.createForm.get('longitude')?.value) || 0
      },
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.waterQualityApi.createTestingPoint(testingPoint).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        if ((response.success || response.status) && response.data) {
          this.pointCreated.emit(response.data);
          this.notificationService.success(
            '¡Éxito!',
            `Punto "${testingPoint.pointName}" creado correctamente`
          );
          this.onClose();
        } else {
          this.notificationService.error(
            'Error',
            'No se pudo crear el punto. Intenta nuevamente.'
          );
        }
      },
      error: (error: any) => {
        this.isSaving = false;
        const errorMessage = error?.error?.message || error?.message || 'Error al crear el punto';
        this.notificationService.error('Error al crear punto', errorMessage);
      }
    });
  }

  private updatePoint(): void {
    if (!this.editingPoint) return;

    this.isSaving = true;

    const selectedStreetId = this.createForm.get('street')?.value;
    const selectedStreet = this.filteredStreets.find(s => s.streetId === selectedStreetId);

    // Create a clean object with only the fields needed for update
    const updatedPoint: TestingPoints = {
      id: this.editingPoint.id,
      pointCode: this.editingPoint.pointCode,
      pointName: this.createForm.get('pointName')?.value,
      pointType: this.createForm.get('pointType')?.value,
      zoneId: this.createForm.get('zoneId')?.value,
      locationDescription: this.createForm.get('locationDescription')?.value || '',
      street: selectedStreet?.streetId || '',
      coordinates: {
        latitude: parseFloat(Number(this.createForm.get('latitude')?.value || 0).toFixed(6)),
        longitude: parseFloat(Number(this.createForm.get('longitude')?.value || 0).toFixed(6))
      },
      // Extract just the organization ID string, not the entire object
      organizationId: typeof this.editingPoint?.organizationId === 'object' 
        ? (this.editingPoint.organizationId as any).organizationId 
        : this.editingPoint?.organizationId || '',
      status: this.editingPoint.status,
      createdAt: this.editingPoint.createdAt,
      updatedAt: new Date().toISOString()
    };
    
    // Ensure all required fields are present
    if (!updatedPoint.pointCode) {
      console.warn('pointCode is missing from updated point');
    }
    if (!updatedPoint.organizationId) {
      console.warn('organizationId is missing from updated point');
    }
    if (!updatedPoint.id) {
      console.warn('id is missing from updated point');
    }
    
    // Log the final data structure
    console.log('Final updated point data:', JSON.stringify(updatedPoint, null, 2));
    
    // Log the data being sent for debugging
    console.log('Updating point with data:', updatedPoint);

    this.waterQualityApi.updateTestingPoint(this.editingPoint.id, updatedPoint).subscribe({
      next: (response: any) => {
        this.isSaving = false;
        if ((response.success || response.status) && response.data) {
          this.pointUpdated.emit(response.data);
          this.notificationService.success(
            '¡Éxito!',
            `Punto "${updatedPoint.pointName}" actualizado correctamente`
          );
          this.onClose();
        } else {
          this.notificationService.error(
            'Error',
            'No se pudo actualizar el punto. Intenta nuevamente.'
          );
        }
      },
      error: (error: any) => {
        this.isSaving = false;
        console.error('Error updating point:', error);
        console.error('Request data sent:', updatedPoint);
        const errorMessage = error?.error?.message || error?.message || 'Error al actualizar el punto';
        this.notificationService.error('Error al actualizar punto', errorMessage);
      }
    });
  }

  // Google Maps integration
  private initMap(): void {
    console.log('Initializing map...');
    
    // Check if Google Maps API is already loaded
    if (this.googleMapsService.isMapsApiLoaded()) {
      console.log('Google Maps API already loaded, creating map');
      this.createMap();
      return;
    }

    console.log('Google Maps API not loaded, loading now...');
    
    // Load Google Maps API
    this.googleMapsService.loadGoogleMaps().subscribe({
      next: (loaded) => {
        if (loaded) {
          console.log('Google Maps API loaded successfully, creating map');
          this.createMap();
        } else {
          console.error('Failed to load Google Maps API');
          // Try to create map anyway in case of race conditions
          if (this.googleMapsService.isMapsApiLoaded()) {
            console.log('Google Maps API loaded after timeout, creating map');
            this.createMap();
          } else {
            this.notificationService.error(
              'Error de mapa',
              'No se pudo cargar Google Maps. Verifique su conexión a internet.'
            );
          }
        }
      },
      error: (error) => {
        console.error('Error loading Google Maps:', error);
        // Try to create map anyway in case of race conditions
        if (this.googleMapsService.isMapsApiLoaded()) {
          console.log('Google Maps API loaded despite error, creating map');
          this.createMap();
        } else {
          this.notificationService.error(
            'Error de mapa',
            'No se pudo cargar Google Maps. Verifique su conexión a internet.'
          );
        }
      }
    });
  }

  private createMap(): void {
    if (!this.mapContainer || !this.mapContainer.nativeElement) {
      console.warn('Map container not found');
      return;
    }

    try {
      // Get initial coordinates from form or use default
      const lat = parseFloat(Number(this.createForm.get('latitude')?.value || this.defaultLocation.lat).toFixed(6));
      const lng = parseFloat(Number(this.createForm.get('longitude')?.value || this.defaultLocation.lng).toFixed(6));
      const location = { lat, lng };

      console.log('Creating map with location:', location);

      // Create map
      this.map = this.googleMapsService.createMap(this.mapContainer.nativeElement, {
        center: location,
        zoom: GOOGLE_MAPS_CONFIG.DEFAULT_ZOOM,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        zoomControl: true
      });

      // Create marker
      this.marker = this.googleMapsService.createMarker({
        position: location,
        map: this.map,
        draggable: true,
        title: 'Arrastra para seleccionar ubicación'
      });

      // Update form when marker is dragged
      this.marker.addListener('dragend', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const position = event.latLng.toJSON();
          console.log('Marker dragged to:', position);
          this.updateCoordinates(parseFloat(position.lat.toFixed(6)), parseFloat(position.lng.toFixed(6)));
        }
      });

      // Update form when map is clicked
      this.map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const position = event.latLng.toJSON();
          console.log('Map clicked at:', position);
          this.marker?.setPosition(position);
          this.updateCoordinates(parseFloat(position.lat.toFixed(6)), parseFloat(position.lng.toFixed(6)));
        }
      });

      this.isMapLoaded = true;
      console.log('Google Maps initialized successfully');
    } catch (error) {
      console.error('Error creating map:', error);
      this.notificationService.error(
        'Error de mapa',
        'No se pudo inicializar el mapa. Intente nuevamente.'
      );
    }
  }

  private updateCoordinates(lat: number, lng: number): void {
    this.createForm.patchValue({
      latitude: parseFloat(lat.toFixed(6)),
      longitude: parseFloat(lng.toFixed(6))
    });
    
    // Validate coordinates
    this.validateField('latitude');
    this.validateField('longitude');
  }

  onCoordinatesChange(): void {
    const lat = this.createForm.get('latitude')?.value;
    const lng = this.createForm.get('longitude')?.value;
    
    if (lat !== null && lng !== null && this.map && this.marker) {
      const location = new google.maps.LatLng(parseFloat(Number(lat).toFixed(6)), parseFloat(Number(lng).toFixed(6)));
      this.map.setCenter(location);
      this.marker.setPosition(location);
    }
  }

  onClose(): void {
    this.resetForm();
    this.close.emit();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      // Initialize map when modal opens
      setTimeout(() => {
        this.initMap();
        // If editing, populate form with existing data
        if (this.editingPoint) {
          this.populateFormForEditing(this.editingPoint);
        }
      }, 100);
    }
    
    // Handle changes to editingPoint
    if (changes['editingPoint'] && changes['editingPoint'].currentValue) {
      console.log('Editing point changed:', changes['editingPoint'].currentValue);
      setTimeout(() => {
        this.populateFormForEditing(changes['editingPoint'].currentValue);
      }, 100);
    }
  }

  private populateFormForEditing(point: TestingPoints): void {
    if (point) {
      console.log('Populating form with editing point data:', point);
      console.log('Point type from data:', point.pointType);
      
      // Populate form with point data
      this.createForm.patchValue({
        pointName: point.pointName || '',
        pointType: point.pointType || '',
        zoneId: point.zoneId || '',
        street: point.street || '',
        locationDescription: point.locationDescription || '',
        latitude: point.coordinates?.latitude !== undefined ? Number(point.coordinates.latitude) : 0,
        longitude: point.coordinates?.longitude !== undefined ? Number(point.coordinates.longitude) : 0
      });
      
      // Log the form values after patching
      console.log('Form values after patching:', this.createForm.value);
      
      // Add a small delay to ensure the form is properly updated
      setTimeout(() => {
        console.log('Form values after delay:', this.createForm.value);
        // Make sure pointType is set correctly
        if (point.pointType) {
          this.createForm.get('pointType')?.setValue(point.pointType, { emitEvent: true });
          console.log('Explicitly set pointType to:', point.pointType);
        }
        // Trigger zone change to update filtered streets
        if (point.zoneId) {
          this.onZoneChange(point.zoneId);
        }
      }, 150);
      
      // Update map with point coordinates
      if (this.map && this.marker && point.coordinates) {
        const location = { 
          lat: point.coordinates.latitude !== undefined ? Number(point.coordinates.latitude) : this.defaultLocation.lat, 
          lng: point.coordinates.longitude !== undefined ? Number(point.coordinates.longitude) : this.defaultLocation.lng 
        };
        this.map.setCenter(location);
        this.marker.setPosition(location);
      }
      
      console.log('Form populated for editing');
    }
  }

  private resetForm(): void {
    this.createForm.reset({
      latitude: 0,
      longitude: 0
    });
    this.validationErrors = {};
    this.filteredStreets = [];
    
    // Reset map to default location
    if (this.map && this.marker) {
      this.map.setCenter(this.defaultLocation);
      this.marker.setPosition(this.defaultLocation);
      this.updateCoordinates(this.defaultLocation.lat, this.defaultLocation.lng);
    }
  }
}