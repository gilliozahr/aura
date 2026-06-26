export type StorageProvider = 'local' | 'supabase';

export interface StorageUploadResult {
  url: string;
  path: string;
}

export async function uploadImage(
  _file: File,
  _bucket: 'wardrobe-images' | 'inspiration-images'
): Promise<StorageUploadResult> {
  // TODO v0.3: upload to Supabase Storage when configured
  // For now, return a placeholder that signals the caller to use base64
  throw new Error(
    'uploadImage: Supabase Storage not yet configured. Use base64 data URL fallback.'
  );
}

export function isStorageConfigured(): boolean {
  return Boolean(
    typeof process !== 'undefined' &&
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
