import User from '../models/User.model.js';
import { ApiError } from '../utils/ApiError.js';
import { comparePassword, hashPassword } from '../utils/hash.js';
import { signToken } from '../utils/jwt.js';

const buildAuthResponse = (user) => {
  const accessToken = signToken({
    userId: user._id.toString(),
    role: user.role,
  });

  return {
    user,
    accessToken,
  };
};

export const register = async ({ name, email, password }) => {
  const existing = await User.findOne({ email });

  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, email, passwordHash });

  return buildAuthResponse(user);
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isMatch = await comparePassword(password, user.passwordHash);

  if (!isMatch) {
    throw new ApiError(401, 'Invalid email or password');
  }

  user.passwordHash = undefined;
  return buildAuthResponse(user);
};
