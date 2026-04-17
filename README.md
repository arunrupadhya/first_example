# Spring Boot React Full-Stack Application

This is a full-stack application with Spring Boot backend and React frontend, featuring authentication and authorization.

## Prerequisites

- Java 17 or newer JDK
- `JAVA_HOME` configured for your JDK
- Node.js and npm for the frontend
- Maven (included via Maven Wrapper)

## Configuration

The application now reads sensitive settings from environment variables instead of hardcoded values.

Common variables:

- `SPRING_DATASOURCE_URL`, `DB_USERNAME`, `DB_PASSWORD`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME`
- `JWT_SECRET`
- `MAIL_USERNAME`, `MAIL_PASSWORD`
- `GOOGLE_OAUTH2_CLIENT_ID`, `GOOGLE_OAUTH2_CLIENT_SECRET`, `GOOGLE_OAUTH2_REFRESH_TOKEN`

If no database variables are provided, the backend falls back to an in-memory H2 database for local development and testing.

## Backend

- Spring Boot 3.x
- Spring Security with JWT
- H2 Database
- JPA

## Frontend

- React 18
- Vite
- React Router
- Axios
- Material-UI (MUI)

## Features

- User registration and login
- JWT-based authentication
- Protected routes
- CORS enabled
- Frontend integrated into Spring Boot JAR for easy deployment

## Running the Application

### Development Mode (Separate)

1. **Backend**: Navigate to the root directory and run `mvnw.cmd spring-boot:run` on Windows or `./mvnw spring-boot:run` on macOS/Linux
2. **Frontend**: Navigate to the `frontend` directory, run `npm install`, then `npm run dev` (or `npm.cmd run dev` on Windows PowerShell if script policy blocks npm)

### Production Mode (Integrated)

1. Navigate to the root directory
2. Run `mvnw.cmd clean install` on Windows or `./mvnw clean install` on macOS/Linux
3. Run `mvnw.cmd spring-boot:run` or `./mvnw spring-boot:run`

The application runs on http://localhost:8080, with frontend served from static resources.

## API Endpoints

- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login and get JWT token and role
- GET `/api/dashboard` - Protected dashboard endpoint
- GET `/api/candidates` - Candidate list for HR and Practice roles
- POST `/api/identity-verification/{candidateId}/verify` - Submit identity verification