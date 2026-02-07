import { TaskManager } from './task-manager';
import { TaskStatus } from './schema';

async function main() {
  const manager = new TaskManager();
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'list':
        const status = args[1] as TaskStatus | undefined;
        const tasks = await manager.listTasks(status);
        console.log(JSON.stringify(tasks, null, 2));
        break;

      case 'add':
        const description = args[1];
        if (!description) throw new Error('Description required');
        const priority = (args[2] || 'medium') as 'low' | 'medium' | 'high';
        const tags = args[3] ? args[3].split(',') : [];
        const deps = args[4] ? args[4].split(',') : [];
        const id = await manager.addTask(description, priority, tags, deps);
        console.log(`Task created: ${id}`);
        break;

      case 'complete':
        const completeId = args[1];
        if (!completeId) throw new Error('Task ID required');
        await manager.updateTask(completeId, { status: 'completed' });
        console.log(`Task ${completeId} completed`);
        break;
        
      case 'remove':
          const removeId = args[1];
          if (!removeId) throw new Error('Task ID required');
          await manager.removeTask(removeId);
          console.log(`Task ${removeId} removed`);
          break;

      default:
        console.log('Usage: cli.ts <command> [args...]');
        console.log('Commands: list [status], add <desc> [prio] [tags] [deps], complete <id>, remove <id>');
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof Error) {
        console.error('Error:', error.message);
    } else {
        console.error('Unknown error:', error);
    }
    process.exit(1);
  }
}

main();
