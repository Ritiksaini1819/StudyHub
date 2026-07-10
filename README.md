# StudyHub AI

StudyHub AI is an educational platform. It helps teachers manage study materials and students access them. The application gives an organized and secure environment. Teachers can upload resources. Students can easily browse, search and study them from anywhere.

The project was developed with scalability, performance and simplicity in mind. StudyHub focuses on creating a learning experience. It uses content management and role-based access.

# Features

# Teacher Dashboard

* Secure Teacher Authentication

* Add and manage Subjects

* Create Units under each Subject

* Upload Study Materials

* Upload PDF Notes

* Add. Solutions

* Edit and Delete Content

* Cloud Storage, for Files

* Simple and Clean Dashboard

* Fast Content Management

# Student Dashboard

* Secure Student Login

* View Teacher Uploaded Subjects

* Create Subjects (Private)

* Browse Units

* Read Study Material

* Download PDF Notes

* View Questions & Solutions

* Clean User Interface

* Responsive Design

# Authentication

StudyHub uses **Supabase Authentication**. It provides login and account management.

Authentication includes:

* Google Sign-In

* Email Authentication

* Protected Routes

* Role Based Access

* Session Persistence

* Secure Authentication Flow

# Content Management

Teachers organize content. The hierarchy is:

Subject

→ Unit

→ Study Material

→ Questions

→ Solutions

→ PDF Notes

This organization helps students navigate study resources.

# File Storage

StudyHub integrates **Supabase Storage**. It stores resources.

Supported file types:

* PDF Notes

* Documents

* Images

Uploaded files are securely stored. Authorized users can access them.

# User Interface

The application has an minimal interface.

Features:

* Responsive Layout

* Mobile Friendly

* Clean Navigation

* Fast Loading

* Smooth User Experience

* Easy Content Browsing

# Tech Stack

### Frontend

* React

* TypeScript

* Vite

* React Router

* Lucide React

# Backend / Services

* Supabase Authentication

* Supabase Database

* Supabase Storage

# Styling

* Tailwind CSS

* Custom Components

# Deployment

* Vercel

# Project Structure

```

StudyHub

│

├── src

│   ├── components

│   ├── pages

│   ├── hooks

│   ├── contexts

│   ├── lib

│   ├── services

│   └─ assets

│

├── public

├── supabase

├── package.json

└── vite.config.ts

```

# Getting Started

Clone the repository

```bash

git clone https://github.com/Ritiksaini1819/StudyHub.git

```

Move into the project

```bash

cd StudyHub

```

Install dependencies

```bash

npm install

```

Create a `.env` file

```env

VITE_SUPABASE_URL=YOUR_SUPABASE_URL

VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_KEY

```

Run the development server

```bash

npm run dev

```

Build for production

```bash

npm run build

```

## 🔐 Environment Variables

Required environment variables:

```env

VITE_SUPABASE_PUBLISHABLE_KEY=

```

# Highlights

* Role Based Authentication

* Secure Cloud Storage

* Organized Subject Management

* Student & Teacher Dashboards

* Ui

* Modern React Architecture

* Performance

* Scalable Project Structure

# Future Improvements

Some features planned:

* AI-powered study assistant

* Smart search

* Bookmarks

* Dark Mode

* Notifications

* Attendance Management

* Assignment Module

* Progress Tracking

* Collaborative Learning

* Notes Sharing

* Calendar Integration

* Offline Support

## 📸 Screenshots

Add screenshots here.

# Contributing

Contributions are welcome.

If you'd like to improve StudyHub:

1. Fork the repository

2. Create a feature branch

3. Commit your changes

4. Push the branch

5. Open a Request

## 📄 License

This project is released under the MIT License.

## 👨‍💻 Developer

**Ritik Saini**

If you like StudyHub AI consider giving it a ⭐ on GitHub. It helps support development.
