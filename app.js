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

// Middleware d'authentification pour les PAGES (renvoie une redirection)
function isAuthForPage(req, res, next) {
  const accessGrantedCookie = req.cookies.access_granted;
  if (accessGrantedCookie === 'true') {
    return next();
  }
  res.redirect('/login');
}

// Middleware d'authentification pour l'API (renvoie une erreur JSON)
function isAuthForApi(req, res, next) {
  const accessGrantedCookie = req.cookies.access_granted;
  if (accessGrantedCookie === 'true') {
    return next();
  }
  // Pour une API, on ne redirige pas, on renvoie un statut d'erreur
  res.status(401).json({ error: 'Authentication required' });
}

// --- ROUTES PUBLIQUES ---

// Route GET pour la page de connexion
app.get('/login', (req, res) => {
  if (req.cookies.access_granted === 'true') {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route POST pour la soumission du formulaire de connexion
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

// Route POST pour la déconnexion
app.post('/logout', (req, res) => {
  res.clearCookie('access_granted');
  res.redirect('/login');
});

// Route GET pour la page principale, protégée par le middleware de page
app.get('/', isAuthForPage, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Toutes les routes API sont protégées par le middleware d'API
app.get('/api/items', isAuthForApi, (req, res) => {
  db.all('SELECT * FROM items ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching items from database: ' + err.message });
    }
    res.json(rows);
  });
});

app.post('/api/items', isAuthForApi, (req, res) => {
  const { content, type } = req.body;
  if (!content || !type) {
    return res.status(400).json({ error: 'Content and type are required' });
  }
  db.run('INSERT INTO items (content, type) VALUES (?, ?)', [content, type], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error adding item to database: ' + err.message });
    }
    res.status(201).json({ id: this.lastID, content, type, is_done: false, created_at: new Date().toISOString() });
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