import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// In-memory sync storage (JSON file in production)
const syncDir = './sync-data';
if (!fs.existsSync(syncDir)) {
  fs.mkdirSync(syncDir);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Sync endpoint - push local changes to server
app.post('/api/sync/push', (req, res) => {
  const { items, lastSync } = req.body;
  
  try {
    const userId = req.headers['x-user-id'] || 'default';
    const syncFile = path.join(syncDir, `${userId}.json`);
    
    const data = {
      items: items,
      lastSync: new Date().toISOString(),
      serverTimestamp: new Date().getTime()
    };
    
    fs.writeFileSync(syncFile, JSON.stringify(data, null, 2));
    
    res.json({
      success: true,
      synced: items.length,
      serverTimestamp: data.serverTimestamp
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync endpoint - pull server changes
app.get('/api/sync/pull', (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'default';
    const syncFile = path.join(syncDir, `${userId}.json`);
    
    if (fs.existsSync(syncFile)) {
      const data = JSON.parse(fs.readFileSync(syncFile, 'utf-8'));
      res.json({
        items: data.items,
        serverTimestamp: data.serverTimestamp
      });
    } else {
      res.json({ items: [], serverTimestamp: Date.now() });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Conflict resolution
app.post('/api/sync/resolve', (req, res) => {
  const { localVersion, serverVersion, resolution } = req.body;
  
  // resolution: 'local' or 'server'
  const winner = resolution === 'local' ? localVersion : serverVersion;
  
  res.json({
    resolved: true,
    winner: winner,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Offline-First Productivity app listening on http://localhost:${PORT}`);
  console.log('💾 Fully functional offline | 🔄 Optional cloud sync');
});
