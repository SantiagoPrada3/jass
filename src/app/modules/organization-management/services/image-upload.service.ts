import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {

  // Configuración de archivos (optimizada para logos de buena calidad)
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  private readonly LOGO_MAX_WIDTH = 300; // Reducido para menor tamaño
  private readonly LOGO_MAX_HEIGHT = 300;
  private readonly HIGH_QUALITY = 0.7; // Reducido para menor tamaño
  private readonly MEDIUM_QUALITY = 0.6; // Calidad media como fallback

  constructor() { }

  // Validar archivo de imagen
  validateImageFile(file: File): { isValid: boolean, error?: string } {
    // Validar tipo de archivo
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `Formato no soportado. Use: JPG, PNG, GIF o WebP`
      };
    }

    // Validar tamaño
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `El archivo es muy grande. Máximo ${this.MAX_FILE_SIZE / (1024 * 1024)}MB permitido.`
      };
    }

    return { isValid: true };
  }

  // Convertir archivo a base64
  fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result); // Incluye el prefijo data:image/...;base64,
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Redimensionar imagen para logos manteniendo buena calidad
  async resizeImageForLogo(file: File, maxWidth: number = this.LOGO_MAX_WIDTH, maxHeight: number = this.LOGO_MAX_HEIGHT): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Si no se puede redimensionar, usar la imagen original
          this.fileToBase64(file).then(resolve);
          return;
        }

        // Calcular nuevas dimensiones manteniendo la proporción
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Configurar contexto para mejor calidad
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dibujar la imagen redimensionada con alta calidad
        ctx.drawImage(img, 0, 0, width, height);

        // Determinar el formato y calidad óptimos
        let resizedBase64: string;
        
        // Para PNG, mantener transparencia si existe
        if (file.type === 'image/png') {
          resizedBase64 = canvas.toDataURL('image/png');
        } else {
          // Para otros formatos, usar JPEG con alta calidad
          resizedBase64 = canvas.toDataURL('image/jpeg', this.HIGH_QUALITY);
        }

        resolve(resizedBase64);
      };

      img.onerror = () => {
        // Si hay error, usar la imagen original
        this.fileToBase64(file).then(resolve);
      };

      // Crear URL temporal para cargar la imagen
      img.src = URL.createObjectURL(file);
    });
  }

  // Comprimir imagen manteniendo calidad óptima
  async compressImageOptimally(file: File): Promise<string> {
    console.log('🎨 Optimizando imagen para logo...');
    
    // Primero intentar con alta calidad
    let compressed = await this.resizeImageForLogo(file);
    let validation = this.validateBase64Size(compressed);

    console.log(`📊 Primera compresión: ${validation.sizeKB}KB`);

    // Si es muy grande, intentar con calidad media
    if (!validation.isValid && validation.sizeKB > 200) {
      console.log('🔄 Aplicando compresión media...');
      compressed = await this.resizeImageToSize(file, 250, 250, 0.6);
      validation = this.validateBase64Size(compressed);
      console.log(`📊 Segunda compresión: ${validation.sizeKB}KB`);
    }

    // Si aún es muy grande, reducir más el tamaño
    if (!validation.isValid && validation.sizeKB > 200) {
      console.log('🔄 Aplicando compresión con tamaño reducido...');
      compressed = await this.resizeImageToSize(file, 200, 200, 0.5);
      validation = this.validateBase64Size(compressed);
      console.log(`📊 Tercera compresión: ${validation.sizeKB}KB`);
    }

    // Como último recurso, reducir al mínimo
    if (!validation.isValid) {
      console.log('🔄 Aplicando compresión final...');
      compressed = await this.resizeImageToSize(file, 150, 150, 0.4);
      validation = this.validateBase64Size(compressed);
      console.log(`📊 Compresión final: ${validation.sizeKB}KB`);
    }

    console.log(`✅ Imagen optimizada: ${validation.sizeKB}KB`);
    return compressed;
  }

  // Redimensionar a tamaño específico con calidad específica y mejor algoritmo
  async resizeImageToSize(file: File, maxWidth: number, maxHeight: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          this.fileToBase64(file).then(resolve);
          return;
        }

        // Calcular dimensiones manteniendo proporción
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Configurar contexto para mejor calidad de renderizado
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Dibujar la imagen redimensionada con suavizado
        ctx.drawImage(img, 0, 0, width, height);

        // Determinar formato basado en el archivo original
        let resizedBase64: string;
        
        if (file.type === 'image/png') {
          // Para PNG, mantener formato si la calidad es alta, sino convertir a JPEG
          if (quality >= 0.8) {
            resizedBase64 = canvas.toDataURL('image/png');
          } else {
            resizedBase64 = canvas.toDataURL('image/jpeg', quality);
          }
        } else {
          // Para otros formatos, usar JPEG con la calidad especificada
          resizedBase64 = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(resizedBase64);
      };

      img.onerror = () => {
        this.fileToBase64(file).then(resolve);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  // Procesar imagen desde archivo local
  async processImageFile(file: File): Promise<{ success: boolean, imageData?: string, sizeKB?: number, error?: string }> {
    try {
      // Validar archivo
      const validation = this.validateImageFile(file);
      if (!validation.isValid) {
        return { success: false, error: validation.error };
      }

      console.log('📁 Procesando imagen:', file.name, `(${(file.size / 1024 / 1024).toFixed(2)}MB)`);

      // Comprimir optimalmente manteniendo calidad
      const imageData = await this.compressImageOptimally(file);

      // Validar tamaño final
      const sizeValidation = this.validateBase64Size(imageData);

      console.log('✅ Imagen procesada exitosamente:', `${sizeValidation.sizeKB}KB`);
      return { success: true, imageData, sizeKB: sizeValidation.sizeKB };

    } catch (error) {
      console.error('❌ Error procesando imagen:', error);
      return { success: false, error: 'Error al procesar la imagen' };
    }
  }

  // Crear vista previa desde base64
  createPreviewFromBase64(base64Data: string): Promise<{ valid: boolean, width?: number, height?: number }> {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        resolve({
          valid: true,
          width: img.width,
          height: img.height
        });
      };

      img.onerror = () => {
        resolve({
          valid: false
        });
      };

      img.src = base64Data;
    });
  }

  // Obtener información del archivo
  getFileInfo(file: File): { name: string, size: string, type: string } {
    return {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type
    };
  }

  // Validar tamaño del base64 (más estricto para evitar errores en el backend)
  validateBase64Size(base64: string): { isValid: boolean, sizeKB: number, error?: string } {
    const sizeBytes = base64.length * 0.75; // Aproximación del tamaño real
    const sizeKB = Math.round(sizeBytes / 1024);
    const maxSizeKB = 200; // Reducido a 200KB para evitar errores en el backend

    if (sizeKB > maxSizeKB) {
      return {
        isValid: false,
        sizeKB,
        error: `La imagen es muy grande (${sizeKB}KB). Máximo permitido: ${maxSizeKB}KB`
      };
    }

    return { isValid: true, sizeKB };
  }

  // Obtener información básica para logos
  getLogoRequirements() {
    return {
      formats: ['JPG', 'PNG', 'GIF', 'WebP'],
      maxSize: '5MB',
      recommended: '200x200 a 300x300 píxeles',
      maxFinalSize: '200KB (optimizado automáticamente)',
      tips: [
        'Use PNG para logos con transparencia',
        'Use JPG para fotografías o imágenes complejas',
        'Resolución mínima recomendada: 200x200px',
        'El sistema optimizará automáticamente manteniendo la mejor calidad posible'
      ]
    };
  }

  // Método adicional para crear vista previa de alta calidad
  async createHighQualityPreview(file: File): Promise<string> {
    return this.resizeImageForLogo(file, 200, 200);
  }

  // Método para obtener información detallada de la imagen
  async getImageDetails(file: File): Promise<{ width: number, height: number, aspectRatio: number, format: string }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height,
          format: file.type
        });
      };
      
      img.onerror = () => {
        reject(new Error('No se pudo cargar la imagen'));
      };
      
      img.src = URL.createObjectURL(file);
    });
  }
}