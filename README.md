# fsh_lab_scheduler
Prototype Development of Laboratory Scheduler Web-App in Fidelis Senior High | STEM 12 Gen-A (Group 2)

---

## Overview

  The Laboratory Scheduler Web-App is a prototype system developed for Fidelis Senior High to streamline the management of school laboratories. It provides real-time room occupancy, digital reservation of lab rooms, and admin-controlled approval systems, all designed to reduce scheduling conflicts and improve efficiency for students, teachers, and school management.

---

## Development Team
**Prototype Development**
  - Prince Jorick Fajutagana – UI/UX, Frontend, Backend
  - Mark Miel Betonio – Frontend, Backend
  - Will Jairuz Amado – Frontend, Backend

**Research Paper Team**
  - Arianne Solano
  - Eugene Christ Garcia
  - Carl Daniel
  - Gian Tuiza
  - Sophie Gonzales

  ---

  ## **System Planning**
### **Core Idea**
A web application that:
- Displays **live occupancy** of laboratory rooms
- Manages and approves **teacher reservation requests**
- Provides easy access for students, faculty, and management
    
### **Users**
- Admins
- Teachers / Faculty
- Students
    

### **Key Features**
- Account password change
- Push notifications
- Real-time laboratory occupancy (Supabase Realtime)
- Room reservation by teachers
- Admin approval system for reservations
- Reservation history (per semester or all-time)
- Light mode / Dark mode
- Hardware integration options: **camera / sensor / infrared device** for occupancy detection
    
---

## **UI/UX Design**

Designed using **Figma**.
### **Pages**
- Login Page
- Account Types:
    - **Admin**
        - NFC/RFID Keycard Authentication
    - **User (Teacher/Student)**
- Admin Dashboard
- User Home Page
- Laboratory Room Pages (4 rooms)
- Account Settings
    
---

## **Programming & Tech Stack**
### **Frontend** (Hosted on Vercel)
- HTML
- CSS
- JavaScript
- **Next.js**
- **Tailwind CSS**

### **Backend** (Hosted on Render)
- **Python (FastAPI)**
- API endpoints for authentication, reservations, admin actions, and real-time updates

### **Database**
- **Supabase**
    - Authentication
    - Table storage
    - Realtime features (room occupancy + notifications)

---

## **Requirements**
- VS Code
- Git
- GitHub CLI
- Python
- Node.js (for Next.js)
- Supabase CLI (optional but recommended)
