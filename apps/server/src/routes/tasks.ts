import { Router } from 'express'
import Task from '../models/Task.js'

const r = Router()

// list
r.get('/', async (_req, res) => {
  const items = await Task.find().sort({ createdAt: -1 })
  res.json(items)
})

// create
r.post('/', async (req, res) => {
  const { title } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  const created = await Task.create({ title })
  res.status(201).json(created)
})

// toggle done
r.patch('/:id/toggle', async (req, res) => {
  const item = await Task.findById(req.params.id)
  if (!item) return res.status(404).json({ error: 'not found' })
  item.done = !item.done
  await item.save()
  res.json(item)
})

// archive toggle
r.patch('/:id/archive', async (req, res) => {
  const item = await Task.findById(req.params.id)
  if (!item) return res.status(404).json({ error: 'not found' })
  item.archived = !item.archived
  await item.save()
  res.json(item)
})

// delete
r.delete('/:id', async (req, res) => {
  const ret = await Task.findByIdAndDelete(req.params.id)
  if (!ret) return res.status(404).json({ error: 'not found' })
  res.status(204).end()
})

export default r
