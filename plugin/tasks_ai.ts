import { TaskManager } from '../src/task-manager';
import { TaskStatus } from '../src/schema';

// Define the tool interface expected by OpenCode (conceptual)
// In OpenCode, plugins export a 'tools' object or function.
// This is a simplified representation fitting the request.

export default {
  name: 'tasks-ai',
  setup: async (context: any) => {
    const manager = new TaskManager();

    context.registerTool({
      name: 'manage_tasks',
      description: 'Manage the task list for the current project. Use this to track progress, add new tasks, or mark tasks as complete.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            enum: ['list', 'add', 'complete', 'update', 'remove'],
            description: 'The operation to perform'
          },
          description: {
            type: 'string',
            description: 'Description for new tasks'
          },
          taskId: {
            type: 'string',
            description: 'ID of the task to update/remove/complete'
          },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'blocked', 'cancelled'],
            description: 'New status for update'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Priority for new tasks'
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of dependency Task IDs'
          }
        },
        required: ['command']
      },
      execute: async (args: any) => {
        try {
          switch (args.command) {
            case 'list':
              const tasks = await manager.listTasks(args.status as TaskStatus);
              return JSON.stringify(tasks, null, 2);

            case 'add':
              if (!args.description) throw new Error('Description is required for add');
              const id = await manager.addTask(
                args.description,
                args.priority || 'medium',
                [], // tags not exposed in simple tool yet
                args.dependencies || []
              );
              return `Task created with ID: ${id}`;

            case 'complete':
              if (!args.taskId) throw new Error('taskId is required for complete');
              await manager.updateTask(args.taskId, { status: 'completed' });
              return `Task ${args.taskId} marked as completed.`;

            case 'update':
              if (!args.taskId) throw new Error('taskId is required for update');
              await manager.updateTask(args.taskId, {
                status: args.status,
                description: args.description,
                dependencies: args.dependencies
              });
              return `Task ${args.taskId} updated.`;

            case 'remove':
               if (!args.taskId) throw new Error('taskId is required for remove');
               await manager.removeTask(args.taskId);
               return `Task ${args.taskId} removed.`;

            default:
              return `Unknown command: ${args.command}`;
          }
        } catch (error: any) {
          return `Error: ${error.message}`;
        }
      }
    });

    // Auto-Hook: Monitor file changes
    context.registerHook('tool.execute.after', async (event: any) => {
      if (event.tool === 'write' || event.tool === 'edit') {
        try {
          const activeTasks = await manager.listTasks('in_progress');
          if (activeTasks.length > 0) {
             const taskSummary = activeTasks.map(t => `- ${t.description} (ID: ${t.id})`).join('\n');
             // Return a system notice to the agent
             return {
               message: `[Tasks AI] Work detected. Current active tasks:\n${taskSummary}\nRemember to mark tasks as complete using 'manage_tasks' when done.`
             };
          }
        } catch (e) {
          // Silent fail on hook to not disrupt flow
          console.error("Task hook error:", e);
        }
      }
    });
  }
};
