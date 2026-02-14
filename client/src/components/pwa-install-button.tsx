import { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pwaManager } from '../utils/pwa-manager';

export function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    checkInstallability();

    const handleBeforeInstallPrompt = async () => {
      setCanInstall(await pwaManager.canInstall());
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const checkInstallability = async () => {
    setCanInstall(await pwaManager.canInstall());
    setIsInstalled(pwaManager.isAppInstalled());
  };

  const handleInstall = async () => {
    const success = await pwaManager.install();
    if (success) {
      setCanInstall(false);
      setIsInstalled(true);
    }
  };

  if (!canInstall || isInstalled) return null;

  return (
    <Button
      onClick={handleInstall}
      variant="default"
      size="sm"
      data-testid="button-pwa-install"
    >
      <Download className="w-4 h-4" />
      Install App
    </Button>
  );
}
