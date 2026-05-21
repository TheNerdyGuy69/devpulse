import Task from '../models/Task.model.js';
import { ApiError } from '../utils/ApiError.js';
import { paginate } from '../utils/paginate.js';

const buildListFilter = (userId, query) => {
  const filter = { userId };

  if (query.status) {
    filter.status = query.status;
  }

  if (query.priority) {
    filter.priority = query.priority;
  }

  if (query.tags) {
    const tags = query.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (tags.length > 0) {
      filter.tags = { $all: tags };
    }
  }

  if (query.dueDate) {
    const day = new Date(query.dueDate);
    if (!Number.isNaN(day.getTime())) {
      const start = new Date(day);
      start.setUTCHours(0, 0, 0, 0);
      const end = new Date(day);
      end.setUTCHours(23, 59, 59, 999);
      filter.dueDate = { $gte: start, $lte: end };
    }
  }

  if (query.search) {
    const regex = { $regex: query.search, $options: 'i' };
    filter.$or = [{ title: regex }, { description: regex }];
  }

  return filter;
};

export const listTasks = async (userId, query = {}) => {
  const { page, limit, skip } = paginate(query);
  const filter = buildListFilter(userId, query);

  const [tasks, total] = await Promise.all([
    Task.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Task.countDocuments(filter),
  ]);

  return {
    tasks,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const createTask = async (userId, data) => {
  return Task.create({ ...data, userId });
};

export const getTaskById = async (taskId, userId) => {
  const task = await Task.findOne({ _id: taskId, userId });
  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  return task;
};

export const updateTask = async (taskId, userId, data) => {
  const task = await Task.findOneAndUpdate(
    { _id: taskId, userId },
    { $set: data },
    { new: true, runValidators: true }
  );

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  return task;
};

export const deleteTask = async (taskId, userId) => {
  const task = await Task.findOneAndDelete({ _id: taskId, userId });

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }

  return task;
};
