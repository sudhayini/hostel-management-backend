# Hostel Management System — Backend

A Hostel Management System backend built using **Node.js, Express.js, MongoDB Atlas, and Mongoose**.

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
- Twilio (planned SMS notification enhancement)

## Features

- Authentication and Authorization
- Role-Based Access Control (Admin, Staff, Resident)
- Resident Management
- Automatic Resident Login Account Creation
- Room Management
- Room Allocation
- Maintenance Request Management
- Billing Management
- Payment Management
- Two-Installment Payment Plans
- Automatic Late Fees
- Expense Management
- Financial Reports
- In-App Notifications and Alerts
- Email Notifications for Pending Payments
- Email Payment Confirmation
- MongoDB Database Backup

## Notifications and Alerts

The system includes an in-app notification feature to keep residents  informed about important hostel activities.

### In-App Notifications

- Notifications displayed within the application.
- Overdue payment alerts.
- Upcoming payment due date reminders.
- Maintenance request notifications.
- General announcements and messages.
- Notifications stored in MongoDB.
- Role-based notification access.

### Email Notifications

The backend uses **Nodemailer** to send email notifications to residents.

Implemented email notification features include:

- **Pending Payment Emails:** Residents receive email reminders about outstanding payments.
- **Payment Confirmation Emails:** Residents receive an email confirmation after successfully recorded payments.
- Email notifications use the configured email service.

### Future Enhancement

- **Twilio SMS Notifications:** SMS alerts for payment reminders, overdue bills, maintenance updates, and other important announcements will be implemented in a future update.

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

### 1. Clone the Repository

```bash
git clone https://github.com/sudhayini/hostel-management-backend.git
```

### 2. Navigate to the Backend Directory

```bash
cd hostel-management-backend
```

### 3. Install Dependencies

```bash
npm install
```

## Environment Variables

Create a `.env` file in the backend directory and configure the following variables:

```env
PORT=5000

MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

INITIAL_RESIDENT_PASSWORD=your_initial_resident_password

EMAIL_USER=your_email_address
EMAIL_APP_PASSWORD=your_email_app_password

TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

**Note:** Replace the example values with your actual credentials. Never upload your `.env` file or expose passwords, API keys, or secret credentials on GitHub.

`INITIAL_RESIDENT_PASSWORD` is used as the initial login password when creating resident accounts.

## Run Locally

Start the development server:

```bash
npm run dev
```

The backend normally runs at:

```text
http://localhost:5000
```

## API Base URL

**Production:**

```text
https://hostelmanagementsystemapp.onrender.com/api
```

**Local:**

```text
http://localhost:5000/api
```

## Payment Management

The application supports:

- Recording resident payments.
- Tracking payment status.
- Managing outstanding balances.
- Creating two-installment payment plans.
- Applying automatic late fees.
- Simulated resident payment checkout.

**Note:** A real online payment gateway has not yet been integrated. The simulated payment checkout is intended for project demonstration and does not process real financial transactions.

## Email Notification Service

The backend uses **Nodemailer** to support email communication with residents.

Email notifications include:

- Pending payment reminders when residents have outstanding balances.
- Payment confirmation emails after successful payment recording.

Email delivery depends on the configured email credentials and service availability.

## Database Backup

MongoDB database backups are configured using MongoDB Database Tools and PowerShell scripts.

Windows Task Scheduler is used to run automatic database backups daily.

Backup files are saved in the configured backup folder.

## SMS Notifications — Future Enhancement

Twilio SMS notifications are planned as a future enhancement.

The backend includes an SMS service and a test script for testing Twilio configuration. Actual SMS delivery is not currently considered a completed feature.

## Deployment

- **Backend:** Render
- **Database:** MongoDB Atlas
- **Frontend:** Netlify

## Related Repository

[Hostel Management System — Frontend](https://github.com/sudhayini/hostel-management-frontend)

## Author

**Salai Sudhayini**

Hostel Management System — Full Stack Project