/**
 * Error Classifier
 *
 * Automatic error categorization, impact assessment,
 * and pattern-based classification for improved diagnostics.
 */

import type { ErrorCategory, LogError } from '@/types/log-entry';

/**
 * Error classification result
 */
export interface ErrorClassification {
    /** Primary category */
    category: ErrorCategory;

    /** Sub-category for more specific classification */
    subCategory?: string;

    /** Impact level */
    impact: 'critical' | 'high' | 'medium' | 'low';

    /** Whether the error is recoverable */
    isRecoverable: boolean;

    /** Confidence score (0-1) */
    confidence: number;

    /** Suggested actions */
    suggestedActions: string[];

    /** Related documentation links */
    docLinks?: string[];
}

import { KNOWN_ERROR_PATTERNS, type ErrorPattern } from './error-knowledge-base';

/**
 * Error classifier implementation
 */
export class ErrorClassifier {
    private patterns: ErrorPattern[];
    private classificationCache = new Map<string, ErrorClassification>();
    private maxCacheSize = 1000;

    constructor(customPatterns?: ErrorPattern[]) {
        this.patterns = [...KNOWN_ERROR_PATTERNS, ...(customPatterns || [])];
    }

    /**
     * Classify an error
     */
    classify(error: Error | LogError | unknown): ErrorClassification {
        const normalizedError = this.normalizeError(error);

        // Check cache
        const cacheKey = this.getCacheKey(normalizedError);
        const cached = this.classificationCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // Try to match patterns
        const classification = this.matchPatterns(normalizedError);

        // Cache result
        if (this.classificationCache.size >= this.maxCacheSize) {
            // Clear oldest entries
            const keys = Array.from(this.classificationCache.keys());
            for (let i = 0; i < 100; i++) {
                this.classificationCache.delete(keys[i]);
            }
        }
        this.classificationCache.set(cacheKey, classification);

        return classification;
    }

    /**
     * Normalize error to common format
     */
    private normalizeError(error: Error | LogError | unknown): {
        name: string;
        message: string;
        code?: string;
        stack?: string;
    } {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                code: (error as Error & { code?: string }).code,
                stack: error.stack,
            };
        }

        if (typeof error === 'object' && error !== null) {
            const obj = error as Record<string, unknown>;
            return {
                name: String(obj.name || 'UnknownError'),
                message: String(obj.message || ''),
                code: obj.code ? String(obj.code) : undefined,
                stack: obj.stack ? String(obj.stack) : undefined,
            };
        }

        return {
            name: 'UnknownError',
            message: String(error),
        };
    }

    /**
     * Match error against patterns
     */
    private matchPatterns(error: {
        name: string;
        message: string;
        code?: string;
        stack?: string;
    }): ErrorClassification {
        let bestMatch: { pattern: ErrorPattern; score: number } | null = null;

        for (const pattern of this.patterns) {
            let score = 0;

            // Check message patterns
            for (const messagePattern of pattern.messagePatterns) {
                if (messagePattern.test(error.message)) {
                    score += 3;
                }
            }

            // Check name patterns
            if (pattern.namePatterns) {
                for (const namePattern of pattern.namePatterns) {
                    if (namePattern.test(error.name)) {
                        score += 2;
                    }
                }
            }

            // Check code patterns
            if (pattern.codePatterns && error.code) {
                for (const codePattern of pattern.codePatterns) {
                    if (typeof codePattern === 'string') {
                        if (error.code === codePattern) score += 4;
                    } else if (codePattern.test(error.code)) {
                        score += 3;
                    }
                }
            }

            if (score > 0 && (!bestMatch || score > bestMatch.score)) {
                bestMatch = { pattern, score };
            }
        }

        if (bestMatch) {
            const maxPossibleScore =
                (bestMatch.pattern.messagePatterns.length * 3) +
                (bestMatch.pattern.namePatterns?.length || 0) * 2 +
                (bestMatch.pattern.codePatterns?.length || 0) * 4;

            return {
                category: bestMatch.pattern.category,
                subCategory: bestMatch.pattern.subCategory,
                impact: bestMatch.pattern.impact,
                isRecoverable: bestMatch.pattern.isRecoverable,
                confidence: Math.min(1, bestMatch.score / Math.max(maxPossibleScore, 1)),
                suggestedActions: bestMatch.pattern.suggestedActions,
                docLinks: bestMatch.pattern.docLinks,
            };
        }

        // Default classification for unmatched errors
        return {
            category: 'UnknownError',
            impact: 'medium',
            isRecoverable: false,
            confidence: 0,
            suggestedActions: [
                'Review error message and stack trace',
                'Check application logs for context',
                'Consider adding a specific error pattern',
            ],
        };
    }

    /**
     * Generate cache key for error
     */
    private getCacheKey(error: { name: string; message: string; code?: string }): string {
        // Use first 100 chars of message for key
        const msgKey = error.message.slice(0, 100).replace(/[\d]/g, '#');
        return `${error.name}:${error.code || ''}:${msgKey}`;
    }

    /**
     * Add custom pattern
     */
    addPattern(pattern: ErrorPattern): void {
        this.patterns.push(pattern);
        this.classificationCache.clear();
    }

    /**
     * Get pattern statistics
     */
    getPatternStats(): { totalPatterns: number; cacheSize: number; cacheHitRate: number } {
        return {
            totalPatterns: this.patterns.length,
            cacheSize: this.classificationCache.size,
            cacheHitRate: 0, // Would need to track hits/misses
        };
    }
}

/**
 * Singleton instance
 */
let classifierInstance: ErrorClassifier | null = null;

/**
 * Get the global error classifier
 */
export function getErrorClassifier(): ErrorClassifier {
    if (!classifierInstance) {
        classifierInstance = new ErrorClassifier();
    }
    return classifierInstance;
}

/**
 * Convenience function to classify an error
 */
export function classifyError(error: Error | unknown): ErrorClassification {
    return getErrorClassifier().classify(error);
}
