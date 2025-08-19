import { supabase } from './client'

const BUCKET_NAME = 'court-images'

export interface UploadResult {
  url: string
  path: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Compress and resize image file before upload
 */
function compressImage(file: File, maxWidth: number = 1200, quality: number = 0.8): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    const img = new Image()

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      // Draw and compress
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            resolve(file) // Fallback to original if compression fails
          }
        },
        file.type,
        quality
      )
    }

    img.onerror = () => resolve(file) // Fallback to original if loading fails
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Generate a unique filename with timestamp and random string
 */
function generateFileName(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = originalName.split('.').pop()
  return `court_${timestamp}_${randomString}.${extension}`
}

/**
 * Upload an image file to Supabase storage
 */
export async function uploadCourtImage(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  try {
    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image')
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File size must be less than 10MB')
    }

    // Compress image if it's too large
    let fileToUpload = file
    if (file.size > 2 * 1024 * 1024) { // Compress files larger than 2MB
      fileToUpload = await compressImage(file)
    }

    // Generate unique filename
    const fileName = generateFileName(file.name)
    const filePath = `courts/${fileName}`

    // Upload file
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileToUpload, {
        cacheControl: '3600', // Cache for 1 hour
        upsert: false, // Don't overwrite existing files
      })

    if (error) {
      console.error('Upload error:', error)
      throw new Error(`Upload failed: ${error.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    return {
      url: publicUrl,
      path: data.path
    }

  } catch (error) {
    console.error('Image upload error:', error)
    throw error instanceof Error ? error : new Error('Upload failed')
  }
}

/**
 * Delete an image from storage
 */
export async function deleteCourtImage(path: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) {
      console.error('Delete error:', error)
      throw new Error(`Delete failed: ${error.message}`)
    }
  } catch (error) {
    console.error('Image delete error:', error)
    throw error instanceof Error ? error : new Error('Delete failed')
  }
}

/**
 * Check if storage bucket exists and is accessible
 */
export async function checkStorageHealth(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('Storage health check failed:', error)
      return false
    }

    return data.some(bucket => bucket.name === BUCKET_NAME)
  } catch (error) {
    console.error('Storage health check error:', error)
    return false
  }
}

/**
 * Get all court images (for admin purposes)
 */
export async function listCourtImages(): Promise<string[]> {
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('courts/', {
        limit: 100,
        offset: 0,
      })

    if (error) {
      throw new Error(`Failed to list images: ${error.message}`)
    }

    return data.map(file => file.name)
  } catch (error) {
    console.error('List images error:', error)
    return []
  }
}