export declare class CronService {
    /**
     * Update all group statuses based on current date
     * This should be called periodically (e.g., daily)
     */
    static updateGroupStatuses(): Promise<void>;
    /**
     * Create the next quarterly group if needed
     * This should be called periodically (e.g., monthly)
     */
    static ensureNextGroupExists(): Promise<void>;
    /**
     * Run all cron jobs
     * This should be called periodically (e.g., daily)
     */
    static runAllCronJobs(): Promise<void>;
}
//# sourceMappingURL=cronService.d.ts.map