# WIMP Kitchen Companion

## Overview

WIMP Kitchen Companion is a comprehensive culinary management platform designed to provide intelligent cooking assistance. It integrates AI-powered meal planning, ingredient tracking, and recipe management with social features. The platform offers personalized recommendations, nutrition tracking, and automated shopping list generation. It supports freemium and premium subscription models, with advanced AI capabilities available to premium users. The project aims to streamline culinary processes, enhance user experience in the kitchen, and foster a community around food preparation.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state management and caching
- **Styling**: Tailwind CSS with custom UI components and Radix UI primitives
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Authentication**: JWT-based authentication with bcrypt
- **File Storage**: Local storage and optional cloud storage for images
- **AI Integration**: Anthropic Claude API

### Data Storage Solutions
- **Primary Database**: PostgreSQL for user, recipe, ingredient, meal plan, shopping list, and progress data.
- **Caching**: React Query for client-side caching.
- **Local Storage**: Browser localStorage for tokens and preferences.

### Authentication and Authorization
- **Token-based Authentication**: JWT tokens.
- **Role-based Access**: Differentiates between Freemium and Premium user features.
- **API Protection**: Middleware for authenticated endpoints.

### UI/UX Decisions
- **Mobile Optimization**: Prioritizes responsive design, ensuring touch targets meet minimum requirements (e.g., 44px).
- **Consistent Styling**: Uses Tailwind CSS for a cohesive look and feel, with specific color adherence (e.g., green navigation banner).
- **Accessibility**: Utilizes Radix UI primitives for accessible components and ensures proper font sizing to prevent mobile zoom issues.

### Feature Specifications
- **AI Chef Chat**: AI-powered conversational assistant for cooking queries and recipe generation.
- **Recipe Book Scanner**: Extracts recipes from images, including ingredient quantities and units, with pantry integration.
- **Meal Planning**: Automated generation of meal plans.
- **Ingredient Tracking**: Manages pantry inventory.
- **Shopping List Generation**: Automatically creates shopping lists based on meal plans and pantry inventory.
- **Unified Ingredient Extraction**: Advanced parsing logic for quantities and units from voice, photo, and receipt scanning.

## External Dependencies

- **Payment Processing**: Stripe for subscription management.
- **Email Services**: SendGrid for transactional emails.
- **AI Services**: Anthropic Claude API.
- **Cloud Storage**: Optional Google Cloud Storage for image hosting.
- **File Upload**: Uppy (with AWS S3 support).