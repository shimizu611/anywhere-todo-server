import 'dotenv/config'
import express, { type Request, type Response } from 'express'
import cors from 'cors'
import morgan from 'morgan'
import mongoose from 'mongoose'
import { z } from 'zod'
import { TaskModel } from './models/Task.js'

const app = express()

// 追加：環境変数から許可オリジンを読み込む（カンマ区切り）
const ALLOWED = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, cb) {
    // curlや同一オリジンの直叩き（Originヘッダなし）は許可
    if (!origin) return cb(null, true)

    // 環境変数が空（＝未設定）のときは許可（開発簡略化）
    if (ALLOWED.length === 0) return cb(null, true)

    // 完全一致で判定（https:// を含む）
    if (ALLOWED.includes(origin)) return cb(null, true)

    // 不一致なら拒否
    return cb(new Error('Not allowed by CORS'))
  },
  credentials: false, // Cookie/JWTを跨いで使わない前提。使うならtrue＋ヘッダ調整が必要
}))
app.use(express.json())
app.use(morgan('dev'))

// --- Mongo ---
const MONGO_URL = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/anywhere_todo'
mongoose
  .connect(MONGO_URL)
  .then(() => console.log('MongoDB connected'))
  .catch((e) => console.error('Mongo error', e))

// --- Health check ---
app.get('/api/health', (_req:Request, res:Response) =>
  res.json({ ok: true, name: 'anywhere-todo', ts: new Date().toISOString() })
)

// --- Zod Schemas ---
const createTaskSchema = z.object({
  title: z.string().min(1),
  category: z.string().optional().default(''),
  dueDate: z.string().datetime().optional(), // ISO文字列
})

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  done: z.boolean().optional(),
  archived: z.boolean().optional(),
})

// ユーティリティ
function parseBool(v: unknown) {
  if (v === undefined) return undefined
  if (v === 'true' || v === true) return true
  if (v === 'false' || v === false) return false
  return undefined
}

// --- List (フィルタ & ソート) ---
app.get('/api/tasks', async (req:Request, res:Response) => {
  const { category = '', includeArchived = 'false', done, sort = 'createdAt', order = 'desc' } =
    req.query as Record<string, string>

  const query: Record<string, any> = {}
  if (category) query.category = category
  if (parseBool(includeArchived) !== true) query.archived = false
  const doneBool = parseBool(done)
  if (doneBool !== undefined) query.done = doneBool

  const sortKey = sort === 'dueDate' ? 'dueDate' : 'createdAt'
  const sortOrder = order === 'asc' ? 1 : -1

  const items = await TaskModel.find(query).sort({ [sortKey]: sortOrder })
  res.json(items)
})

// --- Create ---
app.post('/api/tasks', async (req, res) => {
  const parsed = createTaskSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { title, category, dueDate } = parsed.data
  const doc = await TaskModel.create({ title, category, dueDate })
  res.status(201).json(doc)
})

// --- Update (部分更新) ---
app.patch('/api/tasks/:id', async (req, res) => {
  const parsed = updateTaskSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { id } = req.params
  const payload: any = { ...parsed.data }
  if (payload.dueDate === null) payload.dueDate = undefined // null指定でクリア

  const updated = await TaskModel.findByIdAndUpdate(id, payload, { new: true })
  if (!updated) return res.status(404).json({ error: 'Not found' })
  res.json(updated)
})

// --- Delete ---
app.delete('/api/tasks/:id', async (req, res) => {
  const { id } = req.params
  const r = await TaskModel.findByIdAndDelete(id)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json({ ok: true })
})

// --- 安定トグルAPI（done/archived） ---
app.post('/api/tasks/:id/toggle', async (req, res) => {
  const { id } = req.params
  const { field, value } = req.body as { field: 'done' | 'archived'; value?: boolean }
  if (!field) return res.status(400).json({ error: 'field required' })

  const cur = await TaskModel.findById(id)
  if (!cur) return res.status(404).json({ error: 'Not found' })

  const nextVal = typeof value === 'boolean' ? value : !cur[field]
  const updated = await TaskModel.findByIdAndUpdate(
    id,
    { $set: { [field]: nextVal } },
    { new: true }
  )
  res.json(updated)
})

// --- Start ---
const PORT = Number(process.env.PORT || 5174)
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`)
})
