# Notification System Phase 2: AI & Email

## Overview

Phase 2 enhances the notification system with AI-powered intelligence and email delivery capabilities.

## New Features

### 1. AI-Powered Priority Scoring

**File**: `src/lib/notification-priority-scorer.ts`

Intelligent priority scoring algorithm that calculates urgency based on multiple factors:

- **Time sensitivity** - Days until due, overdue status
- **Financial impact** - Transaction amounts, outstanding balances
- **Client importance** - Payment scores, risk levels
- **Order context** - Order size, delivery status
- **Recency** - How long notification has been pending
- **Volume** - Number of related items

**Usage:**
```typescript
import { calculateNotificationPriority } from '@/lib/notification-priority-scorer';

const priorityScore = calculateNotificationPriority(notification, {
  order,
  company,
  relatedNotifications,
});

console.log(priorityScore);
// {
//   score: 85,
//   urgency: 'immediate',
//   factors: ['Overdue', 'High value', 'At-risk client']
// }
```

**Urgency Levels:**
- **Immediate** (80-100): Requires immediate action
- **High** (60-79): Important, address soon
- **Medium** (40-59): Moderate priority
- **Low** (0-39): Informational

### 2. Smart Grouping

Automatically groups similar notifications to reduce noise:

```typescript
import { groupSimilarNotifications } from '@/lib/notification-priority-scorer';

const grouped = groupSimilarNotifications(notifications);
```

Groups by:
- Notification type
- Related entity
- Time period

### 3. AI Summaries

Generate natural language summaries of notifications:

```typescript
import { generateNotificationSummary } from '@/lib/notification-priority-scorer';

const summary = generateNotificationSummary(notifications);
// "3 critical issues need immediate attention, 5 warnings, 12 updates."
```

### 4. Suggested Actions

AI-powered action suggestions for each notification:

```typescript
import { suggestActions } from '@/lib/notification-priority-scorer';

const actions = suggestActions(notification);
// [
//   'Contact client about payment',
//   'Send payment reminder email',
//   'Review payment terms'
// ]
```

### 5. Email Notifications

**File**: `src/lib/notification-email-service.ts`

Professional HTML email templates for notifications:

**Features:**
- Beautiful responsive HTML templates
- Plain text fallback
- Priority-based styling
- Grouped notification support
- Daily digest emails
- Metadata display

**Email Template:**
```typescript
import { NotificationEmailService } from '@/lib/notification-email-service';

const template = NotificationEmailService.generateEmailTemplate(notification);
// { subject, html, text }
```

**Send Email:**
```typescript
import { sendEmailNotification } from '@/lib/notification-email-service';

await sendEmailNotification('user@company.com', notification);
```

**Daily Digest:**
```typescript
import { sendDailyDigest } from '@/lib/notification-email-service';

await sendDailyDigest('user@company.com', notifications);
```

### 6. Genkit AI Flows

**File**: `src/ai/flows/notification-intelligence.ts`

AI flows for advanced notification intelligence:

#### Generate Summary
```typescript
import { getAINotificationSummary } from '@/ai/flows/notification-intelligence';

const summary = await getAINotificationSummary(notifications);
```

#### Suggest Actions
```typescript
import { getAISuggestedActions } from '@/ai/flows/notification-intelligence';

const { actions, reasoning } = await getAISuggestedActions(
  notification,
  order,
  company
);
```

#### Analyze Trends
```typescript
import { analyzeNotificationTrends } from '@/ai/flows/notification-intelligence';

const analysis = await analyzeNotificationTrends({
  notifications,
  timeframe: 'last 7 days',
});
// {
//   insights: ['Payment delays increasing', ...],
//   recommendations: ['Review payment terms', ...],
//   riskLevel: 'medium'
// }
```

### 7. Enhanced UI

**AI Insights Toggle:**
- Click "AI Insights" button to enable
- Shows AI-generated summary at top
- Displays suggested actions for each notification
- Provides contextual recommendations

**Notification Preferences:**
- Configure email delivery
- Set quiet hours
- Choose digest frequency
- Enable/disable notification types

## Email Integration

### Setup Options

#### Option 1: SendGrid
```bash
npm install @sendgrid/mail
```

```typescript
// In notification-email-service.ts
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

#### Option 2: Firebase Email Extension
```bash
firebase ext:install firebase/firestore-send-email
```

```typescript
await addDoc(collection(db, 'mail'), {
  to,
  message: {
    subject: template.subject,
    text: template.text,
    html: template.html,
  },
});
```

#### Option 3: AWS SES
```bash
npm install @aws-sdk/client-ses
```

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const client = new SESClient({ region: 'us-east-1' });
await client.send(new SendEmailCommand({
  Source: 'notifications@synergyflow.com',
  Destination: { ToAddresses: [to] },
  Message: {
    Subject: { Data: template.subject },
    Body: {
      Text: { Data: template.text },
      Html: { Data: template.html },
    },
  },
}));
```

