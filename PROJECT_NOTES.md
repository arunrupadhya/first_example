# Project Notes

## Purpose
This project appears to be a candidate hiring and assessment platform.

Primary flow:
1. Internal users register/login with JWT authentication.
2. HR or Practice users access the dashboard.
3. Candidates register with personal details, documents, and selected tech stacks.
4. Candidates upload a photo and a video.
5. Identity verification is performed.
6. An AI-generated technical assessment is created and submitted.
7. Internal users can review reports and candidate profiles.

## Tech Stack
### Backend
- Java 17
- Spring Boot 3.2
- Spring Security
- Spring Data JPA
- Mail integration
- JWT authentication

### Frontend
- React 18
- TypeScript
- Vite
- Material UI
- React Router
- Zustand for auth state

### External integrations
- PostgreSQL / H2 fallback for development or tests
- AWS S3 for file storage
- Local JavaCV/OpenCV-style vision analysis for identity checks
- Local Ollama-based AI generation and evaluation
- Gmail OAuth2 / SMTP for email sending

## Key Structure
- `src/main/java/com/example/backend` -> backend controllers, services, repositories, models
- `src/main/resources` -> application config, schema, bundled static app
- `frontend/src/components` -> UI screens and flows
- `frontend/src/store` -> auth and assessment state

## Main Frontend Routes
- `/login` -> user login
- `/register` -> internal user registration
- `/dashboard` -> protected dashboard
- `/send-email` -> protected internal email flow
- `/candidate-register` -> candidate registration form
- `/candidate-photo/:id` -> candidate photo upload
- `/candidate-video/:id` -> candidate video upload
- `/identity-verification/:id` -> candidate identity verification
- `/candidate-assessment/:id` -> candidate assessment
- `/assessment-report/:id` -> protected assessment report view
- `/candidate-profile/:id` -> protected candidate profile

## Main Backend APIs
- `/api/auth/*` -> login and registration
- `/api/dashboard` -> protected dashboard data
- `/api/candidates` -> candidate listing
- `/api/candidate-registration/*` -> candidate onboarding, photo, video upload
- `/api/candidate/send-email` -> email-related actions
- `/api/identity-verification/*` -> question, verify, results
- `/api/assessment/*` -> generate, pre-generate, submit, report
- `/api/photo/*` -> user photo handling

## Build and Run Notes
### Backend only
- Windows: `mvnw.cmd spring-boot:run`
- Test without frontend rebuild: `mvnw.cmd test -Dskip.frontend.build=true`

### Frontend only
- `cd frontend`
- `npm install`
- `npm run dev`

### Integrated build behavior
The Maven build is configured to run frontend npm install and frontend build during `generate-resources`, then copy the frontend output into Spring Boot static resources.

## Important Behavior Notes
- Protected frontend routes depend on auth token presence.
- Role compatibility uses both `role` and `userRole` values in local storage.
- Dashboard behavior changes for `HR` and `PRACTICE` users.
- Assessment generation is asynchronous and can be pre-generated before the candidate begins.

## Known Risks / Cleanup Items
- Sensitive configuration should be fully externalized to environment variables or a secret manager.
- Local AI features now expect an Ollama runtime if you want live generative responses; otherwise the app uses built-in fallback logic.
- AWS, mail, and database integrations are core dependencies, so local setup may need valid credentials unless fallback settings are used.
- The `target` folder contains build artifacts and should not be used as the source of truth.

## Suggested Next Reference Updates
If needed later, this file can be extended with:
- database schema notes
- entity relationships
- API request/response samples
- deployment steps
- bug history / troubleshooting notes
