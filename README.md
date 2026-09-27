# Hostel Management System — Backend

A full-stack Hostel Management System backend built using Node.js, Express, MongoDB, and Mongoose.

The backend provides secure REST APIs for authentication, residents, rooms, maintenance, billing, payments, notifications, and staff management.

## Live Backend

**Render:**
https://hostelmanagementsystemapp.onrender.com/

## 💻 Source Code

**GitHub:**
https://github.com/sudhayini/hostel-management-backend

---

##  Technologies Used

* Node.js
* Express.js
* MongoDB
* MongoDB Atlas
* Mongoose
* JWT Authentication
* bcryptjs
* CORS
* dotenv
* Nodemon

---

##  Project Structure

backend/
├── middleware/
│   ├── authmiddleware.js
│   └── roleMiddleware.js
│
├── models/
│   ├── billing.js
│   ├── maintenance.js
│   ├── Resident.js
│   ├── Room.js
│   ├── user.js
│   ├── notification.js
│   └── payment.js
│
├── routes/
│   ├── authRoutes.js
│   ├── billingRoutes.js
│   ├── maintenanceRoutes.js
│   ├── residentRoutes.js
│   ├── roomRoutes.js
│   ├── notificationRoutes.js
│   └── paymentRoutes.js
│
├── .env
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

---

##  Features

###  Authentication

* User registration and login
* JWT authentication
* Password hashing using bcrypt
* Role-based access control

###  Resident Management

* Add residents
* View residents
* Edit resident details
* Check-out residents
* Delete residents
* Emergency contact information
* Automatic resident login account creation

###  Room Management

* Add rooms
* View rooms
* Edit rooms
* Delete rooms
* Room allocation
* Occupancy management
* Room availability

###  Maintenance

* Create maintenance requests
* Set priority
* Track maintenance status
* Assign maintenance requests to staff
* Staff assignment notifications

###  Billing

* Create resident bills
* Track pending payments
* Track overdue payments
* Due dates
* Billing notifications

###  Payments

* Record payments
* Payment methods:

  * Cash
  * UPI
  * Card
  * Bank Transfer
* Transaction ID
* Payment history

###  Notifications

* General notifications
* Maintenance assignment notifications
* Pending payment notifications
* Overdue notifications
* Read/unread notification status

###  Staff Management

* Add staff
* View staff
* Edit staff
* Delete staff
* Staff role management

---

##  User Roles

| Feature          | Admin | Staff | Resident |
| ---------------- | ----- | ----- | -------- |
| Dashboard        | yes   | yes   | yes      |
| View Residents   | yes   | yes   | no       |
| Add Resident     | yes   | yes   | no       |
| Edit Resident    | yes   | yes   | no       |
| Delete Resident  | yes   | no    | no       |
| Manage Rooms     | yes   | no    | no       |
| Maintenance      | yes   | yes   | yes      |
| Billing          | yes   | yes   | no       |
| Payments         | yes   | yes   | no       |
| Staff Management | yes   | no    | no       |
| Reports          | yes   | no    | no       |

---

##  Default Resident Password

When a resident account is created, the default password is:

```text
Resident@123(same for all- email only change)
```

For production use, this should ideally be replaced with a password-reset flow.

---

##  Installation

Clone the repository:

```bash
git clone https://github.com/sudhayini/hostel-management-backend.git

```

Enter the backend folder:

```bash
cd hostel-management-backend
```

Install dependencies:

```bash
npm install
```

---

##  Environment Variables

Create a `.env` file:

```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

##  Run Locally

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

The backend runs on:

```text
http://localhost:5000
```

---

##  API Base URL

Production:

```text
https://hostelmanagementsystemapp.onrender.com/api
```

---

##  Main API Routes

```text
/api/auth
/api/residents
/api/rooms
/api/maintenance
/api/billing
/api/payments
/api/notifications
```

---

## Security

The backend uses:

* JWT authentication
* Password hashing
* Role-based authorization
* Protected API routes
* Environment variables for sensitive credentials
* CORS configuration

---

##  Deployment

The backend is deployed using **Render**.

MongoDB database is hosted using **MongoDB Atlas**.

---

##  Author

**Sudhayini**

Hostel Management System — Full Stack Project

````