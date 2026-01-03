import { logger } from '@/lib/logger';

/**
 * Tab Synchronization Manager
 * 
 * Keeps cache consistent across browser tabs using BroadcastChannel API:
 * - Cache invalidation broadcasting
 * - Tab leader election for background tasks
 * - Cross-tab queue synchronization
 */

type MessageType = 'invalidate' | 'sync-complete' | 'leader-ping' | 'leader-pong' | 'queue-update';

interface SyncMessage {
    type: MessageType;
    payload: unknown;
    tabId: string;
    timestamp: number;
}

export class TabSyncManager {
    private channel: BroadcastChannel | null = null;
    private readonly channelName = 'synergyflow-sync';
    private readonly tabId: string;
    private isLeader = false;
    private leaderCheckInterval: number | null = null;
    private lastLeaderPing = 0;
    private listeners: Map<MessageType, Set<(payload: unknown) => void>> = new Map();

    constructor() {
        this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.initChannel();
    }

    /**
     * Initialize the BroadcastChannel.
     */
    private initChannel(): void {
        if (typeof BroadcastChannel === 'undefined') {
            logger.warn('BroadcastChannel not supported', { component: 'TabSyncManager' });
            return;
        }

        try {
            this.channel = new BroadcastChannel(this.channelName);
            this.channel.onmessage = (event) => this.handleMessage(event.data as SyncMessage);

            // Start leader election
            this.startLeaderElection();

            logger.debug('TabSyncManager initialized', {
                component: 'TabSyncManager',
                tabId: this.tabId,
            });
        } catch (err) {
            logger.error(err, { component: 'TabSyncManager', action: 'initChannel' });
        }
    }

    /**
     * Handle incoming messages.
     */
    private handleMessage(message: SyncMessage): void {
        // Ignore messages from self
        if (message.tabId === this.tabId) return;

        switch (message.type) {
            case 'leader-ping':
                // Another tab is checking for leader
                if (this.isLeader) {
                    this.send('leader-pong', { leaderId: this.tabId });
                }
                break;

            case 'leader-pong':
                // Leader exists, update last ping time
                this.lastLeaderPing = Date.now();
                if (this.isLeader) {
                    // Another leader responded, step down if they have lower ID
                    const otherLeaderId = (message.payload as { leaderId: string }).leaderId;
                    if (otherLeaderId < this.tabId) {
                        this.isLeader = false;
                    }
                }
                break;

            default:
                // Notify listeners
                const callbacks = this.listeners.get(message.type);
                if (callbacks) {
                    callbacks.forEach(cb => cb(message.payload));
                }
        }
    }

    /**
     * Broadcast cache invalidation to other tabs.
     */
    broadcastInvalidation(entity: string, entityId?: string): void {
        this.send('invalidate', { entity, entityId });
    }

    /**
     * Broadcast sync completion.
     */
    broadcastSyncComplete(operationCount: number): void {
        this.send('sync-complete', { operationCount });
    }

    /**
     * Broadcast queue update.
     */
    broadcastQueueUpdate(queueLength: number): void {
        this.send('queue-update', { queueLength });
    }

    /**
     * Subscribe to a message type.
     */
    subscribe(type: MessageType, callback: (payload: unknown) => void): () => void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(callback);

        return () => {
            this.listeners.get(type)?.delete(callback);
        };
    }

    /**
     * Send a message to other tabs.
     */
    private send(type: MessageType, payload: unknown): void {
        if (!this.channel) return;

        const message: SyncMessage = {
            type,
            payload,
            tabId: this.tabId,
            timestamp: Date.now(),
        };

        try {
            this.channel.postMessage(message);
        } catch (err) {
            logger.error(err, { component: 'TabSyncManager', action: 'send' });
        }
    }

    /**
     * Start leader election process.
     */
    private startLeaderElection(): void {
        // Initially try to become leader
        this.send('leader-ping', {});

        // After timeout, if no response, become leader
        setTimeout(() => {
            if (Date.now() - this.lastLeaderPing > 1000) {
                this.isLeader = true;
                logger.debug('Became tab leader', {
                    component: 'TabSyncManager',
                    tabId: this.tabId,
                });
            }
        }, 1500);

        // Periodically check leader status
        this.leaderCheckInterval = window.setInterval(() => {
            if (this.isLeader) {
                this.send('leader-ping', {});
            }
        }, 10000);
    }

    /**
     * Check if this tab is the leader.
     */
    isTabLeader(): boolean {
        return this.isLeader;
    }

    /**
     * Get tab ID.
     */
    getTabId(): string {
        return this.tabId;
    }

    /**
     * Cleanup.
     */
    destroy(): void {
        if (this.leaderCheckInterval) {
            clearInterval(this.leaderCheckInterval);
        }
        if (this.channel) {
            this.channel.close();
        }
    }
}

// Export singleton
export const tabSyncManager = new TabSyncManager();
