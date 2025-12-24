/**
 * Browser Notification Utility
 * Handles Chrome and other browser push notifications
 */

class BrowserNotificationService {
  constructor() {
    this.permission = null;
    this.isSupported = 'Notification' in window;
    this.checkPermission();
  }

  checkPermission() {
    if (!this.isSupported) {
      this.permission = 'unsupported';
      return;
    }
    this.permission = Notification.permission;
  }

  async requestPermission() {
    if (!this.isSupported) {
      return { granted: false, error: 'Notifications not supported in this browser' };
    }

    if (this.permission === 'granted') {
      return { granted: true };
    }

    if (this.permission === 'denied') {
      return { granted: false, error: 'Notification permission was denied. Please enable it in your browser settings.' };
    }

    try {
      const permission = await Notification.requestPermission();
      this.permission = permission;
      
      if (permission === 'granted') {
        return { granted: true };
      } else {
        return { granted: false, error: 'Notification permission was denied' };
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { granted: false, error: error.message };
    }
  }

  showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.warn('Notifications not available or permission not granted');
      return null;
    }

    // Use a default icon - try to use an emoji or fallback to a data URL
    const defaultIcon = options.icon || this.getDefaultIcon();
    
    const defaultOptions = {
      icon: defaultIcon,
      badge: defaultIcon,
      tag: options.tag || `notification-${Date.now()}`,
      requireInteraction: false,
      silent: false,
      ...options
    };

    try {
      const notification = new Notification(title, defaultOptions);

      // Handle click
      if (options.onClick || options.url) {
        notification.onclick = (event) => {
          event.preventDefault();
          if (options.url) {
            window.focus();
            window.location.href = options.url;
          }
          if (options.onClick) {
            options.onClick(event);
          }
          notification.close();
        };
      }

      // Auto close after timeout if specified
      if (options.timeout) {
        setTimeout(() => {
          notification.close();
        }, options.timeout);
      }

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  getDefaultIcon() {
    // Try to use favicon, fallback to a simple emoji-based data URL
    try {
      return '/favicon.ico';
    } catch {
      // Create a simple icon using canvas (fallback)
      return undefined; // Browser will use default
    }
  }

  showNotificationFromData(notificationData) {
    const { title, message, type, link } = notificationData;

    // Get emoji icon based on type (for display in notification body)
    const getEmojiIcon = (type) => {
      switch (type) {
        case 'order':
          return '📦';
        case 'inventory':
          return '📊';
        case 'customer':
          return '👤';
        case 'system':
          return '⚙️';
        default:
          return '🔔';
      }
    };

    const frontendUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin;
    const notificationUrl = link ? `${frontendUrl}${link}` : `${frontendUrl}/dashboard`;

    // Add emoji to body for better visual
    const bodyWithIcon = `${getEmojiIcon(type)} ${message}`;

    return this.showNotification(title, {
      body: bodyWithIcon,
      icon: this.getDefaultIcon(),
      tag: `notification-${notificationData.id}`,
      url: notificationUrl,
      data: notificationData
    });
  }

  closeNotification(tag) {
    // Notifications are automatically closed when clicked
    // This is mainly for programmatic closing
    console.log('Close notification:', tag);
  }

  isPermissionGranted() {
    return this.permission === 'granted';
  }

  isPermissionDenied() {
    return this.permission === 'denied';
  }

  isSupportedBrowser() {
    return this.isSupported;
  }
}

// Create singleton instance
const browserNotificationService = new BrowserNotificationService();

export default browserNotificationService;

