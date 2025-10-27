import { Schema, model } from 'mongoose'

const taskSchema = new Schema(
  {
    title:     { type: String, required: true, trim: true },
    done:      { type: Boolean, default: false },
    archived:  { type: Boolean, default: false },
    category:  { type: String, default: '' },
    dueDate:   { type: Date, default: null },
  },
  { timestamps: true }
)

export default model('Task', taskSchema)
