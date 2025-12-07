import { NextRequest, NextResponse } from 'next/server';
import { googleTasksService } from '@/services/google-tasks-service';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

const LIST_TITLE = 'SynergyFlow Visits';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const tokensCookie = cookieStore.get('google_tasks_tokens');

    if (!tokensCookie) {
      return NextResponse.json({ error: 'Not authenticated with Google Tasks' }, { status: 401 });
    }

    const tokens = JSON.parse(tokensCookie.value);
    const body = await request.json();
    const { action, visitId, taskData, taskId } = body;

    // 1. Ensure Task List Exists
    let taskListId = body.taskListId;
    if (!taskListId) {
      const lists = await googleTasksService.getTaskLists(tokens);
      const existingList = lists.find((l: any) => l.title === LIST_TITLE);
      
      if (existingList) {
        taskListId = existingList.id;
      } else {
        const newList = await googleTasksService.createTaskList(tokens, LIST_TITLE);
        taskListId = newList.id;
      }
    }

    // 2. Handle Actions
    if (action === 'create') {
      const result = await googleTasksService.createTask(tokens, taskListId, taskData);
      return NextResponse.json({ success: true, taskId: result.id, taskListId });
    }

    if (action === 'update') {
      if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
      const result = await googleTasksService.updateTask(tokens, taskListId, taskId, taskData);
      return NextResponse.json({ success: true, taskId: result.id, taskListId });
    }

    if (action === 'check_completion') {
       if (!taskId) return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
       const task = await googleTasksService.getTask(tokens, taskListId, taskId);
       const isCompleted = task.status === 'completed';
       return NextResponse.json({ success: true, isCompleted, completedDate: task.completed, taskListId });
    }

    if (action === 'check_batch_completion') {
        const { taskIds } = body;
        if (!Array.isArray(taskIds)) return NextResponse.json({ error: 'Invalid taskIds' }, { status: 400 });
        
        // Fetch all tasks (pagination is now handled in the service)
        const allTasks = await googleTasksService.listTasks(tokens, taskListId);
        const allTaskIds = new Set(allTasks.map((t: any) => t.id));
        
        const completedTaskIds = allTasks
            .filter((t: any) => taskIds.includes(t.id) && t.status === 'completed')
            .map((t: any) => t.id);
            
        const missingTaskIds = taskIds.filter((id: string) => !allTaskIds.has(id));
            
        return NextResponse.json({ success: true, completedTaskIds, missingTaskIds, taskListId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    logger.error(error, { component: 'GoogleTasksSyncAPI', action: 'POST' });
    return NextResponse.json({ error: 'Failed to sync task' }, { status: 500 });
  }
}
