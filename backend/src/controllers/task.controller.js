import * as taskService from '../services/task.service.js';

export const listTasks = async (req, res, next) => {
  try {
    const data = await taskService.listTasks(req.user._id, req.query);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const task = await taskService.createTask(req.user._id, req.body);
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const getTask = async (req, res, next) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.user._id);
    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const updateTask = async (req, res, next) => {
  try {
    const task = await taskService.updateTask(
      req.params.id,
      req.user._id,
      req.body
    );
    res.status(200).json({ success: true, data: task });
  } catch (err) {
    next(err);
  }
};

export const deleteTask = async (req, res, next) => {
  try {
    await taskService.deleteTask(req.params.id, req.user._id);
    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (err) {
    next(err);
  }
};
