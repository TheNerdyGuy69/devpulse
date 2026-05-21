import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'developer', 'viewer'],
      default: 'developer',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

UserSchema.methods.toJSON = function toJSON() {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

export default mongoose.model('User', UserSchema);
