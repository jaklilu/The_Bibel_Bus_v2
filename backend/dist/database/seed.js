"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const seedDatabase = async () => {
    try {
        console.log('🌱 Seeding Bible Bus database with sample data...');
        // Create admin user
        const adminPassword = 'admin123';
        const adminPasswordHash = await bcryptjs_1.default.hash(adminPassword, 12);
        const adminUser = await (0, database_1.runQuery)('INSERT OR IGNORE INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)', ['Bible Bus Admin', 'JayTheBibleBus@gmail.com', '(555) 000-0000', adminPasswordHash, 'admin']);
        // Seed regular users
        const users = [
            {
                name: 'John Smith',
                email: 'john@example.com',
                phone: '(555) 123-4567',
                password_hash: await bcryptjs_1.default.hash('password123', 12),
                city: 'New York',
                mailing_address: '123 Main St, New York, NY 10001'
            },
            {
                name: 'Sarah Johnson',
                email: 'sarah@example.com',
                phone: '(555) 234-5678',
                password_hash: await bcryptjs_1.default.hash('password123', 12),
                city: 'Los Angeles',
                mailing_address: '456 Oak Ave, Los Angeles, CA 90210'
            },
            {
                name: 'Mike Davis',
                email: 'mike@example.com',
                phone: '(555) 345-6789',
                password_hash: await bcryptjs_1.default.hash('password123', 12),
                city: 'Chicago',
                mailing_address: '789 Pine Rd, Chicago, IL 60601'
            }
        ];
        for (const user of users) {
            await (0, database_1.runQuery)('INSERT OR IGNORE INTO users (name, email, phone, password_hash, city, mailing_address) VALUES (?, ?, ?, ?, ?, ?)', [user.name, user.email, user.phone, user.password_hash, user.city, user.mailing_address]);
        }
        // Create Bible reading groups (quarterly)
        const currentYear = new Date().getFullYear();
        const groups = [
            {
                name: 'Bible Bus January 2025 Travelers',
                start_date: '2025-01-01',
                end_date: '2025-12-31',
                registration_deadline: '2025-01-17',
                max_members: 50,
                status: 'completed'
            },
            {
                name: 'Bible Bus April 2025 Travelers',
                start_date: '2025-04-01',
                end_date: '2026-03-31',
                registration_deadline: '2025-04-17',
                max_members: 50,
                status: 'active'
            },
            {
                name: 'Bible Bus July 2025 Travelers',
                start_date: '2025-07-01',
                end_date: '2026-06-30',
                registration_deadline: '2025-07-17',
                max_members: 50,
                status: 'upcoming'
            },
            {
                name: 'Bible Bus October 2025 Travelers',
                start_date: '2025-10-01',
                end_date: '2026-09-30',
                registration_deadline: '2025-10-17',
                max_members: 50,
                status: 'upcoming'
            }
        ];
        for (const group of groups) {
            await (0, database_1.runQuery)('INSERT OR IGNORE INTO bible_groups (name, start_date, end_date, registration_deadline, max_members, status) VALUES (?, ?, ?, ?, ?, ?)', [group.name, group.start_date, group.end_date, group.registration_deadline, group.max_members, group.status]);
        }
        // Add users to groups
        const groupMembers = [
            { group_id: 1, user_id: 2, join_date: '2025-01-01' },
            { group_id: 1, user_id: 3, join_date: '2025-01-01' },
            { group_id: 2, user_id: 4, join_date: '2025-04-01' }
        ];
        for (const member of groupMembers) {
            await (0, database_1.runQuery)('INSERT OR IGNORE INTO group_members (group_id, user_id, join_date) VALUES (?, ?, ?)', [member.group_id, member.user_id, member.join_date]);
        }
        // Create sample admin messages
        const adminMessages = [
            {
                title: 'Welcome to Your Bible Journey!',
                message: 'Congratulations on starting your 365-day Bible reading journey! Remember, consistency is key. Even if you miss a day, don\'t give up - just pick up where you left off.',
                type: 'encouragement',
                target_group_id: 2,
                created_by: 1
            },
            {
                title: 'Day 18 Milestone Reached!',
                message: 'Great job! You\'ve completed your first 18 days. This is when the habit really starts to form. Keep up the excellent work!',
                type: 'milestone',
                target_group_id: 2,
                created_by: 1
            }
        ];
        for (const message of adminMessages) {
            await (0, database_1.runQuery)('INSERT OR IGNORE INTO admin_messages (title, message, type, target_group_id, created_by) VALUES (?, ?, ?, ?, ?)', [message.title, message.message, message.type, message.target_group_id, message.created_by]);
        }
        // Create sample group messages
        const groupMessages = [
            {
                title: 'Welcome to Bible Bus October 2025 Travelers!',
                content: 'Welcome aboard! We\'re excited to start this 365-day journey through God\'s Word together. Let\'s encourage each other and grow in faith as we read through the Bible.',
                message_type: 'encouragement',
                priority: 'high',
                group_id: 4, // October 2025 group
                created_by: 1
            },
            {
                title: 'First Week Reading Reminder',
                content: 'Don\'t forget to start your reading journey! The first week covers Genesis 1-7. Take your time to reflect on God\'s creation and the beginning of human history.',
                message_type: 'reminder',
                priority: 'normal',
                group_id: 4,
                created_by: 1
            },
            {
                title: 'Group Milestone Celebration',
                content: 'Congratulations to everyone who completed their first week of reading! You\'ve taken the first step in this amazing journey. Keep up the great work!',
                message_type: 'milestone',
                priority: 'normal',
                group_id: 4,
                created_by: 1
            },
            {
                title: 'Important Announcement',
                content: 'Our weekly group check-ins will be every Sunday at 7 PM. This is a great time to share insights, ask questions, and encourage each other.',
                message_type: 'announcement',
                priority: 'high',
                group_id: 4,
                created_by: 1
            }
        ];
        for (const message of groupMessages) {
            await (0, database_1.runQuery)(`
        INSERT OR IGNORE INTO group_messages (title, content, message_type, priority, group_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [message.title, message.content, message.message_type, message.priority, message.group_id, message.created_by]);
        }
        console.log('✅ Bible Bus database seeded successfully!');
        console.log('📊 Sample data created:');
        console.log(`   - 1 admin user (JayTheBibleBus@gmail.com / admin123)`);
        console.log(`   - ${users.length} regular users`);
        console.log(`   - ${groups.length} Bible reading groups`);
        console.log(`   - ${groupMembers.length} group members`);
        console.log(`   - ${adminMessages.length} admin messages`);
        console.log(`   - ${groupMessages.length} group messages`);
    }
    catch (error) {
        console.error('❌ Error seeding database:', error);
        process.exit(1);
    }
};
// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}
exports.default = seedDatabase;
//# sourceMappingURL=seed.js.map