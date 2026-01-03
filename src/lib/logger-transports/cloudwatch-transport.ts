/**
 * CloudWatch Transport
 *
 * Integration with AWS CloudWatch Logs using AWS SDK v3.
 * Supports log groups, streams, automatic batching, and SigV4 authentication.
 */

import {
    CloudWatchLogsClient,
    PutLogEventsCommand,
    CreateLogGroupCommand,
    CreateLogStreamCommand,
    DescribeLogStreamsCommand,
    type InputLogEvent
} from '@aws-sdk/client-cloudwatch-logs';
import type { LogEntry, TransportConfig } from '@/types/log-entry';
import { BaseTransport, transportRegistry } from './base-transport';

/**
 * CloudWatch transport configuration options
 */
export interface CloudWatchTransportOptions {
    [key: string]: unknown;
    /** AWS region */
    region?: string;

    /** AWS access key ID */
    accessKeyId?: string;

    /** AWS secret access key */
    secretAccessKey?: string;

    /** Log group name */
    logGroupName?: string;

    /** Log stream name (defaults to hostname + date) */
    logStreamName?: string;

    /** Whether to create log group/stream if not exists */
    createIfNotExists?: boolean;

    /** Batch size */
    batchSize?: number;

    /** Flush interval in milliseconds */
    flushIntervalMs?: number;

    /** Retention period in days (for new log groups) */
    retentionInDays?: number;
}

/**
 * CloudWatch log event format
 */
interface CloudWatchLogEvent {
    timestamp: number;
    message: string;
}

/**
 * CloudWatch transport implementation
 */
export class CloudWatchTransport extends BaseTransport {
    private readonly options: CloudWatchTransportOptions;
    private client: CloudWatchLogsClient | null = null;
    private buffer: CloudWatchLogEvent[] = [];
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private isFlushing = false;
    private sequenceToken: string | undefined;
    private isInitialized = false;

    constructor(config: TransportConfig) {
        super('cloudwatch', config);

        const opts = config.options as CloudWatchTransportOptions | undefined;
        const hostname = process.env.HOSTNAME || 'unknown';
        const date = new Date().toISOString().slice(0, 10);

        this.options = {
            region: opts?.region || process.env.AWS_REGION || 'us-east-1',
            accessKeyId: opts?.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: opts?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
            logGroupName: opts?.logGroupName || '/app/synergyflow-erp',
            logStreamName: opts?.logStreamName || `${hostname}/${date}`,
            createIfNotExists: opts?.createIfNotExists ?? true,
            batchSize: opts?.batchSize || 50,
            flushIntervalMs: opts?.flushIntervalMs || 5000,
            retentionInDays: opts?.retentionInDays || 30,
        };

        // Only initialize if we have credentials or implied environment credentials
        // If explicit validation fails, we disable the transport
        if (!this.options.region) {
            this.enabled = false;
            console.warn('CloudWatchTransport: Region not specified, transport disabled');
            return;
        }

        try {
            const clientConfig: any = { region: this.options.region };

            if (this.options.accessKeyId && this.options.secretAccessKey) {
                clientConfig.credentials = {
                    accessKeyId: this.options.accessKeyId,
                    secretAccessKey: this.options.secretAccessKey,
                };
            }

            this.client = new CloudWatchLogsClient(clientConfig);

            // Start flush timer
            this.flushTimer = setInterval(() => {
                this.flush().catch((err) => {
                    console.error('CloudWatchTransport: Failed to flush buffer', err);
                });
            }, this.options.flushIntervalMs);

        } catch (err) {
            console.error('CloudWatchTransport: Failed to initialize client', err);
            this.enabled = false;
        }
    }

