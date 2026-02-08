#!/usr/bin/env npx ts-node
import { TaskManager } from './tasks_ai';

const manager = new TaskManager();
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'list':
        const status = args[1] as any;
        console.log(JSON.stringify(manager.list(status), null, 2));
        break;

      case 'add':
        const desc = args[1];
        const priority = args[2] as any || 'medium';
        const tags = args[3] ? args[3].split(',') : [];
        const deps = args[4] ? args[4].split(',') : [];
        if (!desc) throw new Error('Description required');
        const id = manager.add(desc, priority, tags, deps);
        console.log(`Task created: ${id}`);
        break;

      case 'complete':
        if (!args[1]) throw new Error('taskId required');
        manager.update(args[1], { status: 'completed' });
        console.log(`Task ${args[1]} completed.`);
        break;

      case 'start':
        if (!args[1]) throw new Error('taskId required');
        manager.update(args[1], { status: 'in_progress' });
        console.log(`Task ${args[1]} started.`);
        break;

      case 'update':
        if (!args[1]) throw new Error('taskId required');
        const updates: any = {};
        if (args[2]) updates.description = args[2];
        if (args[3]) updates.status = args[3];
        if (args[4]) updates.priority = args[4];
        manager.update(args[1], updates);
        console.log(`Task ${args[1]} updated.`);
        break;

      case 'remove':
        if (!args[1]) throw new Error('taskId required');
        manager.remove(args[1]);
        console.log(`Task ${args[1]} removed.`);
        break;

      default:
        console.log('Usage: tasks.sh <command> [args]');
        console.log('Commands: list [status], add <desc> [priority] [tags] [deps], complete <id>, start <id>, update <id> [desc] [status] [priority], remove <id>');
        process.exit(1);
    }
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
    process.exit(1);
  }
}

main();
