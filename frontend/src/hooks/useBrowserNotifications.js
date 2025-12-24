import { useState, useEffect, useCallback } from 'react';
import browserNotificationService from '../utils/browserNotifications';

/**
 * React Hook for Browser Notifications
 */
export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState(browserNotificationService.permission);
  const [isSupported, setIsSupported] = useState(browserNotificationService.isSupportedBrowser());

  useEffect(() => {
    // Update permission state when it changes
    const checkPermission = () => {
      browserNotificationService.checkPermission();
      setPermission(browserNotificationService.permission);
    };

    checkPermission();
    
    // Check permission periodically (in case user changes it in browser settings)
    const interval = setInterval(checkPermission, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await browserNotificationService.requestPermission();
    setPermission(browserNotificationService.permission);
    return result;
  }, []);

  const showNotification = useCallback((title, options) => {
    return browserNotificationService.showNotification(title, options);
  }, []);

  const showNotificationFromData = useCallback((notificationData) => {
    return browserNotificationService.showNotificationFromData(notificationData);
  }, []);

  return {
    permission,
    isSupported,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    requestPermission,
    showNotification,
    showNotificationFromData
  };
};

export default useBrowserNotifications;

