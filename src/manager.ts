import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { z } from 'zod';

// --- Configuration ---
const PLUGIN_NAME = 'agentic-tasks';
const TASK_LIST_ID = process.env.OPENCODE_TASK_LIST_ID || 'default';
const BASE_DIR = path.join(os.homedir(), '.config', 'opencode', 'tasks', TASK_LIST_ID);
const TASKS_FILE = path.join(BASE_DIR, 'tasks.json');
const BACKUP_FILE = path.join(BASE_DIR, 'tasks.json.bak');

// --- Schemas ---
export const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']);
export const PrioritySchema = z.enum(['low', 'medium', 'high']);

export const TaskSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  status: TaskStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  priority: PrioritySchema.default('medium'),
  tags: z.array(z.string()).default([]),
  dependencies: z.array(z.string()).default([]),
});

export const TaskListSchema = z.object({
  tasks: z.array(TaskSchema),
  last_updated: z.string(),
  version: z.number(),
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskList = z.infer<typeof TaskListSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

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
export class TaskManager {
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
