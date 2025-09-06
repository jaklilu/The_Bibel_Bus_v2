# The Bible Bus - Project Context & Progress

## 🎯 **Project Overview**
**The Bible Bus - Web App** is a mobile-first React web application for managing Bible reading groups, user dashboards, milestone notifications, and community engagement. The backend is Node.js/Express with SQLite for local development, with deployment to Netlify.

## 🏗️ **Architecture & Technology Stack**

### **Frontend**
- **React** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for responsive design
- **React Router DOM** for navigation
- **Axios** for API calls
- **Lucide React** for icons
- **Framer Motion** for animations
- **React Countdown** for countdown timers
- **Date-fns** for date manipulation

### **Backend**
- **Node.js/Express** server
- **SQLite** database with `sqlite3` package
- **Bcryptjs** for password hashing
- **JSONWebToken** for authentication
- **Express-Validator** for input validation
- **Dotenv** for environment variables
- **Helmet** for security headers
- **CORS** for cross-origin requests
- **Morgan** for logging
- **Nodemailer** for email functionality
- **Crypto** for token generation

### **Project Management**
- **Concurrently** for running frontend/backend simultaneously
- **Nodemon** for backend development
- **TS-Node** for TypeScript execution

## 🚀 **Core Features Implemented**

### **1. Landing Page (Home.tsx)**
- **Countdown Timer** to next group start date
- **Animated Bible Bus Logo** with bouncing animation
- **Journey to the Heart of God** section with 8 feature cards
- **Responsive Design** with mobile-first approach
- **Custom Font Classes** using 'Inter' font
- **Color Scheme**: Deep purple, golden yellow/amber, light purple

### **2. User Registration System**
- **Simplified Registration**: Email + Name only (no password required)
- **Automatic Group Assignment**: Users automatically assigned to current active group
- **Group Information Display**: Shows current group details, start date, registration deadline
- **Dynamic Group Fetching**: Real-time group information from API

### **3. User Dashboard**
- **Progress Tracking**: Bible reading progress visualization
- **Group Information**: Current group details and next milestones
- **Action Cards**: WhatsApp group, YouVersion app, Instructions, Invitations
- **Message Board Integration**: Group messages display with filtering
- **Responsive Layout**: Beautiful cards with hover effects and animations

### **4. Admin System**
- **Role-Based Access Control**: Admin vs regular user roles
- **Admin Dashboard**: Overview, Groups, Users, Progress, Messages, Donations, Password Management
- **Group Management**: View all groups with member counts and status
- **User Management**: View all users with roles and status
- **Message Management**: Create, edit, delete group messages

### **5. Automated Group Management System**
- **GroupService**: Backend service for managing Bible groups
- **CronService**: Automated periodic tasks for group management
- **Quarterly Groups**: New groups created every 3 months automatically
- **Group Naming Convention**: "Bible Bus [Month] [Year] Travelers"
- **Registration Windows**: 17-day registration periods for each group
- **Status Management**: Active, upcoming, completed group statuses

### **6. Interactive Message Board System** ✨ **MAJOR UPDATE!**
- **Group Messages**: Encouragement, reminders, announcements, milestones
- **User-Generated Content**: Members can post their own messages (prayer requests, testimonies, questions)
- **Comments System**: Users can comment on any message for community engagement
- **Priority System**: Urgent, high, normal, low priority levels
- **User Dashboard Integration**: Members see messages from their group
- **Admin Message Management**: Create, edit, delete messages for any group
- **Beautiful UI**: Color-coded by message type with icons and animations
- **Smart Filtering**: 8 message types with always-visible filter buttons
- **Unread Indicators**: Red dots and "NEW" badges for unread messages
- **Smart Read Tracking**: Click filter buttons to mark message types as read
- **Real-time Updates**: Refresh functionality for latest messages

## 🗄️ **Database Schema**

### **Users Table**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT, -- Optional for simplified member login
  role TEXT DEFAULT 'member',
  city TEXT,
  mailing_address TEXT,
  referred_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### **Bible Groups Table**
