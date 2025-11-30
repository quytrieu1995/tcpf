const kiotvietService = require('./kiotvietService');

class KiotVietSyncScheduler {
  constructor() {
    this.syncInterval = null;
    this.isRunning = false;
    this.lastSyncTime = null;
  }

  /**
   * Start automatic sync every 1 minute
   */
  start() {
    if (this.syncInterval) {
      console.log('[KIOTVIET SYNC] Scheduler already running');
      return;
    }

    try {
      console.log('[KIOTVIET SYNC] Starting automatic sync scheduler (every 1 minute)');
      
      // Run immediately on start (with delay to avoid blocking server startup)
      setTimeout(() => {
        this.runSync().catch(err => {
          console.error('[KIOTVIET SYNC] Initial sync failed:', err.message);
        });
      }, 5000); // Wait 5 seconds after server start

      // Then run every 1 minute (60000 ms)
      this.syncInterval = setInterval(() => {
        this.runSync().catch(err => {
          console.error('[KIOTVIET SYNC] Scheduled sync failed:', err.message);
        });
      }, 60000); // 1 minute
    } catch (error) {
      console.error('[KIOTVIET SYNC] Failed to start scheduler:', error.message);
      // Don't throw, allow server to continue
    }
  }

  /**
   * Stop automatic sync
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      this.isRunning = false;
      console.log('[KIOTVIET SYNC] Automatic sync stopped');
    }
  }

  /**
   * Run sync for orders and customers
   */
  async runSync() {
    if (this.isRunning) {
      console.log('[KIOTVIET SYNC] Sync already in progress, skipping...');
      return;
    }

    try {
      this.isRunning = true;
      
      // Check if kiotvietService is available
      if (!kiotvietService) {
        console.log('[KIOTVIET SYNC] KiotViet service not available, skipping sync');
        return;
      }

      const config = await kiotvietService.getConfig();
      
      if (!config || !config.is_active) {
        console.log('[KIOTVIET SYNC] Config not found or inactive, skipping sync');
        return;
      }

      if (!config.access_token) {
        console.log('[KIOTVIET SYNC] No access token, skipping sync');
        return;
      }

      if (!config.retailer_code || !config.client_id || !config.client_secret) {
        console.log('[KIOTVIET SYNC] Incomplete configuration, skipping sync');
        return;
      }

      console.log('[KIOTVIET SYNC] Starting automatic sync...');
      this.lastSyncTime = new Date();

      // Sync orders
      try {
        console.log('[KIOTVIET SYNC] Syncing orders...');
        const ordersResult = await kiotvietService.syncOrders({
          pageSize: 50, // Smaller batch for auto sync
          pageNumber: 1
        });
        console.log(`[KIOTVIET SYNC] Orders sync completed: ${ordersResult.synced} synced, ${ordersResult.failed} failed`);
      } catch (error) {
        console.error('[KIOTVIET SYNC] Error syncing orders:', {
          message: error.message,
          stack: error.stack?.substring(0, 200)
        });
        // Don't throw, continue with customers
      }

      // Sync customers
      try {
        console.log('[KIOTVIET SYNC] Syncing customers...');
        const customersResult = await kiotvietService.syncCustomers({
          pageSize: 50, // Smaller batch for auto sync
          pageNumber: 1
        });
        console.log(`[KIOTVIET SYNC] Customers sync completed: ${customersResult.synced} synced, ${customersResult.failed} failed`);
      } catch (error) {
        console.error('[KIOTVIET SYNC] Error syncing customers:', {
          message: error.message,
          stack: error.stack?.substring(0, 200)
        });
        // Don't throw, just log
      }

      console.log('[KIOTVIET SYNC] Automatic sync completed');
    } catch (error) {
      console.error('[KIOTVIET SYNC] Sync scheduler error:', {
        message: error.message,
        stack: error.stack?.substring(0, 500)
      });
      // Don't crash the scheduler, just log the error
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get sync status
   */
  getStatus() {
    return {
      isRunning: !!this.syncInterval,
      isSyncing: this.isRunning,
      lastSyncTime: this.lastSyncTime
    };
  }
}

module.exports = new KiotVietSyncScheduler();

