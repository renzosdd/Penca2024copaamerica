// public/js/admin.js

function initTabs() {
    M.Tabs.init(document.querySelectorAll('.tabs'));
  }
  
  function initSelects() {
    M.FormSelect.init(document.querySelectorAll('select'));
  }
  
  function initComponents() {
    M.Sidenav.init(document.querySelectorAll('.sidenav'));
    M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), { coverTrigger: false });
  }
  
  function setupUserPagination() {
    let userPage = 0;
    const userLimit = 10;
  
    const loadUsers = () => {
      const select = document.getElementById('user-select');
      if (!select) return;
  
      fetch(`/admin/edit?page=${userPage}&limit=${userLimit}`, { headers: { Accept: 'application/json' } })
        .then(r => r.json())
        .then(data => {
          select.innerHTML = '<option value="" disabled selected>Elige un usuario</option>';
          data.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.username;
            opt.textContent = u.username;
            select.appendChild(opt);
          });
          initSelects();
        });
    };
  
    document.getElementById('next-users')?.addEventListener('click', e => {
      e.preventDefault();
      userPage++;
      loadUsers();
    });
  
    document.getElementById('prev-users')?.addEventListener('click', e => {
      e.preventDefault();
      if (userPage > 0) {
        userPage--;
        loadUsers();
      }
    });
  
    loadUsers();
  }
  
  function loadOwners() {
    const select1 = document.getElementById('pencaOwner');
    const select2 = document.getElementById('editPencaOwner');
    fetch('/admin/owners').then(r => r.json()).then(data => {
      [select1, select2].forEach(select => {
        if (select) {
          select.innerHTML = '<option value="" disabled selected>Seleccione Owner</option>';
          data.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o._id;
            opt.textContent = o.username;
            select.appendChild(opt);
          });
          initSelects();
        }
      });
    });
  }
  
  function loadCompetitions() {
    const list = document.getElementById('competitionList');
    const select = document.getElementById('competitionSelectEdit');
    fetch('/admin/competitions').then(r => r.json()).then(data => {
      if (list) {
        list.innerHTML = data.map(c => `
          <li class="collection-item">
            ${c.name}
            <a href="#" class="secondary-content red-text delete-competition" data-id="${c._id}"><i class="material-icons">delete</i></a>
          </li>`).join('');
      }
      if (select) {
        select.innerHTML = '<option value="" disabled selected>Seleccione competencia</option>';
        data.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c._id;
          opt.textContent = c.name;
          select.appendChild(opt);
        });
        initSelects();
      }
    });
  }
  
  function loadPencas() {
    const list = document.getElementById('pencaList');
    const select = document.getElementById('editPencaSelect');
    fetch('/admin/pencas').then(r => r.json()).then(data => {
      if (list) {
        list.innerHTML = data.map(p => `
          <li class="collection-item">
            ${p.name}
            <a href="#" class="secondary-content red-text delete-penca" data-id="${p._id}"><i class="material-icons">delete</i></a>
          </li>`).join('');
      }
      if (select) {
        select.innerHTML = '<option value="" disabled selected>Seleccione Penca</option>';
        data.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p._id;
          opt.textContent = p.name;
          select.appendChild(opt);
        });
        initSelects();
      }
    });
  }
  
  function setupRecalculateButton() {
    const btn = document.getElementById('recalculate-btn');
    if (btn) {
      btn.addEventListener('click', async () => {
        try {
          const resp = await fetch('/ranking/recalculate', { method: 'POST' });
          const msg = resp.ok ? 'Puntajes recalculados' : 'Error al recalcular';
          const color = resp.ok ? 'green' : 'red';
          M.toast({ html: msg, classes: color });
        } catch (err) {
          console.error(err);
          M.toast({ html: 'Error al recalcular', classes: 'red' });
        }
      });
    }
  }
  
  function setupDeleteHandlers() {
    document.addEventListener('click', e => {
      if (e.target.closest('.delete-competition')) {
        e.preventDefault();
        const id = e.target.closest('.delete-competition').dataset.id;
        if (confirm('¿Estás seguro de eliminar esta competencia?')) {
          fetch(`/admin/competitions/${id}`, { method: 'DELETE' })
            .then(() => loadCompetitions())
            .catch(err => console.error(err));
        }
      }
  
      if (e.target.closest('.delete-penca')) {
        e.preventDefault();
        const id = e.target.closest('.delete-penca').dataset.id;
        if (confirm('¿Estás seguro de eliminar esta penca?')) {
          fetch(`/admin/pencas/${id}`, { method: 'DELETE' })
            .then(() => loadPencas())
            .catch(err => console.error(err));
        }
      }
    });
  }
  
  // Inicialización global
  window.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initSelects();
    initComponents();
    setupUserPagination();
    loadOwners();
    loadCompetitions();
    loadPencas();
    setupRecalculateButton();
    setupDeleteHandlers();
  });
  