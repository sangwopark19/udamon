import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1920;
const COMPRESS_QUALITY = 0.8;

/**
 * Resize image to max dimension and compress as JPEG before upload.
 * Returns the optimized image URI.
 */
export async function optimizeImage(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: COMPRESS_QUALITY, format: SaveFormat.JPEG },
  );
  return result.uri;
}
