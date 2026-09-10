# 🏨 Harness Frontend

**Harness** is a hotel management system built to help hotel owners **automate operations**, **maximize income**, and **scale customer experience**.

---

## 🚀 What is Harness?

Harness empowers hotel managers to:

- 🛏️ **Manage Rooms, Inventories, Staff, Website**
- 📈 **Track bookings & sales** — view profits **daily, weekly, or monthly**
- 🤖 **Automate room reservations** using an AI agent *(in development)*
- 📢 **Run campaigns** via email & social media — generate content, schedule posts

> Think of Harness as your all-in-one hotel operations & marketing dashboard.

---

## 🗂️ Folder Structure (inside `/src`)

| Folder          | Purpose                                                                 |
|------------------|-------------------------------------------------------------------------|
| `auth/`          | 🔐 Login, Signup, Password Recovery, Profile                            |
| `subscription/`  | 💳 Handles subscription status and plans                                |
| `context/`       | 🌐 Global App Context (theme, user, auth, API endpoint, etc.)           |
| `components/`    | 🧱 UI Views for: Room, Inventory, Inbox, Sale, Booking, Blog, Staff     |
| `crud/`          | 🛠️ Create/Update logic for all above components                         |
| `protectedroute/`| 🚧 Route Guarding (checks for user token before allowing route access)  |

---

## 🧠 Component Function Summary

### 🔐 `auth/`
User authentication flows: login, register, password recovery, and profile setup.

### 🌐 `context/appcontext.js`
Manages global app data using React Context:
- Theme preference (light/dark)
- Auth tokens & user info (`id`, `currency`)
- Subscription state
- API base URL

All data is synced to `localStorage` for persistence.

### 🧱 `components/`
Individual UI views for each hotel module:
- `room/`, `inventory/`, `staff/`, `sale/`, `booking/`, `blog/`, `website/`, `inbox/`, `dashboard/`
- Supports filtering, viewing, and basic interactions

### 🛠️ `crud/`
Contains **create/update** logic for all core components above. Each file directly supports its respective view in `components/`.

### 🚧 `protectedroute/`
Guards private routes. If user token is missing, redirects to login.

---

## 🛠 Tech Stack

- ⚛️ **React** `v18`
- 🧠 **React Context API**
- 🌐 REST API integration
- 🧩 LocalStorage for persistence
- 📦 Axios for HTTP requests

---

## 📅 Upcoming Features

- 🤖 **AI Room Reservation Agent**
- 📧 **Max Campaigns** — intelligent email + social media ads
- 📊 **Advanced Analytics Dashboard**
- 📱 Mobile-first responsive UI

---

## 📸 Screenshots (Coming soon)

---

## 🧪 How to Run Locally

```bash
git clone https://github.com/your-username/harness-frontend.git
cd harness-frontend
npm install
npm start
