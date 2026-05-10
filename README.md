# Skill Swap - Skill Exchange Platform

Skill Swap is a modern, professional platform designed to facilitate skill exchange between users. It allows students to learn from mentors through a system of points and hours, featuring real-time communication, a store for purchasing vouchers and hours, and a robust admin dashboard for platform management.

## Live Demo & Documentation

- **Production URL:** [https://skill-swaapp.vercel.app/](https://skill-swaapp.vercel.app/)
- **API Documentation (Swagger):** [https://skill-swaapp.vercel.app/api-docs](https://skill-swaapp.vercel.app/api-docs)

---

## Features

### For Users

- **Skill Exchange:** Request and book sessions with mentors based on skills.
- **Points System:** Earn and spend points for learning and teaching.
- **Real-time Chat:** Seamless communication with mentors/students via Socket.io.
- **Store:** Purchase hours, vouchers, and custom themes using earned points.
- **Notifications:** Real-time push notifications for session updates and messages.

### For Admins

- **User Management:** Monitor, warn, block/unblock, and manage user roles.
- **Track & Skill Management:** Create and organize learning paths and specific skills.
- **Session Logs:** Complete history of all skill-exchange sessions.
- **Dashboard Analytics:** Visualized stats for users, revenue, and distribution.
- **Reporting System:** Handle community reports efficiently.

---

## Technology Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Mongoose)
- **Real-time:** Pusher
- **Payments:** Stripe Integration
- **File Storage:** Cloudinary
- **Documentation:** Swagger (OpenAPI 3.0)

---

## Local Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd skill-swap-main
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the following:

   ```env
   PORT=5000
   DB_URL=your_mongodb_uri
   BEARER_KEY=skill-swap
   TOKEN_SIGNATURE=your_secret_key
   SALT_ROUND=10
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   STRIPE_KEY=your_stripe_key
   EMAIL=your_email
   EMAIL_PASSWORD=your_email_password
   ```

4. **Run the application:**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

---

## API Documentation

The project uses Swagger for comprehensive API documentation. Once the server is running, you can access it at:
`http://localhost:5000/api-docs`

Or visit the production documentation:
[https://skill-swaapp.vercel.app/api-docs](https://skill-swaapp.vercel.app/api-docs)

### How to use Swagger:

1. Navigate to the `/api-docs` URL.
2. For protected routes, click the **"Authorize"** button and enter your Bearer token: `skill-swap <your_token>`.
3. Explore the available endpoints for Auth, Users, Admin, Chat, and more.

---

## Professional Standards

- Clean and maintainable code architecture.
- Professional error handling and validation.
- Secure authentication system with multi-session prevention.
