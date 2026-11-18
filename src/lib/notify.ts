/** Local follow-up reminders. Saved reminders still work if notifications are off. */
import { Platform } from 'react-native';

export async function scheduleReminder(at: number, title: string, body: string): Promise<string | undefined> {
  if (Platform.OS === 'web' || at <= Date.now()) return undefined;
  try {
    const N = await import('expo-notifications');
    const perm = await N.requestPermissionsAsync();
    if (!perm.granted) return undefined;
    return await N.scheduleNotificationAsync({
      content: { title, body },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: new Date(at) },
    });
  } catch {
    return undefined;
  }
}

export async function cancelReminder(id?: string) {
  if (!id || Platform.OS === 'web') return;
  try {
    const N = await import('expo-notifications');
    await N.cancelScheduledNotificationAsync(id);
  } catch {
    // Already fired or cancelled.
  }
}