```sql
CREATE TABLE bible_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'upcoming',
  registration_deadline DATE NOT NULL,
  max_members INTEGER DEFAULT 50,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### **Group Messages Table** ✨ **UPDATED!**
```sql
CREATE TABLE group_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'encouragement',
  priority TEXT DEFAULT 'normal',
  created_by INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES bible_groups (id),
  FOREIGN KEY (created_by) REFERENCES users (id)
)
```

### **User Messages Table** ✨ **NEW!**
```sql
CREATE TABLE user_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'encouragement',
  status TEXT DEFAULT 'approved',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES bible_groups (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
)
```

### **Message Comments Table** ✨ **NEW!**
```sql
CREATE TABLE message_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES group_messages (id),
  FOREIGN KEY (user_id) REFERENCES users (id)
)
```

### **Password Reset Tokens Table** ✨ **UPDATED!**
```sql
CREATE TABLE password_reset_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  used BOOLEAN DEFAULT FALSE, -- ✨ NEW: Track if token has been used
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
)
```

## 🔧 **API Endpoints**

### **Authentication Routes** (`/api/auth`) ✨ **MAJOR UPDATE!**
- `POST /register` - User registration (simplified)
- `POST /login` - User login (email + name for members)
- `POST /admin/login` - Admin login (email + password) ✨ **NEW!**
- `POST /reset-password` - Password reset request
- `POST /reset-password-confirm` - Confirm password reset with token ✨ **NEW!**
- `POST /change-password` - Change admin password
- `GET /profile` - Get user profile
- `GET /my-group-messages` - Get user's group messages
- `GET /my-group-messages/:type` - Get messages by type
- `GET /my-group-all-messages` - Get all messages (admin + user) with comments ✨ **NEW!**
- `POST /add-comment` - Add comment to a message ✨ **NEW!**
- `POST /create-message` - Create user-generated message ✨ **NEW!**
- `GET /my-messages` - Get user's own messages ✨ **NEW!**
- `DELETE /my-messages/:messageId` - Delete user's own message ✨ **NEW!**

### **Admin Routes** (`/api/admin`)
- `GET /groups` - Get all groups with member counts
- `GET /groups/:id` - Get specific group details and members
- `GET /groups/current/active` - Get current active group
- `GET /groups/next/upcoming` - Get next upcoming group
- `GET /users` - Get all users
- `GET /progress` - Get user progress data
- `POST /cron/run` - Manually trigger cron jobs

### **Admin Message Routes** ✨ **NEW!**
- `POST /group-messages` - Create new group message
- `GET /group-messages` - Get all group messages
- `GET /group-messages/group/:groupId` - Get messages for specific group
- `PUT /group-messages/:id` - Update existing message
- `DELETE /group-messages/:id` - Delete message
- `GET /group-messages/stats/:groupId` - Get message statistics

## 🎨 **UI/UX Features**

### **Color Scheme**
- **Primary**: Deep purple (`purple-700`, `purple-800`, `purple-900`)
- **Accent**: Golden yellow/amber (`yellow-400`, `amber-500`)
- **Secondary**: Light purple (`purple-600`, `purple-700/50`)
- **Success**: Green (`green-600`) for WhatsApp
- **Info**: Blue (`blue-600`) for YouVersion/Instructions
- **Warning**: Orange (`orange-500`) for Invitations
- **Danger**: Red (`red-800`, `red-900`) for logout

### **Animations**
- **Framer Motion**: Entrance animations, hover effects, page transitions
- **Button Animations**: Flashing effects, hover scaling, color transitions
- **Logo Animation**: Bouncing Bible Bus logo
- **Card Animations**: Staggered entrance, hover scaling

### **Responsive Design**
- **Mobile-First**: Optimized for mobile devices
- **Grid Layouts**: Responsive card grids
- **Flexbox**: Flexible layouts for different screen sizes
- **Tailwind CSS**: Utility-first responsive design

## 🔄 **Recent Major Updates**

### **Interactive Message Board System Implementation** (Latest) ✨ **MAJOR UPDATE!**
- **User-Generated Content**: Members can post prayer requests, testimonies, questions, encouragement
- **Comments System**: Users can comment on any message for community engagement
- **Smart Filtering**: 8 message types with always-visible filter buttons (Milestones, Encouragement, Prayer Requests, Testimonies, Questions, Reminders, Announcements, All Messages)
- **Unread Message Indicators**: Red notification badges, "NEW" labels, pulsing animations
- **Smart Read Tracking**: Click filter buttons to mark message types as read
- **Database Schema**: Added `user_messages` and `message_comments` tables
- **API Endpoints**: New routes for user interactions, comments, and message creation
- **UI/UX**: Beautiful modal for creating messages, expandable comments, member badges
- **Community Features**: True community experience with member-to-member interaction

### **Join Next Group Flow** ✨ NEW
- Dashboard banner for the next upcoming group (name, start date, deadline, capacity)
- One-click “Join Next Group” for returning members; cancel if needed
- Enforces 17-day registration window and max capacity
- Endpoints: `GET /api/auth/next-group`, `POST /api/auth/groups/:id/join`, `POST /api/auth/groups/:id/cancel`

### **Automated Welcome Letter for New Users** ✨ NEW
- On each group’s start date, new users (no prior memberships) receive a personal welcome message
- Per-user visibility so only new users see it
- Executed via daily cron alongside group status updates

### **Awards Page Revamp & Tier Updates** ✨ NEW UI
- Tier cards redesigned with gradients, icons, glow, and member tiles
- Tiers: Diamond (10+), Platinum (7–9), Gold (4–6), Silver (2–3), Bronze (0–1)

### **Dashboard UX Improvements** ✨ NEW
- “Accept Your Invitation” countdown centered with four tiles; seconds tile flips smoothly
- Quick Actions reordered: WhatsApp, YouVersion, Accept Invitation, Intro Video, Instructions, Awards
- Logout moved to header next to welcome text

### **Registration Page Adjustments** ✨ NEW
- Removed “Registration Window” section
- Moved Mailing Address below “Who Referred You?”
- Renamed “City” to “City You Live In”

### **Admin Modal Positioning** ✨ NEW
- Raised “View Members” and “Add Members” modals to open near top
- Auto-scroll to top on open

### **Password Reset System Implementation** ✨ **COMPLETED!**
- **Complete Password Reset Flow**: Email sending, token generation, secure reset page
- **ResetPassword.tsx Component**: Beautiful, functional password reset page with validation
- **Email Integration**: Working email sending with Gmail SMTP and app passwords
- **Token Management**: Secure token generation, expiration, and usage tracking
- **Database Schema Fix**: Added missing `used` column to `password_reset_tokens` table
- **UI/UX Improvements**: Consistent color scheme, proper contrast, mobile-responsive design
- **Security Features**: Token expiration, one-time use, proper validation

### **Admin Login System Fixes** ✨ **NEW!**
- **Email Normalization Issue**: Fixed `.normalizeEmail()` breaking database lookups
- **Separate Admin Login Route**: `/api/auth/admin/login` for admin authentication
- **Password Authentication**: Admin login with email + password (different from member login)
- **JWT Token Management**: Proper admin token generation with role-based access
- **Database Integration**: Fixed admin user lookup and password verification

### **Message Board System Implementation**
- Created `MessageBoard.tsx` component for user dashboard
- Created `AdminMessageManager.tsx` component for admin panel
- Integrated message board into user dashboard
- Added message management tab to admin panel
- Updated API routes for message CRUD operations
- Added message filtering and priority system
- Beautiful UI with color-coded message types

### **Automated Group Management**
- Implemented `GroupService` for group operations
- Created `CronService` for automated tasks
- Added quarterly group creation logic
- Updated group naming convention
- Added registration deadline management
- Integrated with user registration system

### **Simplified User Authentication**
- Removed password requirement for regular members
- Simplified registration process
- Maintained admin password authentication
- Updated database schema accordingly

## 🚧 **Known Issues & Solutions**

### **Unread Message Indicator Issues** ✨ **IN PROGRESS!**
- **Issue**: Red dots appearing on message types with no new messages (e.g., Questions showing unread when no questions exist)
- **Issue**: Red dots not disappearing after clicking filter buttons to mark as read
- **Solution**: Added debugging and force update mechanism
- **Status**: Debugging implemented, needs testing and refinement
- **Next Steps**: Test the fixes and remove debugging code once working

### **Email Normalization Issues** ✨ **FIXED!**
- **Issue**: `.normalizeEmail()` converting emails to lowercase, breaking database lookups
- **Solution**: Removed `.normalizeEmail()` from admin login and password reset routes
- **Impact**: Fixed admin login and password reset functionality

### **Database Schema Updates**
- **Issue**: Column missing errors after schema changes (e.g., `used` column in `password_reset_tokens`)
- **Solution**: Rebuild backend (`npm run build`) and re-seed database
- **Process**: Delete old database, rebuild, run `npm run db:seed`
- **Prevention**: Always update `database.ts` schema before running migrations

### **Port Conflicts**
- **Issue**: `EADDRINUSE: address already in use :::5001`
- **Solution**: Changed default port to 5002, stop all Node.js processes and restart servers
- **Prevention**: Use `Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force`

### **Environment Variables**
- **Issue**: `.env` file not being read or getting reset
- **Solution**: Manual creation with correct values
- **Required Variables**: `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `FRONTEND_URL`, `DB_PATH`, `JWT_SECRET`, `PORT`

