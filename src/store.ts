import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { lock, unlock } from 'proper-lockfile';
import { TaskList, TaskListSchema } from './schema';
import { z } from 'zod';

const DEFAULT_TASK_LIST_ID = 'default';
const ENV_TASK_LIST_ID = 'CLAUDE_CODE_TASK_LIST_ID';
const CLAUDE_BASE_DIR = path.join(os.homedir(), '.claude', 'tasks');

function getProjectName(): string | undefined {
  let currentDir = process.cwd();
  while (true) {
    if (fs.existsSync(path.join(currentDir, 'package.json')) || fs.existsSync(path.join(currentDir, '.git'))) {
      return path.basename(currentDir);
    }
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }
    currentDir = parentDir;
  }
  return undefined;
}

export class TaskStore {
  private taskListId: string;
  private basePath: string;
  private tasksFile: string;
  private backupFile: string;

  constructor(taskListId?: string) {
    this.taskListId = taskListId || process.env[ENV_TASK_LIST_ID] || getProjectName() || path.basename(process.cwd()) || DEFAULT_TASK_LIST_ID;
    this.basePath = path.join(CLAUDE_BASE_DIR, this.taskListId);
    this.tasksFile = path.join(this.basePath, 'tasks.json');
    this.backupFile = path.join(this.basePath, 'tasks.json.bak');
    this.ensureDirectory();
  }

  private ensureDirectory() {
    fs.ensureDirSync(this.basePath);
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Reads tasks from the file with validation and auto-recovery.
   */
  async readTasks(): Promise<TaskList> {
    if (!fs.existsSync(this.tasksFile)) {
      return { tasks: [], version: 2, last_updated: this.getTimestamp() };
    }

    let release: (() => Promise<void>) | undefined;

    try {
      // Shared lock for reading? proper-lockfile defaults to exclusive.
      // We can use the 'stale' option or just lock shortly.
      // For read, we might technically strictly not need a lock if we trust atomic writes,
      // but locking ensures we don't read partial writes.
      // However, typical JSON reading is fast. Let's try to get a lock to be safe.
      try {
          release = await lock(this.tasksFile, { retries: 5 });
      } catch (e) {
          console.warn("Could not acquire lock for reading, reading anyway:", e);
      }
      
      const content = await fs.readFile(this.tasksFile, 'utf-8');
      if (!content.trim()) {
         return { tasks: [], version: 2, last_updated: this.getTimestamp() };
      }

      const json = JSON.parse(content);
      const parsed = TaskListSchema.safeParse(json);

      if (parsed.success) {
        return parsed.data;
      } else {
        console.error('Task file validation failed:', parsed.error);
        return await this.recoverFromBackup();
      }

    } catch (error) {
      console.error('Error reading task file:', error);
      return await this.recoverFromBackup();
    } finally {
      if (release) await release();
    }
  }

  /**
   * Attempts to restore tasks from the backup file.
   */
  private async recoverFromBackup(): Promise<TaskList> {
    if (fs.existsSync(this.backupFile)) {
      console.warn('Attempting to recover from backup...');
      try {
        const backupContent = await fs.readFile(this.backupFile, 'utf-8');
        const json = JSON.parse(backupContent);
        const parsed = TaskListSchema.safeParse(json);

        if (parsed.success) {
          // Restore the file
          await fs.copyFile(this.backupFile, this.tasksFile);
          console.log('Restored tasks from backup.');
          return parsed.data;
        } else {
            console.error('Backup file is also invalid.');
        }
      } catch (e) {
          console.error('Failed to recover from backup:', e);
      }
    }
    
    // If recovery fails or no backup, return empty state (or throw?)
    // Returning empty state might wipe data if we save later.
    // Safer to throw error and stop the agent from doing harm.
    throw new Error('Task file is corrupted and no valid backup exists.');
  }

  /**
   * Saves tasks to the file with validation and backup.
   */
  async saveTasks(data: TaskList): Promise<void> {
    // 1. Validate data before doing anything
    const parsed = TaskListSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`Invalid task data: ${parsed.error}`);
    }

    // Update timestamp
    data.last_updated = this.getTimestamp();

    if (!fs.existsSync(this.tasksFile)) {
         // If file doesn't exist, just write it (create directory handled in constructor)
         await fs.outputJson(this.tasksFile, data, { spaces: 2 });
         return;
    }

    let release: (() => Promise<void>) | undefined;
    try {
      release = await lock(this.tasksFile, { retries: 5 });

      // 2. Create Backup of CURRENT valid file
      // We assume if we are about to write, the file on disk might be valid or invalid.
      // But usually we want to backup the *last known good state*.
      // If we read successfully before, we know it's good.
      // But if the file on disk changed since we read, we might be backing up something else.
      // Simple strategy: Copy current file to .bak
      await fs.copyFile(this.tasksFile, this.backupFile);

      // 3. Write new data (Atomic write: write to temp, rename)
      // Since we have a lock, direct write is safe from other tools.
      await fs.writeJson(this.tasksFile, data, { spaces: 2 });
      
      // 4. Update backup to reflect the new valid state
      // This ensures that if external actors (LLM) corrupt the file later,
      // we restore to THIS valid state, not the previous one.
      await fs.copyFile(this.tasksFile, this.backupFile);

    } finally {
      if (release) await release();
    }
  }
}
