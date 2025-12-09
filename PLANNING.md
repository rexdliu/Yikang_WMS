# Welcome to your Lovable project

## Project info

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:
t### Frontend
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

### Backend
- FastAPI (Python)
- SQLAlchemy ORM
- PostgreSQL/SQLite
- Redis (for caching and Celery)
- Celery (for asynchronous tasks)
- JWT/OAuth2 (for authentication)
- Alembic (for database migrations)
- OpenAI API (for AI features)

Frontend dependencies installed:
1. frontend HTTP client : npm install axios
2. AI移动和调整大小: npm install framer-motion

Backend dependencies installed:
1. FastAPI framework: pip install fastapi
2. Database ORM: pip install sqlalchemy
3. Database migration: pip install alembic
4. Authentication: pip install python-jose cryptography passlib
5. Asynchronous tasks: pip install celery redis
6. AI integration: pip install openai langchain chromadb

## Backend Architecture Plan

### Microservices Design
The backend is structured as a collection of microservices that can be independently developed, deployed, and scaled:

1. **API Gateway Service** - Kong/Express Gateway
   - Centralized entry point for all client requests
   - Request routing, composition, and protocol translation
   - Rate limiting and security enforcement

2. **Authentication Service**
   - JWT/OAuth2 based authentication
   - User session management
   - Role-based access control (RBAC)

3. **Product Management Service**
   - Product information management
   - Product categorization
   - Product attribute configuration

4. **Inventory Service**
   - Real-time inventory tracking
   - Inventory movement logging
   - Low stock alerts

5. **Warehouse Operations Service**
   - Inbound and outbound operations
   - Location and bin management
   - Picking and packing workflows

6. **AI/RAG Service**
   - Intelligent query interface
   - Document retrieval and augmentation
   - Predictive analytics

7. **Analytics Service**
   - Sales data analysis
   - Inventory turnover metrics
   - Business intelligence reporting

8. **Notification Service**
   - Real-time messaging (WebSocket)
   - Email notifications
   - SMS alerts

### Data Flow
1. Client requests are routed through the API Gateway
2. Authentication service validates and authorizes requests
3. Requests are forwarded to appropriate microservices
4. Services communicate through well-defined APIs
5. Data is persisted in the database
6. Asynchronous tasks are handled by Celery workers
7. Notifications are sent via the notification service

### Deployment Strategy
- Containerize services using Docker
- Orchestrate with Docker Compose or Kubernetes
- Use environment-specific configuration files
- Implement CI/CD pipelines for automated deployment
- Monitor services with appropriate logging and metrics