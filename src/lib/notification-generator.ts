
import { Order, Product, MaintenanceVisit, Feedback, Notification, NotificationItem, Company, NotificationType } from './types';
import { isToday, isFuture, differenceInDays, subMonths, differenceInMonths, isPast, addDays, subDays, isBefore, isAfter, parseISO } from 'date-fns';
import { getAutoStatus } from './auto-status';
import type { NotificationSettings } from '@/store/use-settings-store';
import { calculateDaysOverdue } from './payment-score';

interface GeneratorInput {
  orders: Order[];
  products: Product[];
  maintenanceVisits: MaintenanceVisit[];
  feedback: Feedback[];
  companies: Company[];
  settings: NotificationSettings;
}

export function generateNotifications({
  orders,
  products,
  maintenanceVisits,
  feedback,
  companies,
  settings,
}: GeneratorInput): Notification[] {
  const notifications: Notification[] = [];
  const now = new Date();

  const isEnabled = (type: NotificationType) => settings[type]?.enabled ?? true;

  // 1. Grouped: Overdue Payments
  if (isEnabled('OVERDUE_PAYMENT')) {
    const overdueOrders = orders.filter(order => order.paymentStatus === 'Overdue' && isPast(new Date(order.paymentDueDate || now)));
    if (overdueOrders.length > 0) {
      notifications.push({
        id: `overdue-group`,
        type: 'OVERDUE_PAYMENT',
        isGroup: true,
        priority: 'critical',
        title: `${overdueOrders.length} Overdue Payment(s)`,
        message: 'Multiple orders require immediate payment attention.',
        icon: 'CreditCard',
        source: 'Orders',
        createdAt: new Date().toISOString(),
        read: false,
        items: overdueOrders.map(order => ({
          id: order.id,
          title: `Order #${order.id.slice(0, 5)} for ${order.companyName}`,
          link: `/orders/${order.id}`,
          actionType: 'VIEW_ORDER',
          entityId: order.id,
        })),
      });
    }
  }

  // 2. Predictive: Stock Depletion Warnings
  if (isEnabled('STOCK_DEPLETION_WARNING')) {
    const depletionNotifications: NotificationItem[] = [];
    products.forEach(product => {
        const productOrders = orders.filter(order => order.items.some(item => item.productId === product.id) && order.status !== 'Cancelled');
        if (productOrders.length === 0) return;

        const firstOrderDate = new Date(productOrders.reduce((earliest, order) => new Date(order.orderDate) < new Date(earliest) ? order.orderDate : earliest, productOrders[0].orderDate));
        const monthsActive = differenceInMonths(now, firstOrderDate) || 1;
        const unitsSold = productOrders.reduce((sum, order) => sum + (order.items.find(i => i.productId === product.id)?.quantity || 0), 0);
        const salesVelocity = unitsSold / monthsActive;
        
        if (salesVelocity > 0) {
          const stockDepletionDays = product.stock / (salesVelocity / 30);
          if (stockDepletionDays < 14) {
            depletionNotifications.push({
                id: product.id,
                title: `${product.name} (${product.stock} left, ~${Math.floor(stockDepletionDays)} days)`,
                link: `/products/${product.id}`,
                actionType: 'VIEW_CLIENT', // Placeholder, needs a real action
                entityId: product.id,
                data: product,
            });
          }
        }
    });

    if (depletionNotifications.length > 0) {
        notifications.push({
            id: `depletion-group`,
            type: 'STOCK_DEPLETION_WARNING',
            isGroup: true,
            priority: 'warning',
            title: `Stock Depletion Warning`,
            message: `${depletionNotifications.length} product(s) are projected to run out soon.`,
            icon: 'Package',
            source: 'Inventory',
            createdAt: new Date().toISOString(),
            read: false,
            items: depletionNotifications,
        });
    }
  }

  // 3. Proactive: Client at Risk
  if (isEnabled('CLIENT_AT_RISK')) {
    const atRiskClients: NotificationItem[] = [];
    companies.forEach(company => {
        if (company.isBranch) return;
        const status = getAutoStatus(company, orders);
        if (status === 'Inactive' || (status === 'New' && differenceInDays(now, new Date(company.createdAt)) > 30)) {
            atRiskClients.push({
                id: company.id,
                title: `${company.name} is now '${status}'`,
                link: `/clients/${company.id}`,
                actionType: 'VIEW_CLIENT',
                entityId: company.id,
                data: company,
            });
        }
    });
     if (atRiskClients.length > 0) {
      notifications.push({
          id: `clientrisk-group`,
          type: 'CLIENT_AT_RISK',
          isGroup: true,
          priority: 'warning',
          title: `${atRiskClients.length} Client(s) Need Attention`,
          message: 'Review clients who are inactive or at risk of churning.',
          icon: 'UserX',
          source: 'Clients',
          createdAt: new Date().toISOString(),
          read: false,
          items: atRiskClients,
      });
    }
  }

  // 4. Workflow: Order Status Changes
  if (isEnabled('ORDER_STATUS_CHANGED')) {
    orders.forEach(order => {
        const orderDate = new Date(order.orderDate);
        if (differenceInDays(now, orderDate) > 3) return;

        if (order.status === 'Pending') {
            notifications.push({
                id: `order-new-${order.id}`, type: 'ORDER_STATUS_CHANGED', isGroup: false, priority: 'info',
                title: 'New Order Received', message: `Order #${order.id.slice(0,5)} for ${order.companyName} is ready.`,
                icon: 'ShoppingCart', source: 'Orders', link: `/orders/${order.id}`, createdAt: order.orderDate, read: false,
                actionType: 'VIEW_ORDER', entityId: order.id,
            });
        }
        const shippedEvent = order.statusHistory?.find(h => h.status === 'Shipped');
        if (shippedEvent && differenceInDays(now, new Date(shippedEvent.timestamp)) <= 3) {
            notifications.push({
                id: `order-shipped-${order.id}`, type: 'ORDER_STATUS_CHANGED', isGroup: false, priority: 'info',
                title: 'Order Shipped', message: `Order #${order.id.slice(0,5)} for ${order.companyName} is on its way.`,
                icon: 'Truck', source: 'Orders', link: `/orders/${order.id}`, createdAt: shippedEvent.timestamp, read: false,
                actionType: 'VIEW_ORDER', entityId: order.id,
            });
        }
    });
  }

  // 5. Workflow: Maintenance Follow-ups
  if (isEnabled('MAINTENANCE_FOLLOW_UP_REQUIRED')) {
    maintenanceVisits.forEach(visit => {
      if (visit.status === 'Follow-up Required') {
        notifications.push({
          id: `maint-followup-${visit.id}`,
          type: 'MAINTENANCE_FOLLOW_UP_REQUIRED',
          isGroup: false,
          priority: 'warning',
          title: 'Maintenance Follow-up Needed',
          message: `Case for ${visit.branchName} requires a follow-up visit.`,
          icon: 'Wrench',
          source: 'Maintenance',
          link: `/maintenance?action=log_outcome&visitId=${visit.id}`,
          createdAt: new Date().toISOString(),
          read: false,
          actionType: 'SCHEDULE_FOLLOW_UP',
          entityId: visit.id,
        });
      }
    });
  }

  // 6. Payment Due Soon (1-3 days)
  if (isEnabled('PAYMENT_DUE_SOON')) {
    const dueSoonOrders = orders.filter(order => {
      if (order.isPaid || order.paymentStatus === 'Paid' || !order.expectedPaymentDate) return false;
      const daysUntilDue = differenceInDays(new Date(order.expectedPaymentDate), now);
      return daysUntilDue >= 0 && daysUntilDue <= 3;
    });

    if (dueSoonOrders.length > 0) {
      notifications.push({
        id: `payment-due-soon-group`,
        type: 'PAYMENT_DUE_SOON',
        isGroup: true,
        priority: 'warning',
        title: `${dueSoonOrders.length} Payment(s) Due Soon`,
        message: 'Payments expected within the next 3 days.',
        icon: 'Clock',
        source: 'Payments',
        createdAt: new Date().toISOString(),
        read: false,
        items: dueSoonOrders.map(order => ({
          id: order.id,
          title: `Order #${order.id.slice(0, 5)} - ${order.companyName} (${differenceInDays(new Date(order.expectedPaymentDate!), now)} days)`,
          link: `/orders/${order.id}`,
          actionType: 'VIEW_ORDER',
          entityId: order.id,
        })),
      });
    }
  }

  // 7. Bulk Payment Cycle Due
  if (isEnabled('BULK_PAYMENT_CYCLE_DUE')) {
    const bulkCycles = new Map<string, Order[]>();
    orders.forEach(order => {
      if (order.bulkPaymentCycleId && !order.isPaid && order.expectedPaymentDate) {
        const daysUntilDue = differenceInDays(new Date(order.expectedPaymentDate), now);
        if (daysUntilDue >= 0 && daysUntilDue <= 7) {
          if (!bulkCycles.has(order.bulkPaymentCycleId)) {
            bulkCycles.set(order.bulkPaymentCycleId, []);
          }
          bulkCycles.get(order.bulkPaymentCycleId)!.push(order);
        }
      }
    });

    bulkCycles.forEach((cycleOrders, cycleId) => {
      const totalAmount = cycleOrders.reduce((sum, o) => sum + o.grandTotal, 0);
      const daysUntil = differenceInDays(new Date(cycleOrders[0].expectedPaymentDate!), now);
      notifications.push({
        id: `bulk-cycle-${cycleId}`,
        type: 'BULK_PAYMENT_CYCLE_DUE',
        isGroup: true,
        priority: daysUntil <= 3 ? 'warning' : 'info',
        title: `Bulk Payment Cycle Due in ${daysUntil} days`,
        message: `${cycleOrders.length} orders totaling $${totalAmount.toFixed(2)} from ${cycleOrders[0].companyName}`,
        icon: 'DollarSign',
        source: 'Payments',
        createdAt: new Date().toISOString(),
        read: false,
        metadata: { amount: totalAmount, daysUntil, orderCount: cycleOrders.length },
        items: cycleOrders.map(order => ({
          id: order.id,
          title: `Order #${order.id.slice(0, 5)} - $${order.grandTotal.toFixed(2)}`,
          link: `/orders/${order.id}`,
          actionType: 'VIEW_ORDER',
          entityId: order.id,
        })),
      });
    });
  }

  // 8. Delivery Delay Risk
  if (isEnabled('DELIVERY_DELAY_RISK')) {
    const atRiskOrders = orders.filter(order => {
      if (!order.deliveryDate || order.status === 'Delivered' || order.status === 'Cancelled') return false;
      const deliveryDate = new Date(order.deliveryDate);
      const daysUntilDelivery = differenceInDays(deliveryDate, now);
      return daysUntilDelivery < 1 && order.status !== 'Shipped';
    });

    if (atRiskOrders.length > 0) {
      notifications.push({
        id: `delivery-risk-group`,
        type: 'DELIVERY_DELAY_RISK',
        isGroup: true,
        priority: 'warning',
        title: `${atRiskOrders.length} Order(s) at Risk of Delay`,
        message: 'Orders not yet shipped with delivery date approaching.',
        icon: 'AlertTriangle',
        source: 'Orders',
        createdAt: new Date().toISOString(),
        read: false,
        items: atRiskOrders.map(order => ({
          id: order.id,
          title: `Order #${order.id.slice(0, 5)} for ${order.companyName} - ${order.status}`,
          link: `/orders/${order.id}`,
          actionType: 'VIEW_ORDER',
          entityId: order.id,
        })),
      });
    }
  }

  // 9. Delivery Failed
  if (isEnabled('DELIVERY_FAILED')) {
    orders.forEach(order => {
      if (order.status === 'Delivery Failed') {
        const failedEvent = order.statusHistory?.find(h => h.status === 'Delivery Failed');
        if (failedEvent && differenceInDays(now, new Date(failedEvent.timestamp)) <= 2) {
          notifications.push({
            id: `delivery-failed-${order.id}`,
            type: 'DELIVERY_FAILED',
            isGroup: false,
            priority: 'critical',
            title: 'Delivery Failed',
            message: `Order #${order.id.slice(0, 5)} for ${order.companyName} failed delivery.`,
            icon: 'XCircle',
            source: 'Orders',
            link: `/orders/${order.id}`,
            createdAt: failedEvent.timestamp,
            read: false,
            actionType: 'RESCHEDULE_DELIVERY',
            entityId: order.id,
          });
        }
      }
    });
  }

  // 10. High Value Orders
  if (isEnabled('HIGH_VALUE_ORDER')) {
    const HIGH_VALUE_THRESHOLD = 10000;
    orders.forEach(order => {
      if (order.grandTotal >= HIGH_VALUE_THRESHOLD && differenceInDays(now, new Date(order.orderDate)) <= 1) {
        notifications.push({
          id: `high-value-${order.id}`,
          type: 'HIGH_VALUE_ORDER',
          isGroup: false,
          priority: 'info',
          title: 'High Value Order Received',
          message: `Order #${order.id.slice(0, 5)} for ${order.companyName} - $${order.grandTotal.toFixed(2)}`,
          icon: 'TrendingUp',
          source: 'Orders',
          link: `/orders/${order.id}`,
          createdAt: order.orderDate,
          read: false,
          actionType: 'VIEW_ORDER',
          entityId: order.id,
          metadata: { amount: order.grandTotal },
        });
      }
    });
  }

  // 11. Order Cancelled
  if (isEnabled('ORDER_CANCELLED')) {
    orders.forEach(order => {
      if (order.status === 'Cancelled') {
        const cancelledEvent = order.statusHistory?.find(h => h.status === 'Cancelled');
        if (cancelledEvent && differenceInDays(now, new Date(cancelledEvent.timestamp)) <= 3) {
          notifications.push({
            id: `cancelled-${order.id}`,
            type: 'ORDER_CANCELLED',
            isGroup: false,
            priority: 'info',
            title: 'Order Cancelled',
            message: `Order #${order.id.slice(0, 5)} for ${order.companyName}${order.cancellationReason ? ` - ${order.cancellationReason}` : ''}`,
            icon: 'Ban',
            source: 'Orders',
            link: `/orders/${order.id}`,
            createdAt: cancelledEvent.timestamp,
            read: false,
            actionType: 'VIEW_ORDER',
            entityId: order.id,
          });
        }
      }
    });
  }

  // 12. Maintenance Due Soon
  if (isEnabled('MAINTENANCE_DUE_SOON')) {
    const dueMaintenanceVisits = maintenanceVisits.filter(visit => {
      if (visit.status !== 'Scheduled' || !visit.scheduledDate) return false;
      const daysUntil = differenceInDays(new Date(visit.scheduledDate), now);
      return daysUntil >= 0 && daysUntil <= 3;
    });

    if (dueMaintenanceVisits.length > 0) {
      notifications.push({
        id: `maintenance-due-group`,
        type: 'MAINTENANCE_DUE_SOON',
        isGroup: true,
        priority: 'info',
        title: `${dueMaintenanceVisits.length} Maintenance Visit(s) Coming Up`,
        message: 'Scheduled maintenance visits in the next 3 days.',
        icon: 'Calendar',
        source: 'Maintenance',
        createdAt: new Date().toISOString(),
        read: false,
        items: dueMaintenanceVisits.map(visit => ({
          id: visit.id,
          title: `${visit.branchName} - ${new Date(visit.scheduledDate!).toLocaleDateString()}`,
          link: `/maintenance`,
          actionType: 'VIEW_MAINTENANCE',
          entityId: visit.id,
        })),
      });
    }
  }

  // 13. Maintenance Delayed
  if (isEnabled('MAINTENANCE_DELAYED')) {
    const delayedVisits = maintenanceVisits.filter(visit => visit.isSignificantDelay && visit.status !== 'Completed' && visit.status !== 'Cancelled');
    
    if (delayedVisits.length > 0) {
      notifications.push({
        id: `maintenance-delayed-group`,
        type: 'MAINTENANCE_DELAYED',
        isGroup: true,
        priority: 'warning',
        title: `${delayedVisits.length} Maintenance Visit(s) Delayed`,
        message: 'Visits delayed more than 3 days.',
        icon: 'AlertCircle',
        source: 'Maintenance',
        createdAt: new Date().toISOString(),
        read: false,
        items: delayedVisits.map(visit => ({
          id: visit.id,
          title: `${visit.branchName} - ${visit.delayDays} days delayed${visit.delayReason ? `: ${visit.delayReason}` : ''}`,
          link: `/maintenance`,
          actionType: 'VIEW_MAINTENANCE',
          entityId: visit.id,
        })),
      });
    }
  }

  // 14. Spare Parts Needed
  if (isEnabled('SPARE_PARTS_NEEDED')) {
    const waitingForParts = maintenanceVisits.filter(visit => visit.status === 'Waiting for Parts');
    
    if (waitingForParts.length > 0) {
      notifications.push({
        id: `spare-parts-group`,
        type: 'SPARE_PARTS_NEEDED',
        isGroup: true,
        priority: 'warning',
        title: `${waitingForParts.length} Maintenance Case(s) Waiting for Parts`,
        message: 'Cases on hold pending spare parts delivery.',
        icon: 'Package',
        source: 'Maintenance',
        createdAt: new Date().toISOString(),
        read: false,
        items: waitingForParts.map(visit => ({
          id: visit.id,
          title: `${visit.branchName} - ${visit.spareParts?.map(p => p.name).join(', ') || 'Parts needed'}`,
          link: `/maintenance`,
          actionType: 'VIEW_MAINTENANCE',
          entityId: visit.id,
        })),
      });
    }
  }

  // 15. New Feedback
  if (isEnabled('NEW_FEEDBACK')) {
    feedback.forEach(fb => {
      if (differenceInDays(now, new Date(fb.feedbackDate)) <= 1) {
        const company = companies.find(c => c.id === fb.clientId);
        notifications.push({
          id: `feedback-${fb.id}`,
          type: 'NEW_FEEDBACK',
          isGroup: false,
          priority: fb.sentiment === 'negative' ? 'warning' : 'info',
          title: `New ${fb.sentiment || ''} Feedback`,
          message: `${company?.name || 'Client'} rated ${fb.rating}/5: "${fb.message.slice(0, 50)}..."`,
          icon: fb.sentiment === 'negative' ? 'ThumbsDown' : 'MessageSquare',
          source: 'Feedback',
          link: `/feedback`,
          createdAt: fb.feedbackDate,
          read: false,
          actionType: 'VIEW_FEEDBACK',
          entityId: fb.id,
        });
      }
    });
  }

  // 16. Low Client Satisfaction
  if (isEnabled('LOW_CLIENT_SATISFACTION')) {
    const clientFeedbackMap = new Map<string, Feedback[]>();
    feedback.forEach(fb => {
      if (!clientFeedbackMap.has(fb.clientId)) {
        clientFeedbackMap.set(fb.clientId, []);
      }
      clientFeedbackMap.get(fb.clientId)!.push(fb);
    });

    const lowSatisfactionClients: NotificationItem[] = [];
    clientFeedbackMap.forEach((feedbacks, clientId) => {
      const recentFeedback = feedbacks.filter(f => differenceInDays(now, new Date(f.feedbackDate)) <= 90).sort((a, b) => new Date(b.feedbackDate).getTime() - new Date(a.feedbackDate).getTime());
      if (recentFeedback.length >= 2) {
        const avgRating = recentFeedback.reduce((sum, f) => sum + f.rating, 0) / recentFeedback.length;
        if (avgRating < 3) {
          const company = companies.find(c => c.id === clientId);
          lowSatisfactionClients.push({
            id: clientId,
            title: `${company?.name || 'Client'} - Avg rating: ${avgRating.toFixed(1)}/5`,
            link: `/clients/${clientId}`,
            actionType: 'VIEW_CLIENT',
            entityId: clientId,
          });
        }
      }
    });

    if (lowSatisfactionClients.length > 0) {
      notifications.push({
        id: `low-satisfaction-group`,
        type: 'LOW_CLIENT_SATISFACTION',
        isGroup: true,
        priority: 'warning',
        title: `${lowSatisfactionClients.length} Client(s) with Low Satisfaction`,
        message: 'Clients with average rating below 3/5 in last 90 days.',
        icon: 'Frown',
        source: 'Clients',
        createdAt: new Date().toISOString(),
        read: false,
        items: lowSatisfactionClients,
      });
    }
  }

  // 17. Sales Velocity Drop
  if (isEnabled('SALES_VELOCITY_DROP')) {
    const productSalesMap = new Map<string, { recent: number; previous: number }>();
    const threeMonthsAgo = subMonths(now, 3);
    const sixMonthsAgo = subMonths(now, 6);

    products.forEach(product => {
      const recentOrders = orders.filter(o => o.items.some(i => i.productId === product.id) && new Date(o.orderDate) >= threeMonthsAgo);
      const previousOrders = orders.filter(o => o.items.some(i => i.productId === product.id) && new Date(o.orderDate) >= sixMonthsAgo && new Date(o.orderDate) < threeMonthsAgo);
      
      const recentSales = recentOrders.reduce((sum, o) => sum + (o.items.find(i => i.productId === product.id)?.quantity || 0), 0);
      const previousSales = previousOrders.reduce((sum, o) => sum + (o.items.find(i => i.productId === product.id)?.quantity || 0), 0);
      
      if (previousSales > 0 && recentSales < previousSales * 0.5) {
        productSalesMap.set(product.id, { recent: recentSales, previous: previousSales });
      }
    });

    if (productSalesMap.size > 0) {
      const items: NotificationItem[] = [];
      productSalesMap.forEach((sales, productId) => {
        const product = products.find(p => p.id === productId);
        if (product) {
          items.push({
            id: productId,
            title: `${product.name} - Sales dropped ${Math.round((1 - sales.recent / sales.previous) * 100)}%`,
            link: `/products/${productId}`,
            actionType: 'VIEW_ORDER',
            entityId: productId,
          });
        }
      });

      notifications.push({
        id: `sales-drop-group`,
        type: 'SALES_VELOCITY_DROP',
        isGroup: true,
        priority: 'info',
        title: `${items.length} Product(s) with Declining Sales`,
        message: 'Products with 50%+ sales drop compared to previous quarter.',
        icon: 'TrendingDown',
        source: 'Analytics',
        createdAt: new Date().toISOString(),
        read: false,
        items,
      });
    }
  }

  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

