const express = require('express');
const path = require('path');
const db = require('./db');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

const SECRET_CODE = process.env.LOVELY_LIST_SECRET_CODE || '12345678';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

function isAuthenticated(req, res, next) {
  const secretCode = req.cookies.acces_granted;
  if (secretCode === true) {
    next();
  }

  res.redirect('/login');
}

app.get('/login', (req, res) => {
  if (req.cookies.acces_granted === true) {
    return res.redirect('/');
  }

  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', (req, res) => {
  const { secretCode } = req.body;
  if (secretCode === SECRET_CODE) {
    res.cookie('acces_granted', true, { httpOnly: true , maxAge: 24 * 60 * 60 * 1000 , secure: process.env.NODE_ENV === 'production' });
    return res.redirect('/');
  }
  res.redirect('/login?error=Invalid secret code');
});

app.post('/logout', (req, res) => {
  res.clearCookie('acces_granted');
  res.redirect('/login');
});


app.get('/', isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});