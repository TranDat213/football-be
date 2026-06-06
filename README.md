# Football Backend API

Backend service for the Football project - a comprehensive platform for managing football stadiums, teams, and bookings.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or higher
- pnpm (recommended) or npm
- PostgreSQL 14+
- Docker & Docker Compose (optional, for containerized setup)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd football-be
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Configure the following variables in `.env`:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/football_db
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=7d
PORT=3000
NODE_ENV=development
```

4. Run database migrations:
```bash
pnpm prisma migrate dev
# or
npm run prisma migrate dev
```

5. Start the development server:
```bash
pnpm dev
# or
npm run dev
```

The server will run on `http://localhost:3000`

## 📦 Project Structure

```
football-be/
├── src/
│   ├── modules/              # Feature modules
│   │   ├── auth/            # Authentication module
│   │   │   ├── application/ # Controllers & services
│   │   │   ├── domain/      # Repository interfaces
│   │   │   ├── dto/         # Data Transfer Objects
│   │   │   └── infrastructure/ # Repository implementations
│   │   └── [other modules]/
│   ├── middleware/          # Express middleware
│   ├── routes/              # Route definitions
│   ├── utils/               # Utility functions
│   ├── config/              # Configuration files
│   ├── types/               # TypeScript type definitions
│   └── app.ts              # Application entry point
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── dist/                    # Compiled JavaScript (generated)
├── docker-compose.yml      # Docker Compose configuration
├── Dockerfile              # Docker image definition
├── tsconfig.json           # TypeScript configuration
├── package.json            # Project dependencies
└── README.md              # This file
```

## 🔐 Authentication Module

The Auth module handles user authentication and authorization:

### Features
- **Sign Up**: Register new users with email/username and password
- **Sign In**: Authenticate users with email/username and password
- **Forgot Password**: Password reset functionality
- **OAuth**: Support for OAuth2 authentication providers
- **Owner Registration**: Register stadium owners with validation

### API Endpoints

#### Sign In
```http
POST /api/auth/sign-in
Content-Type: application/json

{
  "user_name": "string or email",
  "email": "optional@example.com",
  "password": "string"
}
```

#### Sign Up
```http
POST /api/auth/sign-up
Content-Type: application/json

{
  "first_name": "string",
  "last_name": "string",
  "user_name": "string",
  "email": "email@example.com",
  "password": "string (min 8 chars)",
  "confirmPassword": "string (min 8 chars)",
  "phone": "optional",
  "role": "optional"
}
```

#### Forgot Password
```http
PATCH /api/auth/forgot-password
Content-Type: application/json

{
  "user_name": "string or email",
  "email": "optional@example.com",
  "password": "string (min 8 chars)",
  "confirmPassword": "string (min 8 chars)"
}
```

#### Owner Registration
```http
POST /api/auth/owner-register
Content-Type: application/json

{
  "user_id": "optional",
  "full_name": "string",
  "email": "email@example.com",
  "phone": "string (format: 0xxx or +84xxx)",
  "stadium_name": "string",
  "address": "string"
}
```

#### OAuth
```http
POST /api/auth/oauth
Content-Type: application/json

{
  "email": "email@example.com",
  "provider": "string (google, facebook, etc)",
  "providerId": "string"
}
```

#### Logout
```http
POST /api/auth/logout
```

## 🏗️ Architecture & Design Patterns

### Layered Architecture

The project follows a clean layered architecture:

1. **Application Layer** (`application/`)
   - Controllers: Handle HTTP requests
   - Services: Business logic

2. **Domain Layer** (`domain/`)
   - Repository interfaces: Define data access contracts

3. **Infrastructure Layer** (`infrastructure/`)
   - Prisma repositories: Implement data access

4. **Middleware Layer**
   - Request validation
   - Error handling
   - Authentication

### Design Patterns

- **Repository Pattern**: Abstract data access logic
- **Dependency Injection**: Loose coupling between layers
- **DTO (Data Transfer Objects)**: Validate and transform data
- **Service Layer**: Encapsulate business logic
- **Custom Exceptions**: Standardized error handling

