import mongoose, { Schema, type InferSchemaType } from 'mongoose'

const TaskSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, default: '' },
    done: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    dueDate: { type: Date },
  },
  { timestamps: true }
)

export type Task = InferSchemaType<typeof TaskSchema> & { _id: string }
export const TaskModel = mongoose.model('Task', TaskSchema)
