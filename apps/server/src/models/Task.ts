import mongoose from 'mongoose'

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  done:  { type: Boolean, default: false },
  archived: { type: Boolean, default: false }
}, { timestamps: true })

export type TaskDoc = mongoose.InferSchemaType<typeof TaskSchema>
export default mongoose.model('Task', TaskSchema)
