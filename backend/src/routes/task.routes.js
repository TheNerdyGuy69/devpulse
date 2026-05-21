import { Router } from 'express';
import * as taskController from '../controllers/task.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  createTaskSchema,
  updateTaskSchema,
  validate,
} from '../middleware/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', taskController.listTasks);
router.post('/', validate(createTaskSchema), taskController.createTask);
router.get('/:id', taskController.getTask);
router.patch('/:id', validate(updateTaskSchema), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

export default router;
