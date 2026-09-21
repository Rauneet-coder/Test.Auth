# Test.Auth

Authentication service built with Node.js, Express, MongoDB, and JSON Web Tokens.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB via Mongoose
- **Authentication:** JWT (jsonwebtoken) & bcrypt
- **Development:** Nodemon, Morgan

## Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Rauneet-coder/Test.Auth.git
cd Test.Auth
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Copy `.env.example` to `.env` and fill in your credentials:
```bash
cp .env.example .env
```

Set the following variables in `.env`:
- `PORT` (default: 3000)
- `MONGO_URL` (your MongoDB connection string)
- `JWT_SECRET` (secret key for signing auth tokens)

### 4. Run the server
```bash
npm run dev
```

## API Endpoints

### Register User
`POST /api/auth/register`

**Request Body:**
```json
{
  "username": "exampleUser",
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered successfully",
  "user": {
    "username": "exampleUser",
    "email": "user@example.com"
  },
  "token": "<jwt_token>"
}
```
