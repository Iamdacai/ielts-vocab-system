const express = require('express');
const app = express();
app.use(express.json());
app.get('/api/health', (req, res) => res.json({ status: 'OK', port: 3000 }));
app.get('/api/words/new', (req, res) => {
  const count = parseInt(req.query.count) || 20;
  res.json(Array(count).fill({ word: 'test', id: 1 }));
});
app.post('/api/config', (req, res) => res.json({ success: true, config: req.body }));
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`HTTP test server on port ${PORT}`));
