import mongoose, { Schema, Model } from 'mongoose';
import { IChat } from '../types';

const chatSchema = new Schema<IChat>(
  {
    participants: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
      ],
      validate: {
        validator: function (participants: mongoose.Types.ObjectId[]) {
          return participants.length === 2 && participants[0].toString() !== participants[1].toString();
        },
        message: 'Chat must have exactly two different participants',
      },
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      required: true,
    },
    initiatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: {
      type: Date,
    },
  },
  {
    timestamps: false,
  }
);

// Indexes
chatSchema.index({ participants: 1 });
chatSchema.index({ status: 1 });
chatSchema.index({ initiatedBy: 1 });
chatSchema.index({ createdAt: -1 });

const Chat: Model<IChat> = mongoose.model<IChat>('Chat', chatSchema);

export default Chat;
