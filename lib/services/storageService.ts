import { getSupabaseServerClient } from '@/lib/supabase/database';

interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

interface FileMetadata {
  organizationId: string;
  entityType: 'property_images' | 'property_documents' | 'user_avatars' | 'social_media';
  entityId: string;
  originalName: string;
  mimeType: string;
  size: number;
}

class StorageService {
  private supabase: ReturnType<typeof getSupabaseServerClient>;

  constructor() {
    this.supabase = getSupabaseServerClient();
  }

  /**
   * Upload a file to Supabase Storage
   * @param file The file to upload (as Buffer or Blob)
   * @param metadata Information about the file and its usage
   * @returns Upload result with path and public URL
   */
  async uploadFile(
    file: Buffer | Blob,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      // Validate required environment variables
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
      }

      // Generate a unique file path
      const fileExt = metadata.originalName.split('.').pop() || '';
      const fileName = `${metadata.entityId}_${Date.now()}.${fileExt}`;
      const filePath = `${metadata.entityType}/${metadata.organizationId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase
        .storage
        .from('entity-files') // We'll need to create this bucket
        .upload(filePath, file, {
          contentType: metadata.mimeType,
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = this.supabase
        .storage
        .from('entity-files')
        .getPublicUrl(filePath);

      return {
        success: true,
        path: filePath,
        publicUrl: publicUrl
      };
    } catch (error: any) {
      console.error('[STORAGE SERVICE] Error uploading file:', error);
      return {
        success: false,
        error: error.message || 'Failed to upload file'
      };
    }
  }

  /**
   * Delete a file from Supabase Storage
   * @param filePath The path of the file to delete
   * @returns Deletion result
   */
  async deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .storage
        .from('entity-files')
        .remove([filePath]);

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error: any) {
      console.error('[STORAGE SERVICE] Error deleting file:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete file'
      };
    }
  }

  /**
   * Get a signed URL for a file (useful for private files)
   * @param filePath The path of the file
   * @param expiresIn Seconds until URL expires (default: 3600)
   * @returns Signed URL
   */
  async getSignedUrl(
    filePath: string,
    expiresIn: number = 3600
  ): Promise<{ success: boolean; signedUrl?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .storage
        .from('entity-files')
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw error;
      }

      return {
        success: true,
        signedUrl: data.signedUrl
      };
    } catch (error: any) {
      console.error('[STORAGE SERVICE] Error getting signed URL:', error);
      return {
        success: false,
        error: error.message || 'Failed to get signed URL'
      };
    }
  }
}

// Export a singleton instance
export const storageService = new StorageService();

export default storageService;