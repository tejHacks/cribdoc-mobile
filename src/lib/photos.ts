/** Keep screening photos in app-private storage so they survive cache clears. */
import { Platform } from 'react-native';

export async function keepPhoto(uri: string, id: string) {
  if (Platform.OS === 'web') return uri;
  const { Directory, File, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, 'screenings');
  dir.create({ idempotent: true, intermediates: true });
  const dest = new File(dir, `${id}.jpg`);
  await new File(uri).copy(dest, { overwrite: true });
  return dest.uri;
}

export async function deletePhoto(uri: string) {
  if (Platform.OS === 'web' || !uri.startsWith('file:')) return;
  try {
    const { File } = await import('expo-file-system');
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Already gone: nothing to do.
  }
}
