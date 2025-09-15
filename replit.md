# Jesus Walks Napa - Full-Stack E-commerce Platform

## Overview

Jesus Walks Napa is a comprehensive e-commerce platform built for a Napa Valley business offering hiking events, wine tours, and merchandise sales. The application combines event management, online shopping, payment processing, and AI-powered customer service into a unified platform. It features a React frontend with TypeScript, Express.js backend, PostgreSQL database with Drizzle ORM, and multiple payment integrations including Stripe, Square, Apple Pay, Google Pay, and cryptocurrency payments.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type-safe development
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Custom component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration and shadcn/ui integration
- **State Management**: React Query for server state and custom React Context for cart management
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Session Management**: Express sessions with PostgreSQL store for persistent authentication
- **File Structure**: Modular service-based architecture separating concerns (auth, payments, shipping, AI)
- **API Design**: RESTful endpoints with consistent error handling and response formats
- **Middleware**: Custom admin authorization middleware and request validation

### Database Design
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database queries and migrations
- **Schema Structure**: 
  - Users table with admin roles and profile information
  - Events table for hiking/wine tour management
  - Products table for merchandise catalog
  - Orders and order items for e-commerce functionality
  - AI conversation tracking with model configurations
  - Waitlist management for event interest
- **Migrations**: Automated database migrations with version control

### Authentication & Security
- **Session-Based Authentication**: Server-side sessions stored in PostgreSQL
- **Password Security**: bcrypt hashing for secure password storage
- **Admin Access Control**: Role-based permissions with middleware protection
- **Environment Variables**: Secure configuration management for sensitive data

### Payment Processing Architecture
- **Multi-Provider Support**: Stripe, Square, Apple Pay, Google Pay, and cryptocurrency payments
- **Payment Abstraction**: Unified payment interface supporting multiple processors
- **Secure Tokenization**: Client-side tokenization for PCI compliance
- **Mobile-First Payments**: Biometric authentication support through Apple/Google Pay
- **Cryptocurrency Integration**: Bitcoin, Ethereum, USDC, and other major cryptocurrencies

### AI Integration
- **Multi-Model Support**: OpenAI GPT, Anthropic Claude, and Google Gemini integration
- **Context-Aware Responses**: Wine expertise, customer service, and general assistance contexts
- **Conversation Management**: Persistent chat history with user sessions
- **Fallback System**: Graceful degradation when AI services are unavailable

### Shipping & Logistics
- **Address Validation**: EasyPost integration for accurate shipping addresses
- **Rate Calculation**: Real-time shipping rates from multiple carriers
- **Geographic Services**: Google Maps integration for address autocomplete
- **Postal Code Lookup**: Automatic city/state population for improved UX

## External Dependencies

### Cloud Services
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Replit Deployment**: Cloud hosting platform with automatic deployments

### Payment Providers
- **Stripe**: Primary payment processor with extensive card support
- **Square**: Alternative payment processor with POS integration capabilities
- **Apple Pay**: iOS native payment integration with biometric authentication
- **Google Pay**: Android payment integration with device security
- **Cryptocurrency Services**: Multi-chain support for Bitcoin, Ethereum, USDC, and altcoins

### AI & Machine Learning
- **OpenAI**: GPT models for conversational AI and content generation
- **Anthropic Claude**: Advanced reasoning and safety-focused AI responses
- **Google Gemini**: Multimodal AI capabilities and competitive pricing

### Shipping & Logistics
- **EasyPost**: Shipping API for rate calculation and label generation
- **Google Maps**: Address validation, autocomplete, and geocoding services

### Communication Services
- **Brevo (Sendinblue)**: Email marketing and transactional email delivery
- **SMTP Services**: Configurable email providers for notifications

### Development Tools
- **TypeScript**: Static typing for enhanced development experience
- **Vite**: Fast build tooling with hot module replacement
- **Tailwind CSS**: Utility-first styling with custom theme integration
- **React Query**: Server state management with caching and synchronization