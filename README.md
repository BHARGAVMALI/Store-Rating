# Store Rating App

A full-stack web application for rating stores, managing users, and reviewing store feedback. It was built for the FullStack Intern Coding Challenge with role-based access for administrators, normal users, and store owners.

## Tech Stack

- Frontend: React, Vite, lucide-react
- Backend: Node.js, Express
- Database: MySQL
- Authentication: JWT
- Password hashing: bcryptjs

## Features

- Register and sign in as a normal user
- JWT-based authentication and role-based authorization
- System Administrator dashboard with total users, stores, and ratings
- Admin user management with search, sorting, filtering, and role assignment
- Admin store management with owner assignment, descriptions, and optional latitude/longitude
- Normal user store discovery with ratings, search, rating filters, and distance sorting when location is available
- Store detail pages with customer reviews
- Create or update a 1 to 5 star rating with optional written feedback
- Store Owner dashboard showing assigned stores and customer submissions
- Password update flow for all authenticated users
- Automatic MySQL database/table initialization on backend startup
- Demo data seeding script for local testing

## Prerequisites

- Node.js LTS
- MySQL Server 8.x
- npm

MySQL Workbench is optional. The application only requires MySQL Server to be running.

## Environment Setup

Backend:

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and set your MySQL credentials:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=store_rating_db
JWT_SECRET=replace_with_a_long_random_secret
```

Frontend:

```powershell
cd frontend
Copy-Item .env.example .env
```

The default frontend API URL is:

```env
VITE_API_URL=http://localhost:5000/api
```

## Run Locally

Start the backend:

```powershell
cd backend
npm install
npm run dev
```

The backend will create the `store_rating_db` database and required tables automatically.

Backend URL: `http://localhost:5000`

Health check: `http://localhost:5000/api/health`

Start the frontend in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`.

## Initial Admin

On first backend startup, an admin account is created if it does not already exist.

- Email: `admin@storerating.local`
- Password: `Admin@123`

You can change these values in `backend/.env` before the first backend run:

```env
ADMIN_NAME=System Administrator
ADMIN_EMAIL=admin@storerating.local
ADMIN_PASSWORD=Admin@123
```

For real deployment, change `JWT_SECRET` and the default admin password.

## Seed Demo Data

After the backend environment is configured, you can create fictional demo users, stores, and ratings:

```powershell
cd backend
node seed-demo.js
```

Demo accounts created by the script use this password:

```text
Demo@123
```

Existing accounts are not reset by the seed script.

## Project Structure

```text
store-rating-app/
  backend/
    db.js
    middleware.js
    seed-demo.js
    server.js
    validation.js
    .env.example
  database/
    schema.sql
  frontend/
    src/
      api.js
      App.jsx
      main.jsx
      styles.css
    .env.example
```

## Validation Rules

- User names must be 20 to 60 characters.
- Addresses can be up to 400 characters.
- Passwords must be 8 to 16 characters.
- Passwords must include at least one uppercase letter and one special character.
- Ratings must be whole numbers from 1 to 5.

## Notes

- Do not commit real `.env` files.
- Commit `.env.example` files so other developers know which variables are required.
- The database schema is initialized by the backend; `database/schema.sql` is included as a reference.
