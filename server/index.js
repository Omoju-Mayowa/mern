import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import 'dotenv/config';
import upload from 'express-fileupload';
import helmet from 'helmet';
import { default as rateLimit } from 'express-rate-limit';

import __dirname from './utils/directory.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// ────────────────────────────────────────────────────────────
// ⚙️ Express setup
// ────────────────────────────────────────────────────────────

const app = express();

app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE']
}));

app.use(upload());
app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use('/uploads', express.static(__dirname + '/../uploads', {
  setHeaders: (res, path) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
  }
}));

app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
app.set('trust proxy', 1);

app.use('/api/users/', userRoutes);
app.use('/api/posts/', postRoutes);

app.use(notFound);
app.use(errorHandler);

async function connectionDatabase() {
  const uris = [
    { uri: process.env.MONGO_URI, label: '☁️  Cloud MongoDB Atlas' },
    { uri: process.env.MONGO_URI_LOCAL, label: '💻 Local MongoDB' }
  ]

  for (const { uri, label } of uris) {
    if(!uri) continue

    try {
      await mongoose.connect(uri)
      console.log(`✅ Connected to ${label}`)
      const dbName = uri.split('/').pop()
      console.log(`📂 Database: ${dbName}`)
      return
    } catch (err) {
      console.warn(`⚠️ Failed to connect to ${label}: ${err.message}`)
    }
  }
  console.error('❌ No MongoDB instance could be reached (offline or online both failed).')
}

await connectionDatabase()

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀Server Started on port ${PORT}`))