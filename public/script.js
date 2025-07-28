document.addEventListener('DOMContentLoaded', function() {
  const itemList = document.getElementById('itemList');
  const addItemForm = document.getElementById('addItemForm');

  async function fetchItems() {
    const response = await fetch('/api/items');
    const items = await response.json();
    renderItems(items);
  }

  function renderItems(items) {
    itemList.innerHTML = '';
    items.forEach(item => {
      const li = document.createElement('li');
      li.className = `item ${item.is_done ? 'done' : ''} ${item.type}`;
      li.innerHTML = `
        <span class="content">${item.content}</span>
        <span class="type">${item.type === "task" ? "Tâche" : "Note"}</span>
        <div class="actions">
          ${item.type === 'task' ? `
            <form class="toggle-form" data-id="${item.id}">
              <button type="submit" class="toggle-btn">${item.is_done ? '✅' : '☑️'}</button>
            </form>` : ''}
          <form class="delete-form" data-id="${item.id}">
            <button type="submit" class="delete-btn">🗑️</button>
          </form>
        </div>
      `;
      itemList.appendChild(li);
    });

    document.querySelectorAll('.toggle-form').forEach(form => {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = form.dataset.id;
        await fetch(`/api/items/toggle/${id}`, {method: 'POST'});
        fetchItems();
      });
    })

    document.querySelectorAll('.delete-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = form.dataset.id;
                await fetch(`/api/items/${id}`, { method: 'DELETE' });
                fetchItems(); // Rafraîchir la liste
            });
        });
  }


  addItemForm.addEventListener('submit', async (e) =>{

    e.preventDefault();
    const content = addItemForm.querySelector('input[name="content"]').value;
    const type = addItemForm.querySelector('select[name="type"]').value;

    await fetch('/api/items', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content, type })
    });

    addItemForm.reset();
    fetchItems();

  });
  fetchItems();
});