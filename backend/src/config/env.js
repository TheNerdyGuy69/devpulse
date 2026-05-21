import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(5000),
  MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  CLIENT_URL: Joi.string().uri().default('http://localhost:3000'),
}).unknown(true);

const { value, error } = schema.validate(process.env);

if (error) {
  throw new Error(`Environment validation error: ${error.message}`);
}

export const env = value;
