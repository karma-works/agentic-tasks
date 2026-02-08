import type { Plugin } from "@opencode-ai/plugin";
import { tool } from "@opencode-ai/plugin";
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { z } from 'zod';

// --- Configuration ---
const PLUGIN_NAME = 'tasks-ai';
const TASK_LIST_ID = process.env.OPENCODE_TASK_LIST_ID || 'default';
const BASE_DIR = path.join(os.homedir(), '.config', 'opencode', 'tasks', TASK_LIST_ID);
const TASKS_FILE = path.join(BASE_DIR, 'tasks.json');
const BACKUP_FILE = path.join(BASE_DIR, 'tasks.json.bak');

// --- Schemas ---
const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']);
const PrioritySchema = z.enum(['low', 'medium', 'high']);

const TaskSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  status: TaskStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  priority: PrioritySchema.default('medium'),
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
});

const TaskListSchema = z.object({
  tasks: z.array(TaskSchema),
  last_updated: z.string(),
  version: z.number(),
});

type Task = z.infer<typeof TaskSchema>;
type TaskList = z.infer<typeof TaskListSchema>;
type TaskStatus = z.infer<typeof TaskStatusSchema>;

// --- Store Logic ---
class TaskStore {
  private ensureBaseDir(): void {
    if (!fs.existsSync(BASE_DIR)) {
      fs.mkdirSync(BASE_DIR, { recursive: true });
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  readTasks(): TaskList {
    if (!fs.existsSync(TASKS_FILE)) {
      return { tasks: [], version: 1, last_updated: this.getTimestamp() };
    }
    try {
      const content = fs.readFileSync(TASKS_FILE, 'utf-8');
      if (!content.trim()) return { tasks: [], version: 1, last_updated: this.getTimestamp() };
      
      const json = JSON.parse(content);
      const parsed = TaskListSchema.safeParse(json);
      if (parsed.success) return parsed.data;
      
      console.error(`[${PLUGIN_NAME}] Invalid task file. Attempting backup recovery.`);
      return this.recoverFromBackup();
    } catch (error) {
      console.error(`[${PLUGIN_NAME}] Read error:`, error);
      return this.recoverFromBackup();
    }
  }

  private recoverFromBackup(): TaskList {
    if (fs.existsSync(BACKUP_FILE)) {
      try {
        const content = fs.readFileSync(BACKUP_FILE, 'utf-8');
        const json = JSON.parse(content);
        if (TaskListSchema.safeParse(json).success) {
          this.ensureBaseDir();
          fs.copyFileSync(BACKUP_FILE, TASKS_FILE);
          console.log(`[${PLUGIN_NAME}] Recovered from backup.`);
          return json;
        }
      } catch (e) { /* ignore */ }
    }
    return { tasks: [], version: 1, last_updated: this.getTimestamp() };
  }

  saveTasks(data: TaskList): void {
    data.last_updated = this.getTimestamp();
    this.ensureBaseDir();
    
    // Backup existing
    if (fs.existsSync(TASKS_FILE)) {
      try {
        fs.copyFileSync(TASKS_FILE, BACKUP_FILE);
      } catch (e) {
        // Ignore backup failure
      }
    }
    
    fs.writeFileSync(TASKS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }
}

// --- Manager Logic ---
class TaskManager {
  private store = new TaskStore();

  list(status?: TaskStatus): Task[] {
    const data = this.store.readTasks();
    return status ? data.tasks.filter(t => t.status === status) : data.tasks;
  }

  add(description: string, priority: 'low'|'medium'|'high' = 'medium', tags: string[] = [], deps: string[] = []): string {
    const data = this.store.readTasks();
    const newTask: Task = {
      id: crypto.randomUUID(),
      description,
      status: deps.length > 0 ? 'blocked' : 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      priority,
      tags,
      dependencies: deps,
    };
    data.tasks.push(newTask);
    this.store.saveTasks(data);
    return newTask.id;
  }

  update(id: string, updates: Partial<Task>): Task | null {
    const data = this.store.readTasks();
    const taskIndex = data.tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return null;

    const task = data.tasks[taskIndex];
    if (!task) return null;
    
    const updatedTask: Task = {
      ...task,
      ...updates,
      updated_at: new Date().toISOString(),
      id: task.id,
      created_at: task.created_at,
      description: updates.description ?? task.description,
      status: updates.status ?? task.status,
      priority: updates.priority ?? task.priority,
      tags: updates.tags ?? task.tags,
      dependencies: updates.dependencies ?? task.dependencies
    };
    
    // Validate status transition
    if (updates.status === 'completed' || updates.status === 'in_progress') {
       const incompleteDeps = data.tasks.filter(t => updatedTask.dependencies.includes(t.id) && t.status !== 'completed');
       if (incompleteDeps.length > 0) {
         throw new Error(`Cannot start/complete task. Dependencies not met: ${incompleteDeps.map(t => t.id).join(', ')}`);
       }
    }

    data.tasks[taskIndex] = updatedTask;
    
    // Unblock dependents
    if (updatedTask.status === 'completed') {
      for (const t of data.tasks) {
        if (t.dependencies.includes(id) && t.status === 'blocked') {
          const stillBlocked = t.dependencies.some(depId => {
            const dep = data.tasks.find(d => d.id === depId);
            return dep && dep.status !== 'completed';
          });
          if (!stillBlocked) {
            t.status = 'pending';
            t.updated_at = new Date().toISOString();
          }
        }
      }
    }

    this.store.saveTasks(data);
    return updatedTask;
  }

  remove(id: string): void {
    const data = this.store.readTasks();
    const hasDependents = data.tasks.some(t => t.dependencies.includes(id));
    if (hasDependents) throw new Error(`Cannot remove task ${id}: other tasks depend on it.`);
    
    data.tasks = data.tasks.filter(t => t.id !== id);
    this.store.saveTasks(data);
  }
}

// --- Plugin Definition ---
export const TasksAiPlugin: Plugin = async () => {
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
        execute: async (args) => {
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

    "tool.execute.after": async (input, output) => {
      // Auto-remind if tasks are in progress
      if (input.tool === 'write' || input.tool === 'edit') {
        const active = manager.list('in_progress');
        if (active.length > 0) {
          const taskList = active.map(t => `- [${t.priority}] ${t.description} (${t.id})`).join('\n');
          
          const hint = `\n\n[System Note]: You have active tasks: \n${taskList}\nDon't forget to 'complete' them if your changes fulfilled the requirements.`;
          
          // Defensive check for the output anomaly
          if (typeof output === 'string') {
            console.log(`[${PLUGIN_NAME}] Active tasks reminder added to output.`);
            // Note: If we can't modify output directly (as it might be passed by value or readonly),
            // we might need to use a different hook or wait for SDK support to modify it.
            // For now, let's at least log it and try to modify if possible.
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
