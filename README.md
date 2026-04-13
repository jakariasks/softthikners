# Softthikners - University CSE Team Portfolio

Softthikners is a high-performance, university-based CSE student team dedicated to building real-world problem-solving products and services. This application serves as our official digital headquarters, featuring our projects, team members, research, and a collaborative blog platform.

![Softthikners Banner](https://picsum.photos/seed/softthikners/1200/400)

## ✨ Key Features

- **Dynamic Team Profiles**: Interactive 3D flip-cards showcasing team members, their skills, and social links (GitHub, LinkedIn, Twitter, Facebook).
- **Service Showcase**: A modern display of our technological offerings with real-time management for admins.
- **AI-Powered Blog**: A full-featured blog platform with:
  - **AI Image Generation**: Integrated Gemini AI to generate blog cover images from text prompts.
  - **SEO Optimization**: Custom meta titles and descriptions for every post.
  - **Real-time Comments**: Interactive discussion threads with **nested replies** and author notifications.
- **Real-Time Support Chat**: A persistent chat widget with:
  - **Firestore Persistence**: History of the last 50 messages is saved and loaded automatically.
  - **Unread Indicators**: Visual badge on the chat button to notify users of new messages.
  - **Interactive UI**: Smooth animations, sender avatars, and real-time synchronization.
- **Project Portfolio**: Categorized display of our innovative solutions with an enhanced **Search Modal** featuring color-coded results.
- **Admin Dashboard**: Secure portal for managing team members, services, and content.
- **Glassmorphic UI**: A cutting-edge design language using Tailwind CSS and **Framer Motion** for staggered hero animations and smooth, high-end interactions.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/)
- A [Firebase Project](https://console.firebase.google.com/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/softthikners.git
   cd softthikners
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Setup**:
   Create a `.env` file in the root directory. You can use `.env.example` as a template:
   ```env
   # Firebase
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id

   # AI Features
   GEMINI_API_KEY=your_google_ai_studio_key

   # Contact Form
   VITE_EMAILJS_SERVICE_ID=your_service_id
   VITE_EMAILJS_TEMPLATE_ID=your_template_id
   VITE_EMAILJS_PUBLIC_KEY=your_public_key
   ```

### Running the App

To start the development server:
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

### Running with VS Code

1. **Open the Project**: Launch VS Code and open the `softthikners` folder.
2. **Install Recommended Extensions**:
   - **ESLint**: For code linting.
   - **Prettier**: For code formatting.
   - **Tailwind CSS IntelliSense**: For CSS autocomplete.
   - **ES7+ React/Redux/React-Native snippets**: For faster development.
3. **Open Integrated Terminal**: Press ``Ctrl + ` `` (backtick) or go to `Terminal > New Terminal`.
4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
5. **View the App**: Click the link in the terminal (usually `http://localhost:3000`) or open it in your browser.

## 🌐 How to Make This Site Public (Deployment)

To make your site accessible to everyone on the internet, you need to "deploy" it. Here are the best ways to do it:

### 1. Firebase Hosting (Highly Recommended)
Since this app already uses Firebase for Authentication and Database, Hosting is the best choice.

**Steps:**
1. **Install Firebase CLI**:
   ```bash
   npm install -g firebase-tools
   ```
2. **Login and Initialize**:
   ```bash
   firebase login
   firebase init
   ```
   - Select **Hosting**.
   - Choose your existing project.
   - Set the public directory to `dist`.
   - Configure as a single-page app: **Yes**.
3. **Build and Deploy**:
   ```bash
   npm run build
   firebase deploy
   ```

### 2. Vercel (Easiest for Beginners)
1. Create a free account at [vercel.com](https://vercel.com).
2. Push your code to a GitHub repository.
3. Import the repository into Vercel.
4. **Crucial**: Go to **Settings > Environment Variables** in Vercel and add all keys from your `.env` file (like `VITE_FIREBASE_API_KEY`, `GEMINI_API_KEY`, etc.).
5. Click **Deploy**. Vercel will give you a public URL (e.g., `softthikners.vercel.app`).

### 3. Netlify
1. Create an account at [netlify.com](https://netlify.com).
2. Connect your GitHub repo.
3. Set Build Command to `npm run build` and Publish Directory to `dist`.
4. Add your **Environment Variables** in the Netlify dashboard.
5. Deploy.

## 📁 Project Structure

- `src/components/`: Reusable UI components (Navbar, Footer, Modals, etc.)
- `src/pages/`: Main page components (Home, Team, Blog, etc.)
- `src/lib/`: Core logic (Firebase config, Auth context, Error handling)
- `src/index.css`: Global styles with Tailwind CSS @theme configuration
- `firebase-blueprint.json`: IR schema for Firestore data models
- `firestore.rules`: Security rules for database protection

## 🛠️ Tech Stack

- **Framework**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Backend**: [Firebase](https://firebase.google.com/) (Firestore, Auth)
- **AI**: [Google Gemini API](https://ai.google.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📄 License

This project is built by **Team Softthikners**. All rights reserved.
For inquiries, contact us via the portal or at [sksjakaria@gmail.com](mailto:sksjakaria@gmail.com).
