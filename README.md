# Hostel Management System — Backend

A Hostel Management System backend built using Node.js, Express.js, MongoDB Atlas, and Mongoose.

The backend provides REST APIs for managing hostel operations with role-based access for Admin, Staff, and Resident users.

## Live Backend

[Hostel Management System Backend](https://hostelmanagementsystemapp.onrender.com/)

## GitHub Repository

[Backend Repository](https://github.com/sudhayini/hostel-management-backend)

## Technologies Used

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- bcryptjs
- CORS
- dotenv
- Nodemailer
- Twilio

## Features

- Authentication and Authorization
- Resident Management
- Room Management
- Maintenance Management
- Billing Management
- Payment Management
- Two-Installment Payment Plans
- Automatic Late Fees
- Expense Management
- Financial Reports
- In-App Notifications
- Email Service
- SMS Service Integration
- MongoDB Database Backup

## Project Structure

```text
backend/
├── middleware/
├── models/
├── routes/
├── services/
│   ├── emailService.js
│   └── smsService.js
├── .env
├── .gitignore
├── package.json
├── package-lock.json
├── server.js
├── test-sms.js
└── README.md
```

## Installation

Clone the repository:

```bash
git clone https://github.com/sudhayini/hostel-management-backend.git
```

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file in the backend directory.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

EMAIL_USER=your_email_address
EMAIL_APP_PASSWORD=your_email_app_password

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```


## Run Locally

Start the development server:

```bash
npm run dev
```

The backend normally runs at:

`http://localhost:5000`

## API Base URL

Production:

[https://hostelmanagementsystemapp.onrender.com/api](https://hostelmanagementsystemapp.onrender.com)

Local:

`http://localhost:5000`

## Payment Gateway

The application supports payment recording, installment payments, and a simulated resident payment checkout.

**Note:** A real online payment gateway has not yet been integrated. The mock payment checkout is intended for project demonstration and does not process real payments.

## SMS Testing

The `test-sms.js` file is used to test the Twilio SMS service.

Run the test using:

```bash
node test-sms.js
```

SMS delivery depends on the Twilio account configuration.

## Database Backup

MongoDB database backups are configured using MongoDB Database Tools and PowerShell scripts.

Windows Task Scheduler is used to schedule automatic backups.

## Deployment

- Backend: Render
- Database: MongoDB Atlas
- Frontend: Netlify

## Related Repository

[Hostel Management System Frontend](https://github.com/sudhayini/hostel-management-frontend)

## Author

**Salai Sudhayini**

Hostel Management System — Full Stack Project
