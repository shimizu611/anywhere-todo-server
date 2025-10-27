import { Router } from 'express'
import Task from '../models/Task.js'
import mongoose from 'mongoose'

const r = Router()
const oid = mongoose.isValidObjectId


// ---- list（クエリ対応）
r.get('/', async (req, res, next) => {
  try {
    const { category, includeArchived, done, sort = 'createdAt', order = 'desc' } = req.query as Record<string, string>

    const filter: any = {}
    if (category) filter.category = category
    // includeArchived が無い/空のときは非アーカイブのみ
    if (!includeArchived) filter.archived = { $ne: true }
    if (done === 'true') filter.done = true
    if (done === 'false') filter.done = false

    const sortKeyAllow = new Set(['createdAt','title','dueDate','category','done','archived'])
    const sortKey = sortKeyAllow.has(sort) ? sort : 'createdAt'
    const sortDir = order === 'asc' ? 1 : -1
    const sortObj: any = { [sortKey]: sortDir }

    const items = await Task.find(filter).sort(sortObj)
    res.json(items)
  } catch (e) { next(e) }
})

// ---- create
r.post('/', async (req, res, next) => {
  try {
    const { title, category, dueDate } = req.body
    if (!title || !title.trim()) return res.status(400).json({ error: 'title required' })
    const created = await Task.create({
      title: title.trim(),
      category: (category ?? '').trim() || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
    })
    res.status(201).json(created)
  } catch (e) { next(e) }
})

// ---- toggle done
r.patch('/:id/toggle', async (req, res, next) => {
  try {
    const item = await Task.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'not found' })
    item.done = !item.done
    await item.save()
    res.json(item)
  } catch (e) { next(e) }
})

// ---- toggle archive
r.patch('/:id/archive', async (req, res, next) => {
  try {
    const item = await Task.findById(req.params.id)
    if (!item) return res.status(404).json({ error: 'not found' })
    item.archived = !item.archived
    await item.save()
    res.json(item)
  } catch (e) { next(e) }
})

// ★ 更新（編集）
r.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!oid(id)) return res.status(400).json({ error: 'bad id' })
    const { title, category, dueDate, done, archived } = req.body

    const updated = await Task.findByIdAndUpdate(
      id,
      {
        ...(title != null ? { title: String(title).trim() } : {}),
        ...(category != null ? { category: String(category).trim() } : {}),
        ...(dueDate != null ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(done != null ? { done: !!done } : {}),
        ...(archived != null ? { archived: !!archived } : {}),
      },
      { new: true }
    )
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  } catch (e) { next(e) }
})

// ★ 削除
r.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!oid(id)) return res.status(400).json({ error: 'bad id' })
    const deleted = await Task.findByIdAndDelete(id)
    if (!deleted) return res.status(404).json({ error: 'not found' })
    res.json({ ok: true })
  } catch (e) { next(e) }
})

export default r
