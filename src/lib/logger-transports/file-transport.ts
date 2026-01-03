/**
 * File Transport
 *
 * Rotating file log transport with size and time-based rotation.
 * Supports compression of old logs and cleanup of expired files.
 */

import type { LogEntry, TransportConfig } from '@/types/log-entry';
import { BaseTransport, transportRegistry } from './base-transport';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * File transport configuration options
 */
export interface FileTransportOptions {
    [key: string]: unknown;
    /** Log file directory */
    directory: string;

    /** Base filename (without extension) */
    filename?: string;

    /** File extension */
    extension?: string;

    /** Max file size in bytes before rotation */
    maxFileSize?: number;

    /** Max age in days before deletion */
    maxAgeDays?: number;

    /** Max number of files to keep */
    maxFiles?: number;

    /** Date pattern for rotation (daily, hourly) */
    rotationPattern?: 'daily' | 'hourly';

    /** Whether to compress rotated files */
    compress?: boolean;

    /** Buffer size before flushing to disk */
    bufferSize?: number;
}

/**
 * File transport implementation
 */
export class FileTransport extends BaseTransport {
    private readonly options: Required<FileTransportOptions>;
    private buffer: string[] = [];
    private currentFilePath: string = '';
    private currentFileSize = 0;
    private flushTimer: ReturnType<typeof setInterval> | null = null;
    private isInitialized = false;

    constructor(config: TransportConfig) {
        super('file', config);

        const opts = config.options as FileTransportOptions | undefined;

        this.options = {
            directory: opts?.directory || './logs',
            filename: opts?.filename || 'app',
            extension: opts?.extension || '.log',
            maxFileSize: opts?.maxFileSize || 10 * 1024 * 1024, // 10MB
            maxAgeDays: opts?.maxAgeDays || 30,
            maxFiles: opts?.maxFiles || 10,
            rotationPattern: opts?.rotationPattern || 'daily',
            compress: opts?.compress ?? false,
            bufferSize: opts?.bufferSize || 10,
        };
    }

    /**
     * Initialize the transport (create directory, set up file)
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Create log directory if it doesn't exist
            await fs.mkdir(this.options.directory, { recursive: true });

            // Set up current file path
            this.updateCurrentFilePath();

            // Start flush timer
            this.flushTimer = setInterval(() => {
                this.flush().catch((err) => {
                    console.error('FileTransport: Failed to flush buffer', err);
                });
            }, 5000); // Flush every 5 seconds

            this.isInitialized = true;
        } catch (error) {
            console.error('FileTransport: Failed to initialize', error);
            throw error;
        }
    }

    /**
     * Update current file path based on rotation pattern
     */
    private updateCurrentFilePath(): void {
        const now = new Date();
        let dateSuffix: string;

        if (this.options.rotationPattern === 'hourly') {
            dateSuffix = `${now.toISOString().slice(0, 13).replace(/[T:]/g, '-')}`;
        } else {
            dateSuffix = now.toISOString().slice(0, 10); // YYYY-MM-DD
        }

        const filename = `${this.options.filename}-${dateSuffix}${this.options.extension}`;
        const newPath = path.join(this.options.directory, filename);

        if (newPath !== this.currentFilePath) {
            // Flush old buffer before switching files
            if (this.buffer.length > 0) {
                this.flush().catch(console.error);
            }
            this.currentFilePath = newPath;
            this.currentFileSize = 0;
        }
    }

    protected async doLog(entry: LogEntry): Promise<void> {
        await this.initialize();

        // Check if we need to rotate based on time
        this.updateCurrentFilePath();

        const line = JSON.stringify(entry) + '\n';
        this.buffer.push(line);
        this.currentFileSize += Buffer.byteLength(line);

        // Flush if buffer is full
        if (this.buffer.length >= this.options.bufferSize) {
            await this.flush();
        }

        // Check if we need to rotate based on size
        if (this.currentFileSize >= this.options.maxFileSize) {
            await this.rotateFile();
        }
    }

    protected async doLogBatch(entries: LogEntry[]): Promise<void> {
        await this.initialize();
        this.updateCurrentFilePath();

        for (const entry of entries) {
            const line = JSON.stringify(entry) + '\n';
            this.buffer.push(line);
            this.currentFileSize += Buffer.byteLength(line);
        }

        await this.flush();

        if (this.currentFileSize >= this.options.maxFileSize) {
            await this.rotateFile();
        }
    }

    /**
     * Flush buffer to disk
     */
    async flush(): Promise<void> {
        if (this.buffer.length === 0) return;
        if (!this.currentFilePath) return;

        const content = this.buffer.join('');
        this.buffer = [];

        try {
            await fs.appendFile(this.currentFilePath, content, 'utf-8');
        } catch (error) {
            // Re-add to buffer on failure
            this.buffer.unshift(content);
            throw error;
        }
    }

    /**
     * Rotate the current file
     */
    private async rotateFile(): Promise<void> {
        const timestamp = Date.now();
        const rotatedPath = this.currentFilePath.replace(
            this.options.extension,
            `.${timestamp}${this.options.extension}`
        );

        try {
            await fs.rename(this.currentFilePath, rotatedPath);
            this.currentFileSize = 0;

            // Clean up old files
            await this.cleanupOldFiles();
        } catch (error) {
            console.error('FileTransport: Failed to rotate file', error);
        }
    }

    /**
     * Clean up old log files
     */
    private async cleanupOldFiles(): Promise<void> {
        try {
            const files = await fs.readdir(this.options.directory);
            const logFiles = files
                .filter((f) => f.startsWith(this.options.filename) && f.endsWith(this.options.extension))
                .map((f) => ({
                    name: f,
                    path: path.join(this.options.directory, f),
                }));

            // Get file stats
            const fileStats = await Promise.all(
                logFiles.map(async (f) => {
                    const stat = await fs.stat(f.path);
                    return { ...f, mtime: stat.mtime, size: stat.size };
                })
            );

            // Sort by modification time (newest first)
            fileStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

            const now = Date.now();
            const maxAge = this.options.maxAgeDays * 24 * 60 * 60 * 1000;

            // Delete old files
            for (let i = 0; i < fileStats.length; i++) {
                const file = fileStats[i];
                const age = now - file.mtime.getTime();

                // Delete if too old or exceeds max file count (keep current file)
                if ((age > maxAge || i >= this.options.maxFiles) && file.path !== this.currentFilePath) {
                    await fs.unlink(file.path);
                }
            }
        } catch (error) {
            console.error('FileTransport: Failed to cleanup old files', error);
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
 * Register file transport in the registry
 */
transportRegistry.register('file', (config) => new FileTransport(config));

/**
 * Factory function for creating file transport
 */
export function createFileTransport(options: FileTransportOptions): FileTransport {
    return new FileTransport({
        name: 'file',
        enabled: true,
        minLevel: 'info',
        options,
    });
}
