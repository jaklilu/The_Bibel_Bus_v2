# 🚌 The Bible Bus

A modern web application for managing community transportation services with a focus on faith-based community building.

## ✨ Features

- **Modern React Frontend**: Built with TypeScript, Vite, and Tailwind CSS
- **Node.js Backend**: Express.js API with SQLite database
- **User Management**: Registration, authentication, and profile management
- **Trip Management**: Schedule, track, and manage community trips
- **Responsive Design**: Mobile-first approach with beautiful UI/UX
- **Real-time Updates**: Live dashboard with trip status and user information

## 🏗️ Architecture

```
The-Bible-Bus/
├── frontend/          # React TypeScript application
├── backend/           # Node.js Express API
├── package.json       # Root package.json for scripts
└── README.md         # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd The-Bible-Bus
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Start development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately:
   npm run dev:frontend    # Frontend on http://localhost:3000
   npm run dev:backend     # Backend on http://localhost:5000
   ```

## 📱 Frontend

The React frontend is built with modern web technologies:

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Lucide React** for icons

### Available Scripts

```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
```

## 🔧 Backend

The Node.js backend provides a robust API:

- **Express.js** framework
- **SQLite** database (easy to migrate to PostgreSQL)
- **JWT** authentication
- **Input validation** with express-validator
- **Security** with helmet and CORS

### Available Scripts

```bash
cd backend
npm run dev          # Start development server with nodemon
npm run build        # Build TypeScript to JavaScript
npm start            # Start production server
npm run test         # Run tests
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with sample data
```

## 🗄️ Database

The application uses SQLite for development with the following schema:

- **users**: User accounts and profiles
- **trips**: Trip scheduling and management
- **trip_bookings**: User trip reservations

### Database Operations

```bash
# View database
cd backend
sqlite3 data/bible_bus.db

# Run migrations
npm run db:migrate

# Seed with sample data
npm run db:seed
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Trips
- `GET /api/trips` - Get all trips
- `GET /api/trips/:id` - Get trip by ID
- `POST /api/trips` - Create new trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/:id/stats` - Get user statistics

## 🚀 Deployment

### Netlify Frontend

1. **Build the frontend**
   ```bash
   npm run build:frontend
   ```

2. **Deploy to Netlify**
   - Connect your GitHub repository
   - Set build command: `npm run build:frontend`
   - Set publish directory: `frontend/dist`
   - Set environment variables for API endpoints

### Backend Deployment

The backend can be deployed to:
- **Heroku** (with PostgreSQL)
- **Railway** (with PostgreSQL)
- **DigitalOcean** (with managed database)
- **AWS** (with RDS)

## 🔒 Security Features

- **JWT Authentication** with secure token handling
- **Password Hashing** using bcrypt
- **Input Validation** with express-validator
- **CORS Protection** for cross-origin requests
- **Helmet** for security headers
- **SQL Injection Protection** with parameterized queries

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run frontend tests
npm run test:frontend

# Run backend tests
npm run test:backend
```

## 📝 Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key
DB_PATH=./data/bible_bus.db
CORS_ORIGIN=http://localhost:3000
```

### Frontend
The frontend automatically proxies API calls to the backend during development.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

If you encounter any issues:

1. Check the console for error messages
2. Verify your environment variables
3. Ensure all dependencies are installed
4. Check the database connection

## 🎯 Roadmap

- [ ] Real-time notifications
- [ ] Mobile app (React Native)
- [ ] Payment integration
- [ ] Advanced reporting
- [ ] Multi-language support
- [ ] Push notifications

---

**Built with ❤️ for community service and faith-based initiatives**
