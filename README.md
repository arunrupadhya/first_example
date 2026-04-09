# Spring Boot React Full-Stack Application

This is a full-stack application with Spring Boot backend and React frontend, featuring authentication and authorization.

## Prerequisites

- Java 21 JDK installed at `C:\Users\aramachandra\softwares\jdk21.0.10_7`
- JAVA_HOME environment variable set to the above path
- Maven (included via Maven Wrapper)

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

1. **Backend**: Navigate to the root directory and run `./mvnw spring-boot:run`
2. **Frontend**: Navigate to the `frontend` directory, run `npm install` and `npm run dev`

### Production Mode (Integrated)

1. Navigate to the root directory
2. Run `./mvnw clean install` (builds frontend and backend)
3. Run `./mvnw spring-boot:run` (serves the integrated application)

The application runs on http://localhost:8080, with frontend served from static resources.

## API Endpoints

- POST /auth/register - Register a new user
- POST /auth/login - Login and get JWT token
- GET /api/dashboard - Protected dashboard endpoint