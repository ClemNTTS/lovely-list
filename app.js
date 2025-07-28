const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) {
      res.status(500).send('Error fetching items from database: ' + err.message);
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lovely List</title>
      <link rel="stylesheet" href="/style.css">
    </head>
    <body>
      <div class="container">
        <h1>Lovely List</h1>
        <form id="addItemForm">
          <input type="text" name="content" placeholder="Ajouter une tâche ou une note ..." required>
          <select name="type" required>
            <option value="task">Tâche</option>
            <option value="note">Note</option>
          </select>
          <button type="submit">Ajouter</button>
        </form>
        <ul class="item-list" id="itemList">
        </ul>
      </div>
      <script src="/script.js"></script>
      </body>
    </html>`;
    res.send(htmlContent);
  });
});

app.get('/api/items', (req, res) => {
  db.all('SELECT * FROM items ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Error fetching items from database: ' + err.message });
    }
    res.json(rows);
  })
});

app.post('/api/items', (req, res) => {
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

app.post('/api/items/toggle/:id', (req, res) => {
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

app.delete('/api/items/:id', (req, res) => {
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