import { z } from 'zod';

// Status Enum
export const TaskStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'blocked',
  'cancelled', // Not in spec, but commonly useful. Will keep strictly to spec if required, but plan mentioned it.
               // Spec says: pending, in_progress, completed, blocked. 
               // Plan's python code had cancelled. Spec doesn't strictly forbid extensions but let's stick to spec for now or add if needed.
               // Re-reading spec: "Status Values: pending, in_progress, completed, blocked".
               // I will add 'cancelled' as an optional extension or just stick to spec.
               // Let's stick to strict spec first.
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

// Priority Enum
export const PrioritySchema = z.enum(['low', 'medium', 'high']);

// Metadata Schema
export const MetadataSchema = z.object({
  priority: PrioritySchema,
  tags: z.array(z.string()),
  source: z.string().optional(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

// Task Schema
export const TaskSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  status: TaskStatusSchema,
  created_at: z.string().datetime({ offset: true }), // ISO 8601
  updated_at: z.string().datetime({ offset: true }), // ISO 8601
  assignee: z.string().nullable().optional(),
  dependencies: z.array(z.string()).optional(),
  parent_id: z.string().optional(),
  metadata: MetadataSchema.optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// Root Object Schema
export const TaskListSchema = z.object({
  tasks: z.array(TaskSchema),
  version: z.number(),
  last_updated: z.string().datetime({ offset: true }),
});

export type TaskList = z.infer<typeof TaskListSchema>;
