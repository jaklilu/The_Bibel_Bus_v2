"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CronService = void 0;
const groupService_1 = require("./groupService");
class CronService {
    /**
     * Update all group statuses based on current date
     * This should be called periodically (e.g., daily)
     */
    static async updateGroupStatuses() {
        try {
            console.log('🔄 Updating group statuses...');
            // Update existing group statuses
            await groupService_1.GroupService.updateGroupStatuses();
            // Check if we need to create a new group
            const currentGroup = await groupService_1.GroupService.getCurrentActiveGroup();
            const nextGroup = await groupService_1.GroupService.getNextUpcomingGroup();
            if (!currentGroup && !nextGroup) {
                console.log('📅 No groups found, creating initial group...');
                await groupService_1.GroupService.createNextQuarterlyGroup();
            }
            else if (!currentGroup && nextGroup) {
                console.log('📅 Activating next group...');
                // The next group should become active
                await groupService_1.GroupService.updateGroupStatuses();
            }
            console.log('✅ Group statuses updated successfully');
        }
        catch (error) {
            console.error('❌ Error updating group statuses:', error);
        }
    }
    /**
     * Create the next quarterly group if needed
     * This should be called periodically (e.g., monthly)
     */
    static async ensureNextGroupExists() {
        try {
            console.log('🔄 Ensuring next group exists...');
            const nextGroup = await groupService_1.GroupService.getNextUpcomingGroup();
            if (!nextGroup) {
                console.log('📅 Creating next quarterly group...');
                await groupService_1.GroupService.createNextQuarterlyGroup();
            }
            else {
                console.log('📅 Next group already exists:', nextGroup.name);
            }
            console.log('✅ Next group check completed');
        }
        catch (error) {
            console.error('❌ Error ensuring next group exists:', error);
        }
    }
    /**
     * Run all cron jobs
     * This should be called periodically (e.g., daily)
     */
    static async runAllCronJobs() {
        try {
            console.log('🚀 Running all cron jobs...');
            await this.updateGroupStatuses();
            await this.ensureNextGroupExists();
            console.log('✅ All cron jobs completed successfully');
        }
        catch (error) {
            console.error('❌ Error running cron jobs:', error);
        }
    }
}
exports.CronService = CronService;
//# sourceMappingURL=cronService.js.map