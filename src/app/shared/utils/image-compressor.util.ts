/**
 * Utilidad para comprimir imágenes antes de convertirlas a base64
 */
export class ImageCompressor {
  /**
   * Comprime una imagen y la convierte a base64
   * @param file Archivo de imagen
   * @param maxWidth Ancho máximo (default: 800px)
   * @param maxHeight Alto máximo (default: 800px)
   * @param quality Calidad de compresión 0-1 (default: 0.7)
   * @returns Promise con el string base64 comprimido
   */
  static compressImage(
    file: File,
    maxWidth: number = 800,
    maxHeight: number = 800,
    quality: number = 0.7
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        const img = new Image();

        img.onload = () => {
          // Crear canvas para redimensionar
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo el aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Dibujar imagen redimensionada
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo obtener el contexto del canvas'));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Convertir a base64 con compresión
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };

        img.onerror = () => {
          reject(new Error('Error al cargar la imagen'));
        };

        img.src = e.target.result;
      };

      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };

      reader.readAsDataURL(file);
    });
  }

  /**
   * Valida que el archivo sea una imagen
   * @param file Archivo a validar
   * @returns true si es una imagen válida
   */
  static isValidImageFile(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    return validTypes.includes(file.type);
  }

  /**
   * Valida el tamaño del archivo
   * @param file Archivo a validar
   * @param maxSizeMB Tamaño máximo en MB (default: 5MB)
   * @returns true si el tamaño es válido
   */
  static isValidFileSize(file: File, maxSizeMB: number = 5): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }
}
