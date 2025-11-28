import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/tasks'];

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
    const { tokens } = await this.oauth2Client.getToken(code);
    return tokens;
  }

  private getTasksClient(tokens: any) {
    this.oauth2Client.setCredentials(tokens);
    return google.tasks({ version: 'v1', auth: this.oauth2Client });
  }

  async getTaskLists(tokens: any) {
    const tasks = this.getTasksClient(tokens);
    const res = await tasks.tasklists.list();
    return res.data.items || [];
  }

  async createTaskList(tokens: any, title: string) {
    const tasks = this.getTasksClient(tokens);
    const res = await tasks.tasklists.insert({
      requestBody: { title },
    });
    return res.data;
  }

  async createTask(tokens: any, taskListId: string, task: any) {
    const tasks = this.getTasksClient(tokens);
    const res = await tasks.tasks.insert({
      tasklist: taskListId,
      requestBody: task,
    });
    return res.data;
  }

  async updateTask(tokens: any, taskListId: string, taskId: string, task: any) {
    const tasks = this.getTasksClient(tokens);
    const res = await tasks.tasks.update({
      tasklist: taskListId,
      task: taskId,
      requestBody: task,
    });
    return res.data;
  }

  async listTasks(tokens: any, taskListId: string) {
    const tasks = this.getTasksClient(tokens);
    let allItems: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const res = await tasks.tasks.list({
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
  }
  
  async getTask(tokens: any, taskListId: string, taskId: string) {
      const tasks = this.getTasksClient(tokens);
      const res = await tasks.tasks.get({
          tasklist: taskListId,
          task: taskId
      });
      return res.data;
  }
}

export const googleTasksService = new GoogleTasksService();
