import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import tasksRouter from './routes/tasks.js'

const app = express()

// CORS
const allowed = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)
  
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true)               // curl 等も許可
    if (allowed.includes(origin)) return cb(null, true)
    return cb(new Error(`Not allowed by CORS: ${origin}`))
  },
  credentials: true
}))

app.use(express.json())


// 動作確認用 10-26
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})


// Health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV, time: new Date().toISOString() })
})

// API
app.use('/api/todos', tasksRouter)

// API以外は404をJSONで
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not Found' }))

// ルート直叩きの案内（人のミス防止）
app.get('/', (_req, res) => {
  res.type('text/plain').send('This is the API server. Open frontend at http://localhost:5173 (dev) or Vercel URL.')
})

const PORT = Number(process.env.PORT ?? 5174)
const MONGO_URL = process.env.MONGO_URL ?? ''

if (!MONGO_URL) {
  console.error('MONGO_URL is not set')
  process.exit(1)
}

mongoose.connect(MONGO_URL).then(() => {
  console.log('✅ MongoDB connected')
  app.listen(PORT, () => {
    const env = process.env.NODE_ENV || 'development';
    if (env === 'production' ){
      console.log(`🚀 API running on Render (PORT=${PORT})`);
    } else {
      console.log(`🚀 API on http://localhost:${PORT}`)  
    }
  });
  }).catch(err => {
  console.error('❌ MongoDB connect error:', err)
  process.exit(1)
})

