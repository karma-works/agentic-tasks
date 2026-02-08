import type { Plugin } from "@opencode-ai/plugin";
import { TaskManager, TaskStatus } from "./manager.ts";
import * as path from 'node:path';
import * as os from 'node:os';

// --- Configuration ---
const PLUGIN_NAME = 'tasks-ai';
const TASK_LIST_ID = process.env.OPENCODE_TASK_LIST_ID || 'default';
const BASE_DIR = path.join(os.homedir(), '.config', 'opencode', 'tasks', TASK_LIST_ID);
const TASKS_FILE = path.join(BASE_DIR, 'tasks.json');

// --- Plugin Definition ---
export const TasksAiPlugin: Plugin = async () => {
  const { tool } = await import("@opencode-ai/plugin");
  const manager = new TaskManager();
  console.log(`[${PLUGIN_NAME}] Loaded. Managing tasks at: ${TASKS_FILE}`);

  return {
    tool: {
      manage_tasks: tool({
        description: 'Manage a persistent task list. Use this to track work, dependencies, and progress.',
        args: {
          command: tool.schema.enum(['list', 'add', 'complete', 'update', 'remove', 'start']).describe('The operation to perform'),
          description: tool.schema.string().optional().describe('Task description'),
          taskId: tool.schema.string().optional().describe('Target task ID'),
          status: tool.schema.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']).optional().describe('Task status'),
          priority: tool.schema.enum(['low', 'medium', 'high']).optional().describe('Task priority'),
          tags: tool.schema.string().optional().describe('Comma-separated tags'),
          dependencies: tool.schema.string().optional().describe('Comma-separated dependency IDs')
        },
        execute: async (args: any) => {
          try {
            switch (args.command) {
              case 'list':
                return JSON.stringify(manager.list(args.status as TaskStatus), null, 2);
              
              case 'add': {
                if (!args.description) throw new Error('Description required');
                const tags = args.tags ? args.tags.split(',').map((s: string) => s.trim()) : [];
                const deps = args.dependencies ? args.dependencies.split(',').map((s: string) => s.trim()) : [];
                const newId = manager.add(args.description, (args.priority as 'low'|'medium'|'high') ?? 'medium', tags, deps);
                return `Task created: ${newId}`;
              }

              case 'complete':
                if (!args.taskId) throw new Error('taskId required');
                manager.update(args.taskId, { status: 'completed' });
                return `Task ${args.taskId} completed.`;

              case 'start':
                if (!args.taskId) throw new Error('taskId required');
                manager.update(args.taskId, { status: 'in_progress' });
                return `Task ${args.taskId} started.`;

              case 'update':
                if (!args.taskId) throw new Error('taskId required');
                manager.update(args.taskId, { 
                  description: args.description, 
                  status: args.status as TaskStatus,
                  priority: args.priority as 'low'|'medium'|'high'
                });
                return `Task ${args.taskId} updated.`;

              case 'remove':
                if (!args.taskId) throw new Error('taskId required');
                manager.remove(args.taskId);
                return `Task ${args.taskId} removed.`;

              default:
                return `Unknown command: ${args.command}`;
            }
          } catch (e: unknown) {
            return `Error: ${e instanceof Error ? e.message : String(e)}`;
          }
        }
      })
    },

    "tool.execute.after": async (input: any, output: any) => {
      // Auto-remind if tasks are in progress
      if (input.tool === 'write' || input.tool === 'edit') {
        const active = manager.list('in_progress');
        if (active.length > 0) {
          const taskList = active.map(t => `- [${t.priority}] ${t.description} (${t.id})`).join('\n');
          
          const hint = `\n\n[System Note]: You have active tasks: \n${taskList}\nDon't forget to 'complete' them if your changes fulfilled the requirements.`;
          
          // Defensive check for the output anomaly
          if (typeof output === 'string') {
            console.log(`[${PLUGIN_NAME}] Active tasks reminder added to output.`);
          } else if (output && typeof output === 'object') {
            const out = output as { content?: string };
            if (typeof out.content === 'string') {
               out.content += hint;
            }
          }
        }
      }
    }
  };
};
