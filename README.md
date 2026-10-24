# Laboratory Scheduler Web-app for Fidelis Senior High

A web-based application designed to streamline the management of laboratory resources for **Fidelis Senior High**. This tool provides live occupancy tracking and manages reservations for teachers, management, and students.

## 📖 About the Project

The core mission of this application is to solve scheduling conflicts by providing a platform that visualizes **live occupancy** of laboratory rooms and handles **reservations** efficiently.

**Target Users:**
* Admin
* Management
* Faculty
* Students

---

## ✨ Key Features

The application offers two distinct user experiences:

### 👤 User Features (Teachers/Students)
* **Live Dashboard:** View real-time availability of 4 different laboratory rooms.
* **Reservation System:** Submit reservation requests easily.
* **History Log:** View past reservations.
* **History Log:** View past reservations (filtered by semester or all-time).
* **Notifications:** Receive status updates on requests.
* **Account Management:** Secure login and password settings.

### 🛡️ Admin Features
* **Admin Dashboard:** Centralized view of all lab activities.
* **Request Management:** Authority to **Approve** or **Reject** reservation requests.
* **System Oversight:** Manage user access and settings.

---

## 🛠 Tech Stack

**Frontend**
* ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
* ![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
* ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
* **Hosting:** Vercel

**Backend**
* **Runtime:** Vercel Node.js Functions using the existing reservation API handlers

**Database**
* ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)
* **Provider:** Supabase (Postgres)

**Tools**
* **Design:** Figma
* **IDE:** VS Code
* **Version Control:** Git & GitHub CLI

## Live preview and demo

The site is hosted at [fsh-lab-scheduler.vercel.app](https://fsh-lab-scheduler.vercel.app). Choose **Explore demo** on the entry page to try the teacher and admin journeys without an account. The demo banner switches roles, resets sample reservations, and exits the demo. Demo activity is stored only in that browser's local storage and never writes to Supabase.

The Supabase project is `tjzlglwrjirgtcjjjzku` in Singapore. Its schema is versioned in `supabase/migrations/` with row level security enabled and browser roles denied direct table access. The Vercel API connects through Supabase's transaction pooler using a server-side `DATABASE_URL`.

## Local setup

1. Run `npm install` and `npm run build`.
2. For live API testing, copy `.env.example` to `.env.local` and set `DATABASE_URL` and `JWT_SECRET` privately. Do not commit `.env.local`.
3. Run `vercel dev` for the static app and API together. `npm run check` validates the JavaScript entry points.

The Vercel project already has the database connection and JWT secret for Production and Preview. Email signup and password reset need `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` set in that project. Google sign-in needs the new Vercel domain added to the Google OAuth client's authorized JavaScript origins before enabling the Google button. Web push needs new VAPID keys. The demo works without any of these integrations.

---

## 👥 The Team

### Prototype Development
* **Prince Jorick Fajutagana** - UI/UX, Frontend, Backend
* **Mark Miel Betonio** - Frontend, Backend
* **Will Jairuz Amado** - Frontend, Backend

### Research & Documentation
* Arianne Solano
* Eugene Christ Garcia
* Carl Daniel Platon
* Gian Tuiza
* Sophie Gonzales