## 🛠️ Available Scripts

```bash
# Development
pnpm dev              # Start development server with hot reload

# Build
pnpm build            # Compile TypeScript to JavaScript

# Production
pnpm start            # Run compiled application

# Testing
pnpm test             # Run tests (not yet configured)

# Database
pnpm prisma studio   # Open Prisma Studio (visual DB browser)
pnpm prisma migrate dev  # Create and run migrations
pnpm prisma generate # Generate Prisma client
```

## 🗄️ Database

### Technologies
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Migrations**: Prisma Migrate

### Entity Relationships

- **User**: Core user account
- **OwnerRegistration**: Stadium owner registration details
- **UserRole**: Enum defining user roles (ADMIN, USER, OWNER)

### Running Migrations

```bash
# Create new migration
pnpm prisma migrate dev --name <migration_name>

# Apply pending migrations (production)
pnpm prisma migrate deploy

# Reset database (development only)
pnpm prisma migrate reset
```

## 🐳 Docker Setup

### Build and Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services
- **Backend**: Express API (Port 3000)
- **PostgreSQL**: Database (Port 5432)

### Environment Configuration
Update `.env` file for Docker:
```env
DATABASE_URL=postgresql://postgres:password@db:5432/football_db
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in project root:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/football_db

# JWT
JWT_SECRET=your_very_secret_key_change_this_in_production
JWT_EXPIRY=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
FACEBOOK_CLIENT_ID=your_facebook_client_id
FACEBOOK_CLIENT_SECRET=your_facebook_client_secret
```

## 📚 Dependencies

### Core Dependencies
- **express**: Web framework
- **prisma**: ORM and database toolkit
- **jsonwebtoken**: JWT authentication
- **bcryptjs**: Password hashing
- **class-validator**: DTO validation
- **cors**: Cross-origin resource sharing
- **cookie-parser**: Cookie parsing middleware
- **passport**: Authentication middleware

### Dev Dependencies
- **typescript**: Type safety
- **nodemon**: Development server auto-reload
- **ts-node**: Execute TypeScript directly
- **tsconfig-paths**: Path aliases support

## 🚦 Error Handling

The project uses custom exception classes for standardized error handling:

- **BadRequestException**: Invalid input (400)
- **UnauthorizedException**: Authentication failed (401)
- **ForbiddenException**: Access denied (403)
- **NotFoundException**: Resource not found (404)
- **InternalServerException**: Server errors (500)

## 🔒 Security

### Best Practices Implemented

1. **Password Security**
   - Passwords hashed with bcryptjs (10 salt rounds)
   - Minimum 8 characters enforced

2. **Authentication**
   - JWT tokens for stateless authentication
   - Configurable token expiry
   - Cookie-based token storage

3. **Input Validation**
   - DTO validation using class-validator
   - Email format validation
   - Phone number regex validation
   - Required field checks

4. **CORS**
   - Cross-origin requests restricted to configured origins
   - Credentials validation

## 🧪 Testing

Testing infrastructure is not yet configured. To set up:

```bash
pnpm add -D jest @types/jest ts-jest
pnpm add -D @testing-library/node
```

## 📝 Logging

Logging setup is recommended for production. Consider integrating:
- **Winston**: Comprehensive logging library
- **Morgan**: HTTP request logger
- **Pino**: Fast JSON logger

## 🔄 Git Workflow

- **Main branch**: Production-ready code
- **Dev branch**: Development work
- **Feature branches**: Individual features (from dev)

Commit message format:
```
type(scope): brief description

Example: feat(auth): add owner registration validation
```

## 🤝 Contributing

1. Create feature branch from `dev`
2. Make changes with meaningful commits
3. Push to remote and create pull request
4. Request review before merging

## 📄 License

ISC

## 📧 Support

For issues and questions, please contact the development team.

---

**Last Updated**: 2026-06-06
**Node Version**: 18+
**pnpm Version**: Latest
