import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { verifyToken } from '../utils/jwt.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required');
    }

    const token = authHeader.slice(7);

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      throw new ApiError(401, 'Invalid or expired token');
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid or expired token');
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
