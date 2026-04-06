# Speak-it-Native
Speak it is going Mobile! Using React Native

Speak-It Mobile is a production iOS application built with React Native and Expo, extending the Speak-It platform to mobile devices.

📱 App Store: https://apps.apple.com/us/app/speak-it/id6748719689

Overview

Speak-It is a cross-platform application consisting of:

A React Native mobile app (this repository)
A React web application (hosted on Vercel)
A shared backend powered by Supabase

The app allows users to create and interact with short-form content, with data synchronized across both web and mobile platforms.

Features
Create and view posts
Mobile-optimized UI and navigation
Shared data layer with web application
Real-time or near real-time updates via Supabase
Cross-platform consistency (web + mobile)
Tech Stack
React Native (Expo)
JavaScript (ES6+)
Supabase (PostgreSQL + REST API)
iOS deployment via Apple App Store
Architecture
Mobile frontend built with React Native (Expo)
Web frontend built with React (separate repo)
Shared Supabase backend
REST API consumed by both clients

This architecture enables a single data source while supporting platform-specific user experiences.

Key Learnings
Building and maintaining a cross-platform application
Structuring API calls and data flow with Supabase
Handling differences between mobile and web UI
Deploying and maintaining a live app via the App Store


Getting Started
CD -> speakIt-Mobile
npm install
npx expo start
Related Project

🌐 Speak-It Web (React): https://speak-it-three.vercel.app/

Author

Amir Nasser