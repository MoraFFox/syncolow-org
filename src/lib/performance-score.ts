
import type { Order, Feedback, Barista, Branch, Company } from './types';

// Define weights for each component of the score
const WEIGHTS = {
  revenue: 0.4,       // 4 points
  payment: 0.2,       // 2 points
  feedback: 0.2,      // 2 points
  barista: 0.2,       // 2 points
};

/**
 * Calculates a performance score (0-10) for a given branch based on multiple business metrics.
 *
 * @param branchId - The ID of the branch to score.
 * @param allOrders - An array of all orders in the system.
 * @param allFeedback - An array of all feedback in the system.
 * @param allBaristas - An array of all baristas in the system.
 * @returns A performance score from 0 to 10.
 */
export function calculatePerformanceScore(
  branchId: string,
  allOrders: Order[],
  allFeedback: Feedback[],
  allBaristas: Barista[]
): number {
  const branchOrders = allOrders.filter(o => o.branchId === branchId && o.status !== 'Cancelled');
  const branchFeedback = allFeedback.filter(f => {
      // This is a simplification. In a real app, feedback should be linked to branches.
      // For now, we assume feedback client ID can be matched to an order's client ID.
      const order = branchOrders.find(o => o.companyId === f.clientId);
      return !!order;
  });
  const branchBaristas = allBaristas.filter(b => b.branchId === branchId);

  // 1. Revenue Score (up to 4 points)
  const totalRevenueForBranch = branchOrders.reduce((sum, order) => sum + order.total, 0);
  
  // Find max revenue across all branches for normalization
  const revenueByBranch: { [key: string]: number } = allOrders.reduce((acc, order) => {
      if (order.branchId) {
          acc[order.branchId] = (acc[order.branchId] || 0) + order.total;
      }
      return acc;
  }, {} as { [key: string]: number });

  const maxRevenue = Math.max(...Object.values(revenueByBranch), 1); // Avoid division by zero
  const revenueScore = (totalRevenueForBranch / maxRevenue) * (10 * WEIGHTS.revenue);

  // 2. Payment Behavior Score (up to 2 points)
  let paymentScore = 10 * WEIGHTS.payment; // Assume perfect score initially
  if (branchOrders.some(o => o.paymentStatus === 'Overdue')) {
    paymentScore = 0; // Harsh penalty for any overdue payments
  } else if (branchOrders.some(o => o.paymentStatus === 'Pending')) {
    paymentScore *= 0.5; // Partial penalty for pending payments
  }

  // 3. Customer Feedback Score (up to 2 points)
  let feedbackScore = (10 * WEIGHTS.feedback) / 2; // Default to average if no feedback
  if (branchFeedback.length > 0) {
    const avgRating = branchFeedback.reduce((sum, f) => sum + f.rating, 0) / branchFeedback.length;
    // Normalize 1-5 star rating to 0-10 scale
    const normalizedRating = ((avgRating - 1) / 4) * 10;
    feedbackScore = normalizedRating * WEIGHTS.feedback;
  }
  
  // 4. Barista Quality Score (up to 2 points)
  let baristaScore = (10 * WEIGHTS.barista) / 2; // Default to average if no baristas
  if (branchBaristas.length > 0) {
      const avgBaristaRating = branchBaristas.reduce((sum, b) => sum + b.rating, 0) / branchBaristas.length;
      const normalizedRating = ((avgBaristaRating - 1) / 4) * 10;
      baristaScore = normalizedRating * WEIGHTS.barista;
  }

  // Final score calculation
  const finalScore = revenueScore + paymentScore + feedbackScore + baristaScore;
  
  // Ensure score is clamped between 0 and 10
  return Math.max(0, Math.min(10, finalScore));
}

