export class PWAManager {
  private deferredPrompt: any = null;
  private isInstalledState = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalledState = true;
    }

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalledState = true;
      console.log('PWA installed successfully');
    });
  }

  async canInstall(): Promise<boolean> {
    return this.deferredPrompt !== null && !this.isInstalledState;
  }

  async install(): Promise<boolean> {
    if (!this.deferredPrompt) return false;

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      this.isInstalledState = true;
      this.deferredPrompt = null;
      return true;
    }
    return false;
  }

  isAppInstalled(): boolean {
    return this.isInstalledState;
  }

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;

    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none',
      });
      registration.update();
      console.log('Service Worker registered successfully');
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) throw new Error('Notifications not supported');
    if (Notification.permission === 'granted') return 'granted';
    return await Notification.requestPermission();
  }

  async storeForOfflineSync(endpoint: string, data: any): Promise<void> {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    queue.push({ endpoint, data, timestamp: Date.now() });
    localStorage.setItem('sync_queue', JSON.stringify(queue));
  }

  async processSyncQueue(): Promise<void> {
    const queue = JSON.parse(localStorage.getItem('sync_queue') || '[]');
    const processed: number[] = [];

    for (const item of queue) {
      try {
        const response = await fetch(item.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          processed.push(item.timestamp);
        }
      } catch (error) {
        console.error('Sync failed for:', item.endpoint);
      }
    }

    const updatedQueue = queue.filter((q: any) => !processed.includes(q.timestamp));
    localStorage.setItem('sync_queue', JSON.stringify(updatedQueue));
  }

  async clearOfflineData(): Promise<void> {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
    localStorage.removeItem('sync_queue');
  }
}

export const pwaManager = new PWAManager();
