# Production Deployment Guide

## 🚀 Pre-Deployment Checklist

### 1. Environment Setup

#### Copy Environment Template
```bash
cp .env.example .env
```

#### Configure Variables
Edit `.env` with your production values:
- Firebase credentials
- Email service API keys
- VAPID keys for push notifications
- AI service keys

### 2. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Add keys to `.env`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BN...
VAPID_PRIVATE_KEY=...
```

### 3. Firebase Setup

#### Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

#### Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

#### Verify Deployment
```bash
firebase firestore:indexes
```

### 4. Build & Test

#### Install Dependencies
```bash
npm install
```

#### Type Check
```bash
npm run typecheck
```

#### Lint
```bash
npm run lint
```

#### Build
```bash
npm run build
```

### 5. Email Service Setup

#### Option A: SendGrid
```bash
npm install @sendgrid/mail
```

Update `notification-email-service.ts`:
```typescript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to,
  from: 'notifications@synergyflow.com',
  subject: template.subject,
  text: template.text,
  html: template.html,
});
```

#### Option B: Firebase Email Extension
```bash
firebase ext:install firebase/firestore-send-email
```

Configure extension:
- SMTP credentials
- From email address
- Collection name: `mail`

#### Option C: AWS SES
```bash
npm install @aws-sdk/client-ses
```

Configure AWS credentials in `.env`

### 6. Service Worker Registration

Add to `app/layout.tsx`:
```typescript
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.error('SW registration failed:', err));
  }
}, []);
```

## 📦 Deployment Steps

### Step 1: Deploy to Staging

```bash
# Build
npm run build

# Deploy to Firebase staging
firebase use staging
firebase deploy --only hosting

# Test staging
open https://staging.synergyflow.com
```

### Step 2: Smoke Tests

Test critical paths:
- [ ] Login works
- [ ] Notifications load
- [ ] Real-time updates work
- [ ] Email notifications send
- [ ] Push notifications work
- [ ] Analytics dashboard loads
- [ ] Settings save correctly

### Step 3: Deploy to Production

```bash
# Switch to production
firebase use production

# Deploy everything
firebase deploy

# Or deploy selectively
firebase deploy --only hosting,firestore:rules,firestore:indexes
```

### Step 4: Post-Deployment Verification

```bash
# Check deployment status
firebase hosting:channel:list

# View logs
firebase functions:log

# Monitor Firestore
firebase firestore:indexes
```

## 🔍 Monitoring Setup

### 1. Firebase Console

Monitor:
- Firestore usage
- Authentication
- Hosting traffic
- Function executions

### 2. Error Tracking

Add Sentry (optional):
```bash
npm install @sentry/nextjs
```

Configure in `next.config.js`:
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

module.exports = withSentryConfig({
  // Your Next.js config
}, {
  // Sentry config
  silent: true,
  org: 'your-org',
  project: 'synergyflow',
});
```

### 3. Analytics

Enable Firebase Analytics:
```typescript
import { getAnalytics } from 'firebase/analytics';

if (typeof window !== 'undefined') {
  const analytics = getAnalytics(app);
}
```

## 🔐 Security Hardening

### 1. Environment Variables

Never commit `.env` to git:
```bash
# .gitignore
.env
.env.local
.env.production
```

### 2. API Keys

Restrict Firebase API keys:
- Go to Google Cloud Console
- APIs & Services > Credentials
- Restrict by HTTP referrers
- Add your domain

### 3. Firestore Rules

Test rules:
```bash
firebase emulators:start --only firestore
```

Run security tests in emulator.

### 4. CORS Configuration

Configure Firebase Storage CORS:
```json
[
  {
    "origin": ["https://app.synergyflow.com"],
    "method": ["GET"],
    "maxAgeSeconds": 3600
  }
]
```

## ⚡ Performance Optimization

### 1. Enable Caching

Add to `next.config.js`:
```javascript
module.exports = {
  swcMinify: true,
  compress: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
};
```

### 2. Firestore Optimization

- Use composite indexes
- Limit query results
- Enable offline persistence
- Use pagination

### 3. Code Splitting

Already enabled with Next.js dynamic imports.

### 4. CDN Configuration

Firebase Hosting automatically uses CDN.

## 📊 Monitoring Dashboards

### Key Metrics to Track

1. **Notification Metrics**
   - Total notifications sent
   - Delivery success rate
   - Average response time
   - Action completion rate

2. **System Metrics**
   - API response times
   - Error rates
   - Firestore read/write counts
   - Function execution times

3. **User Metrics**
   - Active users
   - Notification preferences
   - Channel adoption rates
   - Engagement scores

### Set Up Alerts

Firebase Console > Alerts:
- High error rate
- Slow response times
- Quota approaching
- Unusual traffic patterns

## 🔄 Rollback Plan

### Quick Rollback

```bash
# List deployments
firebase hosting:channel:list

# Rollback to previous
firebase hosting:rollback
```

### Full Rollback

```bash
# Revert code
git revert HEAD

# Rebuild
npm run build

# Redeploy
firebase deploy
```

## 📝 Post-Deployment Tasks

### Week 1
- [ ] Monitor error logs daily
- [ ] Check Firestore usage
- [ ] Verify email delivery
- [ ] Test push notifications
- [ ] Review analytics

### Week 2-4
- [ ] Analyze user feedback
- [ ] Review performance metrics
- [ ] Optimize slow queries
- [ ] Update documentation
- [ ] Plan improvements

### Monthly
- [ ] Review analytics dashboard
- [ ] Adjust automation rules
- [ ] Update notification thresholds
- [ ] Clean up old data
- [ ] Security audit

## 🆘 Troubleshooting

### Issue: Notifications Not Appearing

**Check:**
1. Firestore rules deployed
2. User authenticated
3. Subscription active
4. No console errors

**Fix:**
```bash
firebase deploy --only firestore:rules
```

### Issue: Push Notifications Not Working

**Check:**
1. HTTPS enabled
2. Service worker registered
3. Permission granted
4. VAPID keys configured

**Fix:**
```bash
# Verify service worker
open https://app.synergyflow.com/sw.js

# Check browser console
# Look for registration errors
```

### Issue: Email Not Sending

**Check:**
1. API keys configured
2. Email service active
3. From address verified
4. Rate limits not exceeded

**Fix:**
```bash
# Test email service
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"notifications@synergyflow.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test"}]}'
```

### Issue: High Firestore Costs

**Check:**
1. Query efficiency
2. Index usage
3. Read/write patterns
4. Unnecessary subscriptions

**Fix:**
- Add composite indexes
- Limit query results
- Use pagination
- Cache frequently accessed data

## 📞 Support Contacts

- **Firebase Support**: https://firebase.google.com/support
- **SendGrid Support**: https://support.sendgrid.com
- **Development Team**: [Your contact info]

## ✅ Deployment Complete!

Once all steps are complete:

1. ✅ Mark deployment as successful
2. 📝 Document any issues
3. 📊 Set up monitoring
4. 📢 Announce to users
5. 🎯 Plan next iteration

---

**Deployment Date**: _____________

**Deployed By**: _____________

**Version**: 3.0.0

**Status**: ⬜ Pending | ⬜ In Progress | ⬜ Complete

**Production URL**: https://app.synergyflow.com

**Notes**:
_____________________________________________
