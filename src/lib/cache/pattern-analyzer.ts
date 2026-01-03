import { behaviorTracker } from './behavior-tracker';
import { routePredictor } from './route-predictor';
import { logger } from '@/lib/logger';

/**
 * Pattern Analyzer
 * 
 * Analyzes user behavior patterns for predictive cache warming.
 * Implements ML-lite pattern detection including:
 * - Transition probability matrices
 * - Time-of-day weighting
 * - Recency-weighted scoring
 * - Confidence scoring for predictions
 */

interface PatternScore {
    entity: string;
    score: number;
    confidence: number;
    reasons: string[];
}

interface PredictionResult {
    entities: PatternScore[];
    analyzedAt: number;
}

export class PatternAnalyzer {
    private readonly RECENCY_DECAY = 0.1; // Decay factor per day

    /**
     * Analyze patterns and return prioritized entities for prefetching.
     */
    analyze(limit: number = 10): PredictionResult {
        const scores = new Map<string, PatternScore>();

        // 1. Frequency-based scoring
        this.applyFrequencyScoring(scores);

        // 2. Time-of-day scoring
        this.applyTimeOfDayScoring(scores);

        // 3. Day-of-week scoring
        this.applyDayOfWeekScoring(scores);

        // 4. Recency scoring
        this.applyRecencyScoring(scores);

        // 5. Transition probability scoring
        this.applyTransitionScoring(scores);

        // Sort by score and return top results
        const sorted = Array.from(scores.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return {
            entities: sorted,
            analyzedAt: Date.now(),
        };
    }

    /**
     * Apply frequency-based scoring.
     * Higher view counts = higher scores.
     */
    private applyFrequencyScoring(scores: Map<string, PatternScore>): void {
        const routeStats = behaviorTracker.getRouteStats();
        const maxViews = Math.max(...routeStats.map(s => s.totalViews), 1);

        for (const stat of routeStats) {
            const entities = routePredictor.getEntitiesForRoute(stat.route);
            const frequencyScore = (stat.totalViews / maxViews) * 30; // Max 30 points

            for (const entity of entities) {
                this.addScore(scores, entity, frequencyScore, 'frequency');
            }
        }
    }

    /**
     * Apply time-of-day scoring.
     * Boost entities commonly accessed at current time.
     */
    private applyTimeOfDayScoring(scores: Map<string, PatternScore>): void {
        const routes = behaviorTracker.getRoutesForCurrentTime(5);

        for (let i = 0; i < routes.length; i++) {
            const entities = routePredictor.getEntitiesForRoute(routes[i]);
            const timeScore = (5 - i) * 4; // Decreasing score: 20, 16, 12, 8, 4

            for (const entity of entities) {
                this.addScore(scores, entity, timeScore, 'time-of-day');
            }
        }
    }

    /**
     * Apply day-of-week scoring.
     * Boost entities commonly accessed on current day.
     */
    private applyDayOfWeekScoring(scores: Map<string, PatternScore>): void {
        const routes = behaviorTracker.getRoutesForCurrentDay(5);

        for (let i = 0; i < routes.length; i++) {
            const entities = routePredictor.getEntitiesForRoute(routes[i]);
            const dayScore = (5 - i) * 3; // Decreasing score: 15, 12, 9, 6, 3

            for (const entity of entities) {
                this.addScore(scores, entity, dayScore, 'day-of-week');
            }
        }
    }

    /**
     * Apply recency scoring.
     * Recently accessed entities get a boost.
     */
    private applyRecencyScoring(scores: Map<string, PatternScore>): void {
        const routeStats = behaviorTracker.getRouteStats();
        const now = Date.now();
        const dayMs = 24 * 60 * 60 * 1000;

        for (const stat of routeStats) {
            const daysAgo = (now - stat.lastVisited) / dayMs;
            const recencyScore = Math.max(0, 20 * Math.exp(-this.RECENCY_DECAY * daysAgo));

            const entities = routePredictor.getEntitiesForRoute(stat.route);
            for (const entity of entities) {
                this.addScore(scores, entity, recencyScore, 'recency');
            }
        }
    }

    /**
     * Apply transition probability scoring.
     * Use route predictor's learned transitions.
     */
    private applyTransitionScoring(scores: Map<string, PatternScore>): void {
        // Get current predictions from route predictor
        const currentRoute = typeof window !== 'undefined'
            ? window.location.pathname
            : '/';

        const predictedRoutes = routePredictor.predictNextRoutes(currentRoute, 5);

        for (let i = 0; i < predictedRoutes.length; i++) {
            const entities = routePredictor.getEntitiesForRoute(predictedRoutes[i]);
            const transitionScore = (5 - i) * 5; // Decreasing: 25, 20, 15, 10, 5

            for (const entity of entities) {
                this.addScore(scores, entity, transitionScore, 'transition');
            }
        }
    }

    /**
     * Add score to an entity.
     */
    private addScore(
        scores: Map<string, PatternScore>,
        entity: string,
        points: number,
        reason: string
    ): void {
        const existing = scores.get(entity) || {
            entity,
            score: 0,
            confidence: 0,
            reasons: [],
        };

        existing.score += points;
        existing.reasons.push(`${reason}: +${points.toFixed(1)}`);

        // Calculate confidence based on number of contributing factors
        const uniqueReasons = new Set(existing.reasons.map(r => r.split(':')[0]));
        existing.confidence = Math.min(uniqueReasons.size / 5, 1); // Max confidence with 5+ factors

        scores.set(entity, existing);
    }

    /**
     * Get prediction accuracy metrics.
     * Tracks how often predictions match actual navigation.
     */
    getAccuracyMetrics(): { predictedHits: number; totalPredictions: number; accuracy: number } {
        // This would require tracking predictions and comparing to actual navigation
        // For now, return placeholder metrics
        const stats = routePredictor.getStats();

        return {
            predictedHits: 0,
            totalPredictions: stats.totalTransitions,
            accuracy: 0,
        };
    }

    /**
     * Debug: Log current pattern analysis.
     */
    debugAnalysis(): void {
        const result = this.analyze();
        logger.debug('Pattern Analysis Results', {
            component: 'PatternAnalyzer',
            entities: result.entities.map(e => ({
                entity: e.entity,
                score: e.score.toFixed(1),
                confidence: (e.confidence * 100).toFixed(0) + '%',
                reasons: e.reasons.length,
            })),
        });
    }
}

// Export singleton
export const patternAnalyzer = new PatternAnalyzer();
