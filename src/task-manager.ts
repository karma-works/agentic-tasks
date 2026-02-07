import { v4 as uuidv4 } from 'uuid';
import { TaskStore } from './store';
import { Task, TaskList, TaskStatus } from './schema';

export class TaskManager {
  private store: TaskStore;

  constructor(taskListId?: string) {
    this.store = new TaskStore(taskListId);
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  async listTasks(statusFilter?: TaskStatus): Promise<Task[]> {
    const data = await this.store.readTasks();
    if (statusFilter) {
      return data.tasks.filter((t) => t.status === statusFilter);
    }
    return data.tasks;
  }

  async addTask(
    description: string,
    priority: 'low' | 'medium' | 'high' = 'medium',
    tags: string[] = [],
    dependencies: string[] = []
  ): Promise<string> {
    const data = await this.store.readTasks();
    
    // Validate dependencies
    const existingIds = new Set(data.tasks.map((t) => t.id));
    for (const depId of dependencies) {
      if (!existingIds.has(depId)) {
        throw new Error(`Dependency task ID not found: ${depId}`);
      }
    }

    // Determine status
    let status: TaskStatus = 'pending';
    if (dependencies.length > 0) {
      const incompleteDeps = data.tasks.filter(
        (t) => dependencies.includes(t.id) && t.status !== 'completed'
      );
      if (incompleteDeps.length > 0) {
        status = 'blocked';
      }
    }

    const newTask: Task = {
      id: uuidv4(),
      description,
      status,
      created_at: this.getTimestamp(),
      updated_at: this.getTimestamp(),
      assignee: null, // Explicitly null as per schema
      dependencies: dependencies.length > 0 ? dependencies : undefined,
      metadata: {
        priority,
        tags,
        source: 'user', // Default source
      },
    };

    data.tasks.push(newTask);
    await this.store.saveTasks(data);
    return newTask.id;
  }

  async updateTask(taskId: string, updates: Partial<Omit<Task, 'id' | 'created_at' | 'updated_at' | 'metadata'> & { metadata?: Partial<Task['metadata']> }>): Promise<void> {
      const data = await this.store.readTasks();
      const task = data.tasks.find(t => t.id === taskId);
      
      if (!task) {
          throw new Error(`Task not found: ${taskId}`);
      }

      const previousStatus = task.status;

      // Merge updates
      if (updates.description) task.description = updates.description;
      if (updates.assignee !== undefined) task.assignee = updates.assignee;
      if (updates.dependencies) task.dependencies = updates.dependencies;
      
      if (updates.metadata) {
          task.metadata = {
              priority: task.metadata?.priority || 'medium',
              tags: task.metadata?.tags || [],
              source: task.metadata?.source,
              ...updates.metadata,
          };
      }

      if (updates.status) {
          this.validateStatusTransition(task, updates.status, data.tasks);
          task.status = updates.status;
      }

      task.updated_at = this.getTimestamp();
      
      if (task.status === 'completed' && previousStatus !== 'completed') {
          this.unblockDependents(data.tasks, taskId);
      }

      await this.store.saveTasks(data);
  }

  async removeTask(taskId: string): Promise<void> {
      const data = await this.store.readTasks();
      
      // Check if any other task depends on this one
      const dependent = data.tasks.find(t => t.dependencies?.includes(taskId));
      if (dependent) {
          throw new Error(`Cannot delete task ${taskId}; it is a dependency for ${dependent.id}`);
      }

      data.tasks = data.tasks.filter(t => t.id !== taskId);
      await this.store.saveTasks(data);
  }

  private validateStatusTransition(task: Task, newStatus: TaskStatus, allTasks: Task[]) {
      if (newStatus === 'in_progress' || newStatus === 'completed') {
          // Check dependencies
          if (task.dependencies && task.dependencies.length > 0) {
              const incompleteDeps = allTasks.filter(
                  t => task.dependencies!.includes(t.id) && t.status !== 'completed'
              );
              if (incompleteDeps.length > 0) {
                   throw new Error(`Cannot set task ${task.id} to ${newStatus}; dependencies not completed: ${incompleteDeps.map(d => d.id).join(', ')}`);
              }
          }
      }
  }

  private unblockDependents(allTasks: Task[], completedTaskId: string) {
      const dependents = allTasks.filter(t => t.dependencies?.includes(completedTaskId));
      
      for (const dep of dependents) {
          if (dep.status === 'blocked') {
              // Check if ALL dependencies are now completed
              const incompleteDeps = allTasks.filter(
                  t => dep.dependencies!.includes(t.id) && t.status !== 'completed'
              );
              
              // Note: At this point, the task 'completedTaskId' is updated in memory object 'task' 
              // but we are iterating 'allTasks'.
              // We need to ensure 'allTasks' reflects the new status of the completed task.
              // In `updateTask`, we modified the task object inside the array. 
              // Since objects are references, `t` in `allTasks` should be updated.
              
              if (incompleteDeps.length === 0) {
                  dep.status = 'pending';
                  dep.updated_at = this.getTimestamp();
              }
          }
      }
  }
}
