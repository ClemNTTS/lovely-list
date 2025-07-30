document.addEventListener('DOMContentLoaded', function() {
  const itemList = document.getElementById('itemList');
  const addItemForm = document.getElementById('addItemForm');
  const zonesNav = document.getElementById('zonesNav');
  const createZoneForm = document.getElementById('createZoneForm');
  const showCreateZoneFormBtn = document.getElementById('showCreateZoneFormBtn');
  const cancelCreateZoneFormBtn = document.getElementById('cancelCreateZoneFormBtn');
  const currentZoneNameDisplay = document.getElementById('currentZoneName');

  let currentZoneId = null; // ID de la zone actuellement sélectionnée

  // --- Fonctions de récupération des données ---
  async function fetchZones() {
    try {
      const response = await fetch('/api/zones');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const zones = await response.json();
      renderZones(zones);
      // Sélectionne la première zone par défaut si aucune n'est sélectionnée
      if (zones.length > 0 && currentZoneId === null) {
        selectZone(zones[0].id, zones[0].name);
      } else if (currentZoneId !== null && !zones.some(z => z.id === currentZoneId)) {
        // Si la zone sélectionnée a été supprimée, sélectionne la première
        if (zones.length > 0) {
            selectZone(zones[0].id, zones[0].name);
        } else {
            // Plus de zones, vider la liste d'items
            currentZoneId = null;
            currentZoneNameDisplay.textContent = 'Aucune zone sélectionnée';
            itemList.innerHTML = '';
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des zones:', error);
      if (error.message.includes('Unauthorized')) {
        window.location.href = '/login';
      }
    }
  }

  async function fetchItems() {
    if (currentZoneId === null) {
      itemList.innerHTML = '<p>Veuillez sélectionner ou créer une zone pour voir les items.</p>';
      return;
    }
    try {
      const response = await fetch(`/api/items?zone_id=${currentZoneId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const items = await response.json();
      renderItems(items);
    } catch (error) {
      console.error('Erreur lors de la récupération des items:', error);
      if (error.message.includes('Unauthorized')) {
        window.location.href = '/login';
      }
    }
  }

  // --- Fonctions de rendu ---
  function renderZones(zones) {
    // Vider les onglets existants sauf le bouton "Nouvelle Zone"
    zonesNav.querySelectorAll('.zone-tab').forEach(tab => tab.remove());

    zones.forEach(zone => {
      const button = document.createElement('button');
      button.className = `zone-tab ${zone.id === currentZoneId ? 'active' : ''}`;
      button.textContent = zone.name;
      button.dataset.zoneId = zone.id;
      button.dataset.zoneName = zone.name;
      button.addEventListener('click', () => selectZone(zone.id, zone.name));
      zonesNav.insertBefore(button, showCreateZoneFormBtn); // Insérer avant le bouton "Nouvelle Zone"
    });
  }

  function renderItems(items) {
    itemList.innerHTML = '';
    if (items.length === 0) {
      itemList.innerHTML = `<p>Aucun item dans cette zone. Ajoutez-en un !</p>`;
      return;
    }
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

    // Attacher les écouteurs d'événements aux nouveaux éléments
    attachItemEventListeners();
  }

  function attachItemEventListeners() {
    document.querySelectorAll('.toggle-form').forEach(form => {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = form.dataset.id;
        await fetch(`/api/items/toggle/${id}`, {method: 'POST'});
        fetchItems(); // Rafraîchir la liste
      });
    });

    document.querySelectorAll('.delete-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = form.dataset.id;
        const response = await fetch(`/api/items/${id}`, { method: 'DELETE' });
        if (response.status === 401) {
          window.location.href = '/login';
        }
        fetchItems(); // Rafraîchir la liste
      });
    });
  }

  // --- Fonctions de gestion des zones ---
  function selectZone(zoneId, zoneName) {
    currentZoneId = zoneId;
    currentZoneNameDisplay.textContent = zoneName; // Afficher le nom de la zone
    // Mettre à jour la classe 'active' pour les onglets
    zonesNav.querySelectorAll('.zone-tab').forEach(tab => {
      if (parseInt(tab.dataset.zoneId) === zoneId) { // Utiliser parseInt car dataset renvoie une chaîne
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    fetchItems(); // Recharger les items pour la nouvelle zone
  }

  // --- Écouteurs d'événements globaux ---

  // Gestion du formulaire d'ajout d'item
  addItemForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentZoneId === null) {
      alert('Veuillez sélectionner une zone avant d\'ajouter un item.');
      return;
    }
    const content = addItemForm.querySelector('input[name="content"]').value;
    const type = addItemForm.querySelector('select[name="type"]').value;

    try {
      await fetch('/api/items', {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, type, zone_id: currentZoneId }) // Inclure zone_id
      });
      addItemForm.reset();
      fetchItems(); // Rafraîchir la liste des items de la zone actuelle
    } catch (error) {
      console.error('Erreur lors de l\'ajout de l\'item:', error);
      window.location.href = '/login';
    }
  });

  // Gérer l'affichage/masquage du formulaire de création de zone
  showCreateZoneFormBtn.addEventListener('click', () => {
    createZoneForm.style.display = 'flex';
    showCreateZoneFormBtn.style.display = 'none';
  });

  cancelCreateZoneFormBtn.addEventListener('click', () => {
    createZoneForm.style.display = 'none';
    showCreateZoneFormBtn.style.display = 'inline-block';
    createZoneForm.reset();
  });

  // Gérer la soumission du formulaire de création de zone
  createZoneForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const zoneName = createZoneForm.querySelector('input[name="zoneName"]').value;
    try {
      const response = await fetch('/api/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: zoneName })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      createZoneForm.reset();
      createZoneForm.style.display = 'none';
      showCreateZoneFormBtn.style.display = 'inline-block';
      await fetchZones(); // Recharger toutes les zones pour afficher la nouvelle
    } catch (error) {
      alert('Erreur lors de la création de la zone: ' + error.message);
      if (error.message.includes('Unauthorized')) {
        window.location.href = '/login';
      }
      console.error('Erreur lors de la création de la zone:', error);
    }
  });

  // Initialisation : charger les zones au démarrage
  fetchZones();
});