## 📁 **File Structure**

```
The-Bible-Bus/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MessageBoard.tsx ✨ MAJOR UPDATE!
│   │   │   ├── AdminMessageManager.tsx ✨ NEW!
│   │   │   └── Navigation.tsx
│   │   ├── pages/
│   │   │   ├── Home.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Admin.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Login.tsx
│   │   │   └── ResetPassword.tsx ✨ NEW!
│   │   └── App.tsx
│   └── vite.config.ts
├── backend/
│   ├── src/
│   │   ├── services/
│   │   │   ├── GroupService.ts
│   │   │   ├── CronService.ts
│   │   │   ├── MessageService.ts ✨ NEW!
│   │   │   └── UserInteractionService.ts ✨ NEW!
│   │   ├── middleware/
│   │   │   └── userAuth.ts ✨ NEW!
│   │   ├── routes/
│   │   │   ├── auth.ts ✨ MAJOR UPDATE!
│   │   │   └── admin.ts
│   │   ├── database/
│   │   │   ├── database.ts ✨ UPDATED!
│   │   │   ├── migrate.ts
│   │   │   └── seed.ts
│   │   └── index.ts
│   └── package.json
└── package.json
```

## 🎯 **Next Steps & Future Features**

### **Immediate Priorities**
- ✅ **Interactive Message Board System** - COMPLETED ✨ **MAJOR UPDATE!**
- ✅ **Automated Group Management** - COMPLETED
- ✅ **Simplified User Authentication** - COMPLETED
- ✅ **Password Reset System** - COMPLETED
- ✅ **Admin Login System** - COMPLETED
- 🔄 **Unread Message Indicator Fixes** - IN PROGRESS

