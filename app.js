const express = require('express');
const path = require('path');
const db = require('./db');
const cookieParser = require('cookie-parser');
require('dotenv').config(); // Gardez cette ligne si vous utilisez un fichier .env localement

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET_CODE = process.env.LOVELY_LIST_SECRET_CODE || '12345678';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Middleware pour parser les cookies
app.use(express.static(path.join(__dirname, 'public'))); // Sert les fichiers statiques depuis le dossier 'public'

// Middleware d'authentification corrigé
function isAuthenticated(req, res, next) {
  const accessGrantedCookie = req.cookies.access_granted; // <-- CORRECTION ICI : Nom du cookie (access_granted)
  if (accessGrantedCookie === 'true') { // <-- La valeur est la STRING 'true'
    next();
    return;
  }

  res.redirect('/login');
}

// Route GET pour la page de connexion
app.get('/login', (req, res) => {
  if (req.cookies.access_granted === 'true') { // <-- CORRECTION ICI : Nom du cookie (access_granted)
    return res.redirect('/');
  }

  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Route POST pour la soumission du formulaire de connexion
app.post('/login', (req, res) => {
  const { code } = req.body;

  if (code === SECRET_CODE) {
    // Si le code est correct, définit le cookie d'accès
    res.cookie('access_granted', 'true', { // <-- CORRECTION ICI : Nom du cookie (access_granted) ET valeur STRING 'true'
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === 'production',
    });
    return res.redirect('/');
  } else {
    // Si le code est incorrect, redirige vers la page de connexion avec un paramètre d'erreur
    res.redirect('/login?error=true'); // Garder 'error=true' pour la cohérence avec login.html
  }
});

// Route POST pour la déconnexion
app.post('/logout', (req, res) => {
  res.clearCookie('access_granted'); // <-- CORRECTION ICI : Nom du cookie (access_granted)
  res.redirect('/login');
});


// Route GET pour la page principale, protégée par l'authentification
app.get('/', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Routes API, protégées par l'authentification
app.get('/api/items', isAuthenticated , (req, res) => {
  db.all('SELECT * FROM items ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching items from database: ' + err.message });
    }
    res.json(rows);
  })
});

app.post('/api/items', isAuthenticated, (req, res) => {
  const {content, type} = req.body;
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

app.post('/api/items/toggle/:id', isAuthenticated, (req, res) => {
  const {id} = req.params;
  db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching item from database: ' + err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Item not found' });
    }
    const newIsDone = !row.is_done;
    db.run('UPDATE items SET is_done = ? WHERE id = ?', [newIsDone, id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Error updating item in database: ' + err.message });
      }
      res.json({message: "Item updated successfully" ,id, is_done: newIsDone });
    });
  })
});

app.delete('/api/items/:id', isAuthenticated, (req, res) => {
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