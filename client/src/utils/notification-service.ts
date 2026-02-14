export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  data?: Record<string, any>;
}

export class NotificationService {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async sendNotification(payload: NotificationPayload): Promise<void> {
    if (Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SEND_NOTIFICATION',
          payload,
        });
      } else {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/icon-192.png',
          tag: payload.tag,
        });
      }
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
