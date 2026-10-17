# Hostel Management System — Backend

A full-stack Hostel Management System backend built using Node.js, Express.js, MongoDB Atlas, and Mongoose.

The backend provides REST APIs for authentication, resident management, room management, maintenance requests, billing, payments, notifications, and staff management.

## Live Backend

https://hostelmanagementsystemapp.onrender.com/

## Source Code

https://github.com/sudhayini/hostel-management-backend

## Technologies Used

- Node.js
- Express.js
- MongoDB
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcryptjs
- CORS
- dotenv
- Nodemailer
- Nodemon

## Project Structure

```text
backend/
├── middleware/
│   ├── authmiddleware.js
│   └── roleMiddleware.js
├── models/
│   ├── billing.js
│   ├── maintenance.js
│   ├── Resident.js
│   ├── Room.js
│   ├── user.js
│   ├── notification.js
│   └── payment.js
├── routes/
│   ├── authRoutes.js
│   ├── billingRoutes.js
│   ├── maintenanceRoutes.js
│   ├── residentRoutes.js
│   ├── roomRoutes.js
│   ├── notificationRoutes.js
│   └── paymentRoutes.js
├── services/
│   └── emailService.js
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

## Features

### Authentication and Authorization

- User registration and login
- JWT-based authentication
- Password hashing using bcrypt
- Role-based access control
- Protected API routes

### Resident Management

- Add, view, and update resident information
- Check out residents
- Delete residents according to permissions
- Manage emergency contact information
- Create resident login accounts
- Store check-in and expected check-out dates
- Maintain room allocation history
- Retrieve individual resident profiles

### Room Management

- Create, view, update, and delete rooms
- Manage room allocation
- Track room occupancy
- View room availability
- Retrieve room information from MongoDB

### Maintenance Management

- Create maintenance requests
- Set request priority
- Track maintenance status
- Assign requests to staff, where implemented
- Generate maintenance-related notifications

### Billing Management

- Create and retrieve resident bills
- Track pending and partially paid bills
- Track overdue payments
- Manage billing due dates
- Generate billing notifications

### Payment Management

- Record payment information
- Store supported payment methods, such as cash, UPI, card, and bank transfer
- Track transaction IDs
- Maintain payment history
- Track payment status

**Note:** An online payment gateway has not yet been integrated. Recording payment information is different from processing a real online payment.

### Notifications

- Create and retrieve notifications
- Maintenance assignment notifications
- Pending payment notifications
- Overdue payment notifications
- Read and unread notification status

### Staff Management

- Manage staff records according to permissions
- Manage staff roles and access permissions

### Email Service

- Email functionality through a dedicated email service
- SMTP configuration using environment variables

## User Roles

| Feature          | Admin | Staff | Resident |
|------------------|-------|-------|----------|
| Dashboard        |  Yes  |  Yes  |   Yes    |
| View Residents   |  Yes  |  Yes  |   No     |
| Add Resident     |  Yes  |  Yes  |   No     |
| Edit Resident    |  Yes  |  Yes  |   No     |
| Delete Resident  |  Yes  |  No   |   No     |
| Manage Rooms     |  Yes  |  No   |   No     |
| Maintenance      |  Yes  |  Yes  |   Yes    |
| Billing          |  Yes  |  Yes  |   No     |
| Payments         |  Yes  |  Yes  |   No     |
| Staff Management |  Yes  |  No   |   No     |
| Reports          |  Yes  |  No   |   No     |


## Installation

Clone the repository:

```bash
git clone https://github.com/sudhayini/hostel-management-backend.git
```

Navigate to the repository:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the backend root directory:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email_address
EMAIL_APP_PASSWORD=your_email_app_password
```

**Security:** Never commit real passwords, database connection strings, JWT secrets, email app passwords, or other API secrets to GitHub. Keep `.env` in `.gitignore`.

## Run Locally

Start the development server:

```bash
npm run dev
```

For production mode, if configured in `package.json`:

```bash
npm start
```

The local backend normally runs at:

http://localhost:5000

## API Base URL

Production backend:

https://hostelmanagementsystemapp.onrender.com/

## Main API Routes

 Authentication -    `/api/auth` 
 Residents -        `/api/residents` 
 Rooms  -          `/api/rooms` 
 Maintenance  -   `/api/maintenance` 
 Billing  -       `/api/billing` 
 Payments -       `/api/payments` 
 Notifications  - `/api/notifications` 

The available endpoints and HTTP methods depend on the implemented routes.

## Security

The backend uses or is configured for:

- JWT authentication
- Password hashing
- Role-based authorization
- Protected API routes
- Environment variables for sensitive configuration
- CORS configuration

## Database Backup

A manual MongoDB Atlas database backup was created using MongoDB Database Tools (`mongodump`).

This backup is a separate manual procedure. It is not an automatic backup feature of the application.

## Deployment

- **Backend:** Render
- **Database:** MongoDB Atlas
- **Frontend:** Netlify

Configure production environment variables in the Render dashboard.

## Related Repository

[Hostel Management System Frontend](https://github.com/sudhayini/hostel-management-frontend)

## Author

**Salai Sudhayini**

Hostel Management System — Full Stack Project