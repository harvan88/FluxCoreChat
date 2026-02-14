
import { Cron } from 'croner';
import { workEngineService } from './work-engine.service';

/**
 * WES-165: Scheduler for periodic WES maintenance
 * Handles work expiration and semantic context lifecycle.
 */
class WESSchedulerService {
    private maintenanceJob: Cron | null = null;
    private initialized = false;

    async init() {
        if (this.initialized) return;
        this.initialized = true;

        try {
            // Run maintenance every minute
            this.maintenanceJob = new Cron('* * * * *', async () => {
                try {
                    await workEngineService.expireMaintenance();
                } catch (error) {
                    console.error('[WESScheduler] Maintenance job failed:', error);
                }
            });

            console.log('[WESScheduler] Initialized (Maintenance: 1m)');
        } catch (error) {
            console.error('[WESScheduler] Init failed:', error);
        }
    }

    stop() {
        if (this.maintenanceJob) {
            this.maintenanceJob.stop();
            this.maintenanceJob = null;
        }
        this.initialized = false;
    }
}

export const wesScheduler = new WESSchedulerService();