    /**
     * Initialize CloudWatch client and ensure log group/stream exist
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized || !this.client || !this.enabled) return;

        try {
            if (this.options.createIfNotExists) {
                await this.ensureLogGroup();
                await this.ensureLogStream();
            }

            // Get initial sequence token
            await this.refreshSequenceToken();

            this.isInitialized = true;
        } catch (error) {
            console.error('CloudWatchTransport: Initialization failed', error);
            // Don't disable here, might be transient
        }
    }

    private async ensureLogGroup() {
        if (!this.client) return;
        try {
            await this.client.send(new CreateLogGroupCommand({
                logGroupName: this.options.logGroupName
            }));
        } catch (e: any) {
            if (e.name !== 'ResourceAlreadyExistsException') throw e;
        }
    }

    private async ensureLogStream() {
        if (!this.client) return;
        try {
            await this.client.send(new CreateLogStreamCommand({
                logGroupName: this.options.logGroupName,
                logStreamName: this.options.logStreamName
            }));
        } catch (e: any) {
            if (e.name !== 'ResourceAlreadyExistsException') throw e;
        }
    }

    private async refreshSequenceToken() {
        if (!this.client) return;
        try {
            const response = await this.client.send(new DescribeLogStreamsCommand({
                logGroupName: this.options.logGroupName,
                logStreamNamePrefix: this.options.logStreamName
            }));

            const stream = response.logStreams?.find(s => s.logStreamName === this.options.logStreamName);
            if (stream) {
                this.sequenceToken = stream.uploadSequenceToken;
            }
        } catch (e) {
            console.warn('CloudWatchTransport: Failed to refresh sequence token', e);
        }
    }

    protected async doLog(entry: LogEntry): Promise<void> {
        if (!this.enabled) return;
        await this.initialize();

        const cwEvent = this.transformEntry(entry);
        this.buffer.push(cwEvent);

        if (this.buffer.length >= (this.options.batchSize || 50)) {
            await this.flush();
        }
    }

    protected async doLogBatch(entries: LogEntry[]): Promise<void> {
        if (!this.enabled) return;
        await this.initialize();

        const cwEvents = entries.map((e) => this.transformEntry(e));
        this.buffer.push(...cwEvents);

        if (this.buffer.length >= (this.options.batchSize || 50)) {
            await this.flush();
        }
    }

    /**
     * Transform log entry to CloudWatch format
     */
    private transformEntry(entry: LogEntry): CloudWatchLogEvent {
        return {
            timestamp: new Date(entry.timestamp).getTime(),
            message: JSON.stringify(entry),
        };
    }

    /**
     * Flush buffer to CloudWatch
     */
    async flush(): Promise<void> {
        if (!this.client || this.buffer.length === 0) return;
        if (this.isFlushing) return;

        this.isFlushing = true;

        // CloudWatch Batch Limits:
        // 1. Max 1MB (1,048,576 bytes) per batch
        // 2. Max 10,000 log events per batch
        const eventsToSend: InputLogEvent[] = [];
        let currentBatchSize = 0;
        const MAX_BATCH_SIZE_BYTES = 1048576;

        // Sort events by timestamp (CloudWatch requirement)
        this.buffer.sort((a, b) => a.timestamp - b.timestamp);

        const remainingBuffer: CloudWatchLogEvent[] = [];

        for (const event of this.buffer) {
            // Simple sizing approximation (message len + overhead)
            const eventSize = event.message.length + 26;

            if (currentBatchSize + eventSize > MAX_BATCH_SIZE_BYTES || eventsToSend.length >= 10000) {
                remainingBuffer.push(event);
                continue;
            }

            eventsToSend.push({
                timestamp: event.timestamp,
                message: event.message
            });
            currentBatchSize += eventSize;
        }

        this.buffer = remainingBuffer;

        if (eventsToSend.length === 0) {
            this.isFlushing = false;
            return;
        }

        try {
            const command = new PutLogEventsCommand({
                logGroupName: this.options.logGroupName,
                logStreamName: this.options.logStreamName,
                logEvents: eventsToSend,
                sequenceToken: this.sequenceToken,
            });

            const response = await this.client.send(command);
            this.sequenceToken = response.nextSequenceToken;

        } catch (error: any) {
            if (error.name === 'InvalidSequenceTokenException') {
                this.sequenceToken = error.expectedSequenceToken;
                // Put events back to retry next time
                // Re-map format
                const failedEvents = eventsToSend.map(e => ({ timestamp: e.timestamp!, message: e.message! }));
                this.buffer.unshift(...failedEvents);
            } else if (error.name === 'DataAlreadyAcceptedException') {
                this.sequenceToken = error.expectedSequenceToken;
            } else {
                console.error('CloudWatchTransport: Failed to send logs', error);
                // Logic to drop or retry could go here. For now we drop explicitly failed non-sequence errors to avoid loops.
            }
        } finally {
            this.isFlushing = false;
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown(): Promise<void> {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }

        await this.flush();
    }
}

/**
 * Register CloudWatch transport in the registry
 */
transportRegistry.register('cloudwatch', (config) => new CloudWatchTransport(config));

/**
 * Factory function for creating CloudWatch transport
 */
export function createCloudWatchTransport(options?: CloudWatchTransportOptions): CloudWatchTransport {
    return new CloudWatchTransport({
        name: 'cloudwatch',
        enabled: true,
        minLevel: 'info',
        options,
    });
}