### **Potential Future Features**
- **Real-time Chat**: WebSocket integration for live group discussions
- **Reading Progress Tracking**: Bible chapter completion tracking
- **Milestone Celebrations**: Achievement badges and celebrations
- **Mobile App**: React Native or PWA development
- **Analytics Dashboard**: Group engagement metrics
- **Email Notifications**: Automated reminder emails

## 🔑 **Admin Credentials**
- **Email**: `JayTheBibleBus@gmail.com`
- **Password**: `admin123`
- **Role**: Administrator with full access

## 🌐 **Access URLs** ✨ **UPDATED!**
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:5002/api` (changed from 5001)
- **Admin Panel**: `http://localhost:3000/admin`
- **Password Reset**: `http://localhost:3000/reset-password?token=<token>`
 - **New Join-Next Endpoints**: `GET /api/auth/next-group`, `POST /api/auth/groups/:id/join`, `POST /api/auth/groups/:id/cancel`

## 📝 **Development Commands**
```bash
# Start both frontend and backend
npm run dev

# Start only backend
npm run dev:backend

# Start only frontend
npm run dev:frontend

# Build backend
cd backend && npm run build

# Seed database
cd backend && npm run db:seed

# Reset database
cd backend && npm run db:reset
```

---

**Last Updated**: December 19, 2024  
**Session Status**: Join Next Group flow, Welcome Letters, Awards Revamp, and multiple UI/UX improvements implemented  
**Next Session Goals**: Prep for deployment (VITE_API_BASE, redirects), optional payments scaffold, finalize CORS and envs