import { google } from 'googleapis';
import type { Credentials } from 'google-auth-library';
import type { tasks_v1 } from 'googleapis';
import { logger } from '@/lib/logger';

const SCOPES = ['https://www.googleapis.com/auth/tasks'];

/**
 * Interface for task data when creating/updating tasks.
 */
export interface TaskData {
  title: string;
  notes?: string;
  due?: string;
  status?: 'needsAction' | 'completed';
}

export class GoogleTasksService {
  private oauth2Client;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID, // Reusing existing env vars for simplicity as they are for the same GCP project
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      process.env.GOOGLE_CALENDAR_REDIRECT_URI?.replace('google-calendar', 'google-tasks') // Adjust callback URL
    );
  }

  getAuthUrl() {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent',
    });
  }

  async getTokens(code: string) {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      return tokens;
    } catch (error) {
      logger.error(error, {
        component: 'GoogleTasksService',
        action: 'getTokens',
      });
      throw new Error('Failed to authenticate with Google Tasks. Please try reconnecting.');
    }
  }

  private getTasksClient(tokens: Credentials) {
    this.oauth2Client.setCredentials(tokens);
    return google.tasks({ version: 'v1', auth: this.oauth2Client });
  }

  async getTaskLists(tokens: Credentials) {
    try {
      const tasks = this.getTasksClient(tokens);
      const res = await tasks.tasklists.list();
      return res.data.items || [];
    } catch (error) {
      logger.error(error, {
        component: 'GoogleTasksService',
        action: 'getTaskLists',
      });
      throw new Error('Failed to fetch task lists. Please check your connection.');
    }
  }

  async createTaskList(tokens: Credentials, title: string) {
    try {
      const tasks = this.getTasksClient(tokens);
      const res = await tasks.tasklists.insert({
        requestBody: { title },
      });
      return res.data;
    } catch (error) {
      logger.error(error, {
        component: 'GoogleTasksService',
        action: 'createTaskList',
        title,
      });
      throw new Error('Failed to create task list. Please try again.');
    }
  }

  async createTask(tokens: Credentials, taskListId: string, task: TaskData) {
    try {
      const tasks = this.getTasksClient(tokens);
      const res = await tasks.tasks.insert({
        tasklist: taskListId,
        requestBody: task,
      });
      return res.data;
    } catch (error) {
      logger.error(error, {
        component: 'GoogleTasksService',
        action: 'createTask',
        taskListId,
      });
      throw new Error('Failed to create task. Please try again.');
    }
  }

  async updateTask(tokens: Credentials, taskListId: string, taskId: string, task: TaskData) {
    try {
      const tasks = this.getTasksClient(tokens);
      const res = await tasks.tasks.update({
        tasklist: taskListId,
        task: taskId,
        requestBody: task,
      });
      return res.data;
    } catch (error) {
      logger.error(error, {
        component: 'GoogleTasksService',
        action: 'updateTask',
        taskId,
        taskListId,
      });
      throw new Error('Failed to update task. Please try again.');
    }
  }

  async listTasks(tokens: Credentials, taskListId: string) {
    try {
      const tasks = this.getTasksClient(tokens);
      let allItems: tasks_v1.Schema$Task[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const res: { data: { items?: tasks_v1.Schema$Task[]; nextPageToken?: string | null } } = await tasks.tasks.list({
          tasklist: taskListId,
          showCompleted: true,
          showHidden: true,
          maxResults: 100,
          pageToken: pageToken,
        });

        if (res.data.items) {
          allItems = allItems.concat(res.data.items);
        }

        pageToken = res.data.nextPageToken || undefined;
      } while (pageToken);

      return allItems;
    } catch (error) {
      logger.error(error, {
        component: 'GoogleTasksService',
        action: 'listTasks',
        taskListId,
      });
      throw new Error('Failed to fetch tasks. Please check your connection.');
    }
  }

  async getTask(tokens: Credentials, taskListId: string, taskId: string) {
    try {
      const tasks = this.getTasksClient(tokens);
      const res = await tasks.tasks.get({
        tasklist: taskListId,
        task: taskId,
      });
      return res.data;
    } catch (error) {
      logger.error(error, {
        component: 'GoogleTasksService',
        action: 'getTask',
        taskId,
        taskListId,
      });
      throw new Error('Failed to fetch task details. Please try again.');
    }
  }
}

export const googleTasksService = new GoogleTasksService();
