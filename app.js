const express = require('express');
const path = require('path');
const db = require('./db');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET_CODE = process.env.LOVELY_LIST_SECRET_CODE || '12345678';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


function isAuthForPage(req, res, next) {
  const accessGrantedCookie = req.cookies.access_granted;
  if (accessGrantedCookie === 'true') {
    return next();
  }
  res.redirect('/login');
}


function isAuthForApi(req, res, next) {
  const accessGrantedCookie = req.cookies.access_granted;
  if (accessGrantedCookie === 'true') {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
}

// --- ROUTES PUBLIQUES ---
app.get('/login', (req, res) => {
  if (req.cookies.access_granted === 'true') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { code } = req.body;

  if (code === SECRET_CODE) {
    res.cookie('access_granted', 'true', {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    });
    return res.redirect('/');
  } else {
    res.redirect('/login?error=true');
  }
});

// --- ROUTES PROTÉGÉES ---
app.post('/logout', (req, res) => {
  res.clearCookie('access_granted');
  res.redirect('/login');
});

app.get('/', isAuthForPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/zones', isAuthForApi, (req, res) => {
  db.all('SELECT * FROM zones ORDER BY created_at ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching zones from database: ' + err.message });
    }
    res.json(rows);
  });
});

app.post('/api/zones', isAuthForApi, (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Zone name is required' });
  }
  db.run('INSERT INTO zones (name) VALUES (?)', [name], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({ error: 'Zone with this name already exist' });
      }  
      return res.status(500).json({ error: 'Error adding zone to database: ' + err.message });
    }
    res.status(201).json({ id: this.lastID, name, created_at: new Date().toISOString() });
  });
});

app.delete('/api/zones/:id', isAuthForApi, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM zones WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json({ message: 'Zone deleted', id });
  });
});

app.get('/api/items', isAuthForApi, (req, res) => {
  const { zone_id } = req.query;
  let query = 'SELECT * FROM items';
  const params = [];
  if (zone_id) {
    query += ' WHERE zone_id = ?';
    params.push(zone_id);
  }
  db.all(query + ' ORDER BY created_at DESC', params, (err, rows) => {
    if (err) {
      console.error('Error fetching items from database:', err);
      return res.status(500).json({ error: 'Error fetching items from database: ' + err.message });
    }
    res.json(rows);
  });
});

app.post('/api/items', isAuthForApi, (req, res) => {
  const { content, type, zone_id } = req.body;
  if (!content || !type || !zone_id) {
    return res.status(400).json({ error: 'Content, type and zone_id are required' });
  }
  db.run('INSERT INTO items (content, type, zone_id) VALUES (?, ?, ?)', [content, type, zone_id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error adding item to database: ' + err.message });
    }
    res.status(201).json({ id: this.lastID, content, type, is_done: false, zone_id, created_at: new Date().toISOString() });
  });
});

app.post('/api/items/toggle/:id', isAuthForApi, (req, res) => {
  const { id } = req.params;
  db.run('UPDATE items SET is_done = NOT is_done WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error updating item in database: ' + err.message });
    }
    res.json({ message: "Item updated successfully" });
  });
});

app.delete('/api/items/:id', isAuthForApi, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM items WHERE id = ?", [id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted', id });
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});