### Email Triggers

Emails are automatically sent for:
- Critical priority notifications
- Overdue payments
- Failed deliveries
- High-value orders (>$50k)
- Notifications with urgency = 'immediate'

### Daily Digest

Schedule daily digest with Cloud Functions:

```typescript
// functions/src/index.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { sendDailyDigest } from './notification-email-service';

export const sendDailyDigests = onSchedule('0 9 * * *', async () => {
  // Get all users with digest enabled
  const users = await getUsers();
  
  for (const user of users) {
    const notifications = await getUnreadNotifications(user.id);
    if (notifications.length > 0) {
      await sendDailyDigest(user.email, notifications);
    }
  }
});
```

## Configuration

### Environment Variables

Add to `.env`:
```bash
# Email Service
SENDGRID_API_KEY=your_sendgrid_key
NEXT_PUBLIC_APP_URL=https://app.synergyflow.com

# AI Features
GOOGLE_GENAI_API_KEY=your_genai_key
```

### User Preferences

Store in Firestore `users/{userId}/preferences`:
```typescript
{
  notifications: {
    emailEnabled: true,
    emailAddress: 'user@company.com',
    digestFrequency: 'daily',
    quietHours: {
      start: '22:00',
      end: '07:00',
    },
    emailForTypes: ['OVERDUE_PAYMENT', 'DELIVERY_FAILED'],
  }
}
```

## Usage Examples

### Enable AI Insights

```typescript
// In notifications page
const [showAIInsights, setShowAIInsights] = useState(false);

<Button onClick={() => setShowAIInsights(!showAIInsights)}>
  <Sparkles className="mr-2 h-4 w-4" />
  AI Insights
</Button>

{showAIInsights && (
  <Alert>
    <AlertDescription>{aiSummary}</AlertDescription>
  </Alert>
)}
```

### Load Suggested Actions

```typescript
const loadSuggestedActions = (notification: Notification) => {
  const actions = suggestActions(notification);
  setSelectedActions(actions);
};

{actions.map(action => (
  <li key={action}>{action}</li>
))}
```

### Send Email on Notification Create

```typescript
import { shouldSendEmail } from '@/lib/notification-priority-scorer';
import { sendEmailNotification } from '@/lib/notification-email-service';

const notification = await createNotification(data);

const priorityScore = calculateNotificationPriority(notification);
if (shouldSendEmail(notification, priorityScore)) {
  await sendEmailNotification(user.email, notification);
}
```

## Best Practices

### Priority Scoring
1. **Tune thresholds** - Adjust scoring factors based on your business
2. **Monitor effectiveness** - Track which scores lead to action
3. **Avoid alert fatigue** - Don't over-score everything as critical

### Email Delivery
1. **Respect quiet hours** - Don't send non-critical emails at night
2. **Batch when possible** - Use daily digest for info-level notifications
3. **Personalize** - Use user's name and relevant context
4. **Test templates** - Preview emails in multiple clients

### AI Features
1. **Cache results** - Don't regenerate summaries on every render
2. **Handle failures** - Provide fallbacks when AI is unavailable
3. **Limit tokens** - Only send relevant data to AI
4. **Monitor costs** - Track AI API usage

## Performance Considerations

### Priority Scoring
- Runs client-side, no API calls
- O(n) complexity for grouping
- Minimal performance impact

### Email Generation
- Templates generated on-demand
- HTML is static, no dynamic rendering
- Fast generation (<10ms)

### AI Flows
- Async, non-blocking
- Cached when possible
- Fallback to rule-based logic
- Rate limited to prevent abuse

## Troubleshooting

### Emails Not Sending

1. Check email service configuration
2. Verify API keys in environment
3. Check Firestore mail collection (if using extension)
4. Review email service logs
5. Test with simple email first

### AI Features Not Working

1. Verify Genkit is configured
2. Check API keys
3. Review console for errors
4. Test with simple prompt
5. Check rate limits

### Priority Scores Incorrect

1. Review scoring factors
2. Adjust thresholds in code
3. Test with sample data
4. Monitor user feedback
5. Iterate based on usage

## Next Steps

### Phase 3 Features
- Browser push notifications
- SMS/WhatsApp integration
- Workflow automation
- Analytics dashboard
- A/B testing

### Enhancements
- Machine learning for priority scoring
- Personalized AI summaries
- Multi-language support
- Custom email templates
- Advanced scheduling

## API Reference

See [Quick Reference](./notification-quick-reference.md) for complete API documentation.

## Support

For issues or questions:
1. Check this documentation
2. Review code examples
3. Test in development
4. Check logs for errors
5. Contact development team
