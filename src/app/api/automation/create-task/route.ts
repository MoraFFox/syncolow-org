import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { googleTasksService } from '@/services/google-tasks-service';
import { logger } from '@/lib/logger';
import { supabaseAdmin } from '@/lib/supabase';

const TASK_LIST_NAME = 'SynergyFlow Automation';

interface CreateTaskRequest {
  title: string;
  assignee?: string;
  priority?: 'low' | 'normal' | 'high';
  notificationId?: string;
  notes?: string;
  dueDate?: string;
}

/**
 * POST /api/automation/create-task
 * Creates a task in Google Tasks via automation
 * Supports both server-side (Supabase tokens) and client-side (cookie tokens) contexts
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateTaskRequest = await request.json();
    const { title, assignee, priority, notificationId, notes, dueDate } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    // Try to get tokens: Supabase first (server-side automation), then cookies (user requests)
    let tokens = null;

    // Check Supabase for automation tokens (any user with google_tasks tokens)
    // In a production system, you might use a dedicated service account
    const { data: autoTokens, error: tokenError } = await supabaseAdmin
      .from('automation_tokens')
      .select('tokens')
      .eq('provider', 'google_tasks')
      .limit(1)
      .single();

    if (!tokenError && autoTokens?.tokens) {
      tokens = autoTokens.tokens;
      logger.debug('Using Supabase automation tokens for task creation');
    } else {
      // Fallback to cookies for user-initiated requests
      const cookieStore = await cookies();
      const tokensRaw = cookieStore.get('google_tasks_tokens')?.value;
      if (tokensRaw) {
        tokens = JSON.parse(tokensRaw);
        logger.debug('Using cookie tokens for task creation');
      }
    }

    if (!tokens) {
      logger.warn('Google Tasks not connected - cannot create automation task', { 
        component: 'AutomationCreateTask' 
      });
      return NextResponse.json(
        { error: 'Google Tasks not connected. Please connect in Settings > Sync.' },
        { status: 401 }
      );
    }

    // Get or create the automation task list
    const taskLists = await googleTasksService.getTaskLists(tokens);
    let taskList = taskLists.find((list: any) => list.title === TASK_LIST_NAME);

    if (!taskList) {
      taskList = await googleTasksService.createTaskList(tokens, TASK_LIST_NAME);
      logger.debug('Created automation task list', { taskListId: taskList.id });
    }

    // Build task title with priority/assignee prefix
    let taskTitle = title;
    if (priority === 'high') {
      taskTitle = `🔴 [HIGH] ${title}`;
    } else if (priority === 'low') {
      taskTitle = `🟢 [LOW] ${title}`;
    }
    
    if (assignee) {
      const assigneeLabel = assignee.charAt(0).toUpperCase() + assignee.slice(1);
      taskTitle = `[${assigneeLabel}] ${taskTitle}`;
    }

    // Build task notes
    const taskNotes = [
      notes || '',
      notificationId ? `\n\nNotification ID: ${notificationId}` : '',
      '\n\nCreated by SynergyFlow Automation'
    ].filter(Boolean).join('');

    // Create the task
    const taskData: any = {
      title: taskTitle,
      notes: taskNotes.trim(),
      status: 'needsAction'
    };

    if (dueDate) {
      // Google Tasks expects RFC 3339 date
      taskData.due = new Date(dueDate).toISOString();
    }

    const createdTask = await googleTasksService.createTask(tokens, taskList.id, taskData);

    logger.debug('Automation task created', { 
      taskId: createdTask.id, 
      title: taskTitle,
      notificationId 
    });

    return NextResponse.json({
      success: true,
      taskId: createdTask.id,
      taskListId: taskList.id,
      title: taskTitle
    });
  } catch (error) {
    logger.error(error, { 
      component: 'AutomationCreateTask', 
      action: 'POST' 
    });

    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
