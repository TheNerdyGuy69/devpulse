import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(80),
  email: z.string().trim().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const taskStatus = z.enum(['todo', 'in_progress', 'done', 'archived']);
const taskPriority = z.enum(['low', 'medium', 'high', 'critical']);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  status: taskStatus.optional(),
  priority: taskPriority.optional(),
  tags: z.array(z.string().trim()).optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    status: taskStatus.optional(),
    priority: taskPriority.optional(),
    tags: z.array(z.string().trim()).optional(),
    dueDate: z.coerce.date().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.') || source,
        message: issue.message,
      }));
      return next(new ApiError(400, 'Validation failed', errors));
    }

    req[source] = result.data;
    next();
  };
