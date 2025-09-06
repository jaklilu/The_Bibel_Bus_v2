# 🚌 Automated Group Management System

## Overview
The Bible Bus now features a fully automated group management system that creates new groups every 3 months and automatically assigns new registrations to the appropriate group.

## 🗓️ Group Schedule
- **January 1st** - New group starts
- **April 1st** - New group starts  
- **July 1st** - New group starts
- **October 1st** - New group starts

## 🏷️ Group Naming Convention
All groups follow the format: **"Bible Bus [Month] [Year] Travelers"**
- **Example:** "Bible Bus October 2025 Travelers"
- **Example:** "Bible Bus January 2026 Travelers"
- **Example:** "Bible Bus April 2026 Travelers"

## ⏰ Registration Windows
- **Registration Period:** First 17 days of each group start
- **After 17 days:** Group closes to new members (they're already into Genesis)
- **Automatic Transition:** System automatically switches to next group when current one closes

## 🔧 How It Works

### 1. Automatic Group Creation
- System automatically creates new groups every 3 months
- Groups are created with proper start dates, end dates, and registration deadlines
- Maximum capacity: 50 members per group
- Naming format: "Bible Bus [Month] [Year] Travelers" (e.g., "Bible Bus October 2025 Travelers")

### 2. User Registration & Assignment
- When a user registers, they're automatically assigned to the current active group
- If no active group exists, a new one is created automatically
- Users cannot be left without a group assignment

### 3. Group Status Management
- **upcoming:** Group exists but hasn't started yet
- **active:** Group is running and accepting new members (first 17 days)
- **closed:** Group is running but no longer accepting new members (after 17 days)
- **completed:** Group has finished its 365-day journey

### 4. Automatic Status Updates
- System runs daily to update group statuses
- Groups automatically transition between statuses based on dates
- New groups are created when needed

## 📊 Database Schema

### bible_groups Table
```sql
CREATE TABLE bible_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  registration_deadline DATE NOT NULL,
  max_members INTEGER DEFAULT 50,
  status TEXT DEFAULT 'upcoming',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### group_members Table
```sql
CREATE TABLE group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  join_date DATE NOT NULL,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES bible_groups (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
)
```

## 🚀 API Endpoints

### Group Management
- `GET /api/admin/groups` - Get all groups with member counts
- `GET /api/admin/groups/:id` - Get specific group details and members
- `GET /api/admin/groups/current/active` - Get current active group
- `GET /api/admin/groups/next/upcoming` - Get next upcoming group

### Cron Jobs
- `POST /api/admin/cron/run` - Manually trigger all cron jobs

## 🔄 Cron Jobs

### Daily Updates (Automatic)
- Update group statuses based on current date
- Check if new groups need to be created
- Ensure system is always ready for new registrations

### Manual Triggers
- Admin can manually run cron jobs for testing
- Useful for immediate group status updates

## 📝 Registration Flow

1. **User fills registration form** (no password required)
2. **System creates user account**
3. **System automatically assigns user to current active group**
4. **If no active group exists, creates new one**
5. **Returns success with group assignment details**
6. **User is redirected to dashboard**

## 🧪 Testing

### Test Script
Run `node test-group-system.js` to test all group management functions.

### Manual Testing
1. Register a new user
2. Check admin panel for group assignment
3. Verify group statuses are correct
4. Test registration deadline enforcement

## 🎯 Benefits

- ✅ **Fully Automated** - No manual group management needed
- ✅ **Always Available** - New groups created automatically
- ✅ **No Orphaned Users** - Everyone gets assigned to a group
- ✅ **Consistent Timing** - Groups start exactly every 3 months
- ✅ **Smart Registration** - 17-day window prevents late joiners
- ✅ **Scalable** - System handles unlimited groups and users

## 🔮 Future Enhancements

- Email notifications for group start dates
- Progress tracking within groups
- Group-specific messaging and announcements
- Member milestone celebrations
- Group performance analytics

---

**Note:** This system ensures that The Bible Bus always has active groups available for new registrations, with no manual intervention required.
