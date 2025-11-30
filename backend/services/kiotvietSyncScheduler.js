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

    console.log('[KIOTVIET SYNC] Starting automatic sync scheduler (every 1 minute)');
    
    // Run immediately on start
    this.runSync();

    // Then run every 1 minute (60000 ms)
    this.syncInterval = setInterval(() => {
      this.runSync();
    }, 60000); // 1 minute
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
      const config = await kiotvietService.getConfig();
      
      if (!config || !config.is_active) {
        console.log('[KIOTVIET SYNC] Config not found or inactive, skipping sync');
        return;
      }

      if (!config.access_token) {
        console.log('[KIOTVIET SYNC] No access token, skipping sync');
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
        console.error('[KIOTVIET SYNC] Error syncing orders:', error.message);
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
        console.error('[KIOTVIET SYNC] Error syncing customers:', error.message);
      }

      console.log('[KIOTVIET SYNC] Automatic sync completed');
    } catch (error) {
      console.error('[KIOTVIET SYNC] Sync scheduler error:', error.message);
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

