# SynergyFlow ERP

An AI-powered ERP system built with Next.js featuring an **enterprise-grade notification system** with real-time updates, AI intelligence, and multi-channel delivery.

## 🎉 Notification System v3.0.0

Complete notification system with:
- ✅ **17 notification types** covering all business operations
- ✅ **3 delivery channels** (In-app, Email, Push)
- ✅ **AI-powered** priority scoring and insights
- ✅ **Analytics dashboard** with metrics and trends
- ✅ **Workflow automation** with pre-built rules
- ✅ **Real-time updates** via Firestore
- ✅ **Production-ready** with comprehensive documentation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Firebase project
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Configure your environment variables
# Edit .env with your Firebase credentials
```

### Development

```bash
# Start development server (port 3001)
npm run dev

# Start Genkit AI flows
npm run genkit:watch

# Type check
npm run typecheck

# Lint
npm run lint
```

### Deployment

```bash
# Build for production
npm run build

# Deploy to Firebase
firebase deploy
```

See [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT.md) for detailed instructions.

## 📚 Documentation

Comprehensive documentation in the `docs/` folder:

### Getting Started
- **[Complete Implementation](./docs/COMPLETE_IMPLEMENTATION.md)** - Full system overview
- **[Quick Reference](./docs/notification-quick-reference.md)** - Developer reference
- **[Production Deployment](./docs/PRODUCTION_DEPLOYMENT.md)** - Deployment guide
- **[Final Handoff](./docs/FINAL_HANDOFF.md)** - Project completion summary

### Feature Guides
- **[Phase 1: Real-time & Persistence](./docs/notification-system.md)**
- **[Phase 2: AI & Email](./docs/notification-phase2-ai-email.md)**
- **[Phase 3: Multi-Channel & Analytics](./docs/PHASE3_SUMMARY.md)**

### Reference
- **[Migration Guide](./docs/notification-migration-guide.md)**
- **[Firestore Rules](./docs/firestore-rules-notifications.md)**
- **[Deployment Checklist](./docs/DEPLOYMENT_CHECKLIST.md)**
- **[Changelog](./CHANGELOG.md)**

## 🏗️ Project Structure

```
src/
├── app/                    # Next.js pages and routes
│   ├── notifications/      # Notification center
│   ├── analytics/          # Analytics dashboard
│   └── settings/           # User preferences
├── components/             # Reusable UI components (shadcn/ui)
├── lib/                    # Core utilities and services
│   ├── notification-*.ts   # Notification system
│   ├── types.ts            # TypeScript definitions
│   └── firebase.ts         # Firebase configuration
├── ai/                     # Genkit AI flows
├── hooks/                  # Custom React hooks
└── store/                  # Zustand state management

docs/                       # Comprehensive documentation
public/                     # Static assets and service worker
scripts/                    # Development utility scripts
```

### Development Scripts

Utility scripts for development and maintenance tasks are located in `scripts/`:
- Order batch operations (deletion, migration)
- Data conversion utilities (XLSX to CSV)
- Debugging tools (delivery date calculation)

See [scripts/README.md](./scripts/README.md) for usage instructions.

## 🎯 Key Features

### Notification System
- **17 Types**: Payment, inventory, client, order, maintenance, feedback alerts
- **Smart Grouping**: AI-powered notification grouping to reduce noise
- **Priority Scoring**: Dynamic urgency calculation based on 8+ factors
- **Multi-Channel**: In-app, email, and browser push notifications
- **Analytics**: Complete metrics, trends, and engagement tracking
- **Automation**: Workflow rules with conditional logic and actions
- **Real-time**: Instant updates via Firestore subscriptions
- **Customizable**: User preferences for all notification types

### Business Management
- Client and order management
- Product catalog and inventory
- Maintenance scheduling
- Payment tracking and analytics
- Feedback and sentiment analysis

## 🔧 Configuration

### Environment Variables

Required variables in `.env`:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
# ... other Firebase config

# Application
NEXT_PUBLIC_APP_URL=https://app.synergyflow.com

# Email Service (choose one)
SENDGRID_API_KEY=          # For SendGrid
AWS_ACCESS_KEY_ID=         # For AWS SES

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=

# AI Services
GOOGLE_GENAI_API_KEY=
```

See [.env.example](./.env.example) for complete template.

**⚠️ Security Note**: Never commit `.env` files to version control. All Firebase credentials must be configured via environment variables. Development scripts (`delete-orders-client.js`, `delete-orders.js`) require these variables to be set in your `.env` file.

### Firestore Setup

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

## 🧪 Testing

```bash
# Run tests
npm run test

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build

# Full CI validation (lint + test + typecheck + build)
npm run ci
```

> **⚠️ Important**: `next build` is configured with `typescript.ignoreBuildErrors: true` in `next.config.mjs`. This means **a successful build does NOT guarantee TypeScript correctness**. Always run `npm run typecheck` separately to catch type errors before deploying.

## 📊 Monitoring

- **Firebase Console**: Firestore usage, authentication, hosting
- **Analytics Dashboard**: Built-in at `/analytics/notifications`
- **Error Tracking**: Configure Sentry (optional)
- **Performance**: Firebase Performance Monitoring

## 🆘 Support

- **Documentation**: Check `docs/` folder
- **Quick Reference**: `docs/notification-quick-reference.md`
- **Troubleshooting**: `docs/PRODUCTION_DEPLOYMENT.md#troubleshooting`
- **Issues**: Contact development team

## 📝 License

SynergyFlow ERP - Internal Project

## 🙏 Acknowledgments

Built with Next.js, React, TypeScript, Firebase, Genkit AI, and shadcn/ui.

---

**Version**: 3.0.0  
**Status**: Production Ready  
**Last Updated**: 2024
