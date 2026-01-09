# Coachify - Adaptive Learning Engine for Quantitative Skills

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-brightgreen)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-4.18-lightgrey)](https://expressjs.com/)

A sophisticated backend API for an adaptive learning platform that personalizes quantitative skills education using rule-based algorithms.

## 📋 Overview

This platform delivers personalized learning experiences for students across multiple segments:

- **Competitive Exam Students** (Ages 20-32) - CAT, IPMAT, SSC, CUET preparation
- **School Students** (Ages 14-19) - Board exams and entrance tests
- **Kids** (Ages 10-13) - Foundational math skills
- **Professionals** (Ages 22-32) - Skill enhancement

## ✨ Features

- 🎯 **Adaptive Learning Algorithm**: Rule-based difficulty adjustment based on real-time performance
- 📊 **Micro-Skill Tracking**: Granular progress monitoring across 74 distinct micro-skills
- 🎮 **Segment-Specific Gamification**: Customized engagement features for each user segment
- 📹 **Video Integration**: 74 instructional videos linked to micro-skills
- 📈 **Advanced Analytics**: Comprehensive progress tracking and performance insights
- 🔒 **Secure Authentication**: JWT-based authentication with refresh tokens
- ⚡ **High Performance**: Optimized for 10,000+ concurrent users

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js (v18+)
- **Language**: TypeScript 5.3
- **Framework**: Express.js 4.18
- **Database**: MongoDB 6+ (Mongoose ODM)
- **Caching**: Redis (ioredis)
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcryptjs
- **Validation**: Joi + express-validator
- **Logging**: Winston
- **Security**: Helmet, express-rate-limit, express-mongo-sanitize

### Development Tools
- **Testing**: Jest
- **Code Quality**: ESLint, Prettier
- **Process Manager**: Nodemon, ts-node
- **API Documentation**: Swagger/OpenAPI (planned)

## 📁 Project Structure

```
coachify-adaptive-learning/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.config.ts
│   │   └── env.config.ts
│   ├── models/              # Mongoose models
│   │   ├── question.model.ts
│   │   ├── user.model.ts
│   │   ├── userProgress.model.ts
│   │   ├── session.model.ts
│   │   ├── videoLecture.model.ts
│   │   └── index.ts
│   ├── controllers/         # Request handlers (coming soon)
│   ├── routes/              # API routes (coming soon)
│   ├── middlewares/         # Custom middleware (coming soon)
│   ├── services/            # Business logic (coming soon)
│   ├── utils/               # Utility functions
│   │   └── logger.util.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── validators/          # Request validation schemas (coming soon)
│   ├── scripts/             # Database seeding scripts (coming soon)
│   └── server.ts            # Entry point (coming soon)
├── logs/                    # Log files
├── dist/                    # Compiled JavaScript (after build)
├── .env.example             # Environment variables template
├── .eslintrc.json          # ESLint configuration
├── .prettierrc             # Prettier configuration
├── .gitignore              # Git ignore rules
├── tsconfig.json           # TypeScript configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **MongoDB** (v6 or higher) - Running locally or MongoDB Atlas
- **Redis** (v6 or higher) - For caching and sessions
- **npm** (v9 or higher)

### Installation

1. **Clone the repository**:
```bash
cd /Users/shivamjoshi/Desktop
cd coachify-adaptive-learning
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/adaptive_learning_engine
JWT_SECRET=your-secret-key-here
# ... other variables
```

4. **Start MongoDB** (if running locally):
```bash
mongod
```

5. **Start Redis** (if running locally):
```bash
redis-server
```

6. **Run in development mode**:
```bash
npm run dev
```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build production bundle (TypeScript → JavaScript)
- `npm start` - Start production server
- `npm test` - Run tests with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run db:seed` - Seed database with initial data (coming soon)
- `npm run db:reset` - Reset database (coming soon)

## 📚 Content Structure

### 21 Modules covering 74 Micro-Skills

| Module | Name | Micro-Skills | Description |
|--------|------|--------------|-------------|
| 0 | Magic Maths | 5 | Mathematical tricks and patterns |
| 1 | Speed Addition | 3 | Fast addition techniques |
| 2 | Speed Subtraction | 3 | Fast subtraction techniques |
| 3 | Speed Multiplication | 16 | Various multiplication methods |
| 4 | Speed Division | 2 | Fast division techniques |
| 5 | Squaring Techniques | 4 | Quick squaring methods |
| 6 | Cubing Techniques | 4 | Quick cubing methods |
| 7 | Cube Rooting | 2 | Cube root techniques |
| 8 | Square Rooting | 2 | Square root techniques |
| 9 | Percentage | 5 | Percentage calculations |
| 10 | Ratio | 3 | Ratio concepts |
| 11 | Average | 2 | Average calculations |
| 12 | Fractions | 5 | Fraction operations |
| 13 | Indices | 1 | Index operations |
| 14 | Surds | 1 | Surd operations |
| 15 | VBODMAS | 1 | Order of operations |
| 16 | Approximation | 1 | Estimation techniques |
| 17 | Simple Equations | 4 | Equation solving |
| 18 | Factorisation | 4 | Factorization methods |
| 19 | DI + QA Application | 5 | Data interpretation |
| 20 | Miscellaneous | 1 | Additional topics |

### Question Bank
- **Phase 1**: 1,200 questions (pilot launch)
- **Phase 2**: 3,100+ questions (full launch)
- **Video Content**: 74 instructional videos

## 🧠 Adaptive Learning Algorithm

The platform uses a sophisticated rule-based adaptive algorithm:

### Difficulty Adjustment Rules

| Accuracy Range | Action |
|----------------|--------|
| 85-100% | Increase difficulty by 1-2 levels |
| 60-84% | Maintain or slight increase |
| 40-59% | Decrease by 1 level |
| Below 40% | Significant decrease or prerequisite review |

### Question Selection Strategy
- **40%** focus on weak areas
- **40%** moderate difficulty practice
- **20%** challenge questions

### Skill Decay Algorithm
- Decay formula: `decay_factor = e^(-0.05 * days_since_practice)`
- Approximately 60% retention after 10 days
- Minimum 10% retention floor

## 🗄️ Database Schema

The application uses 5 main MongoDB collections:

### 1. Questions Collection
- Question bank with solutions and metadata
- Difficulty levels 1-10
- Performance tracking
- Solution steps and hints

### 2. Users Collection
- User profiles and authentication
- Segment-specific preferences
- Progress summaries
- Gamification data

### 3. User Progress Collection
- Detailed skill-level tracking
- Mastery levels (0-1)
- Last 5 performance tracking
- Error pattern analysis

### 4. Sessions Collection
- Practice session records
- Question attempts with timing
- Session metrics
- Next set recommendations

### 5. Video Lectures Collection
- Video metadata
- Engagement metrics
- Educational content mapping
- User interactions

## 🔒 Security Features

- ✅ Password hashing with bcrypt (12 rounds)
- ✅ JWT-based authentication
- ✅ Refresh token mechanism
- ✅ Rate limiting on all endpoints
- ✅ Input validation and sanitization
- ✅ CORS configuration
- ✅ Helmet.js security headers
- ✅ MongoDB injection prevention
- ✅ XSS protection

## 📊 Performance Targets

- **API Response Time**: < 200ms
- **Page Load Time**: < 3 seconds
- **Concurrent Users**: 10,000+
- **Database Query Optimization**: Proper indexing on all frequently queried fields
- **Caching Strategy**: Redis for sessions and frequently accessed data

## 🧪 Testing (Coming Soon)

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
```

## 🚢 Deployment (Coming Soon)

The application is designed to be deployed on:
- **Cloud Providers**: AWS, GCP, Azure
- **Database**: MongoDB Atlas
- **Caching**: Redis Cloud or ElastiCache
- **CDN**: CloudFront or Cloudflare (for video content)

## 📝 API Documentation (Coming Soon)

API documentation will be available at `/api-docs` when running the server.

## 🤝 Contributing

This is a team project. Please follow these guidelines:

1. Create feature branches from `main`
2. Follow the ESLint and Prettier configurations
3. Write tests for new features
4. Update documentation as needed
5. Create pull requests for review

## 📄 License

MIT

## 👥 Team

Coachify Development Team

## 📞 Contact

For questions or support, please contact the development team.

---

**Built with ❤️ for better education**
