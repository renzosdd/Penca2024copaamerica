// public/js/admin.js

function initTabs() {
    const tabElems = document.querySelectorAll('.tabs');
    M.Tabs.init(tabElems);
    const links = document.querySelectorAll('.tabs a');
    const contents = document.querySelectorAll('.tab-content');
    if (links.length && contents.length) {
      const activate = id => {
        contents.forEach(c => {
          c.style.display = c.id === id ? 'block' : 'none';
        });
      };
      links.forEach(a => {
        a.addEventListener('click', e => {
          e.preventDefault();
          activate(a.getAttribute('href').substring(1));
        });
      });
      activate(links[0].getAttribute('href').substring(1));
    }
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
  const editSelect = document.getElementById('ownerSelectEdit');
  const list = document.getElementById('ownerList'); // usamos la lista como en main
  fetch('/admin/owners').then(r => r.json()).then(data => {
    [select1, select2, editSelect].forEach(select => {
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

    if (list) {
      list.innerHTML = data.map(o => `
        <li class="collection-item">
          ${o.username}
          <a href="#" class="secondary-content red-text delete-owner" data-id="${o._id}">
            <i class="material-icons">delete</i>
          </a>
        </li>`).join('');
    }
  });
}

  
  function loadCompetitions() {
    const table = document.getElementById('competitionTable');
    const select = document.getElementById('competitionSelectEdit');
    fetch('/admin/competitions').then(r => r.json()).then(data => {
      if (table) {
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = data.map(c => `
          <tr>
            <td>${c.name}</td>
            <td class="right-align">
              <a href="#" class="red-text delete-competition" data-id="${c._id}"><i class="material-icons">delete</i></a>
            </td>
          </tr>`).join('');
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
      const compSelectEdit = document.getElementById('editPencaCompetition');
      if (compSelectEdit) {
        compSelectEdit.innerHTML = '<option value="" disabled selected>Seleccione competencia</option>';
        data.forEach(c => {
          const opt = document.createElement('option');
          opt.value = c._id;
          opt.textContent = c.name;
          compSelectEdit.appendChild(opt);
        });
        initSelects();
      }
    });
  }
  
  function loadPencas() {
    const table = document.getElementById('pencaTable');
    const select = document.getElementById('editPencaSelect');
    fetch('/admin/pencas').then(r => r.json()).then(data => {
      if (table) {
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = data.map(p => `
          <tr>
            <td>${p.name}</td>
            <td class="right-align">
              <a href="#" class="red-text delete-penca" data-id="${p._id}"><i class="material-icons">delete</i></a>
            </td>
          </tr>`).join('');
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

  function setupOwnerForms() {
    const form = document.getElementById('owner-form');
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const data = {
        username: document.getElementById('ownerUser').value,
        email: document.getElementById('ownerEmail').value,
        password: document.getElementById('ownerPassword').value
      };
      try {
        const resp = await fetch('/admin/owners', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (resp.ok) {
          form.reset();
          loadOwners();
          M.toast({ html: 'Owner creado', classes: 'green' });
        } else {
          M.toast({ html: 'Error al crear owner', classes: 'red' });
        }
      } catch (err) {
        console.error(err);
        M.toast({ html: 'Error al crear owner', classes: 'red' });
      }
    });

    const edit = document.getElementById('owner-edit-form');
    edit?.addEventListener('submit', async e => {
      e.preventDefault();
      const id = document.getElementById('ownerSelectEdit').value;
      const data = {
        username: document.getElementById('ownerEditUsername').value || undefined,
        email: document.getElementById('ownerEditEmail').value || undefined
      };
      try {
        const resp = await fetch(`/admin/owners/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (resp.ok) {
          edit.reset();
          loadOwners();
          M.toast({ html: 'Owner actualizado', classes: 'green' });
        } else {
          M.toast({ html: 'Error al actualizar', classes: 'red' });
        }
      } catch (err) {
        console.error(err);
        M.toast({ html: 'Error al actualizar', classes: 'red' });
      }
    });
  }

  function setupCompetitionEditForm() {
    const form = document.getElementById('competition-edit-form');
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const id = document.getElementById('competitionSelectEdit').value;
      const name = document.getElementById('competitionNewName').value;
      try {
        const resp = await fetch(`/admin/competitions/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        if (resp.ok) {
          form.reset();
          loadCompetitions();
          M.toast({ html: 'Competencia actualizada', classes: 'green' });
        } else {
          M.toast({ html: 'Error al actualizar competencia', classes: 'red' });
        }
      } catch (err) {
        console.error(err);
        M.toast({ html: 'Error al actualizar competencia', classes: 'red' });
      }
    });
  }

  function setupPencaEditForm() {
    const form = document.getElementById('penca-edit-form');
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      const id = document.getElementById('editPencaSelect').value;
      const data = {
        name: document.getElementById('editPencaName').value || undefined,
        participantLimit: document.getElementById('editPencaLimit').value || undefined,
        owner: document.getElementById('editPencaOwner').value || undefined,
        competition: document.getElementById('editPencaCompetition').value || undefined
      };
      try {
        const resp = await fetch(`/admin/pencas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (resp.ok) {
          form.reset();
          loadPencas();
          M.toast({ html: 'Penca actualizada', classes: 'green' });
        } else {
          M.toast({ html: 'Error al actualizar penca', classes: 'red' });
        }
      } catch (err) {
        console.error(err);
        M.toast({ html: 'Error al actualizar penca', classes: 'red' });
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

      if (e.target.closest('.delete-owner')) {
        e.preventDefault();
        const id = e.target.closest('.delete-owner').dataset.id;
        if (confirm('¿Eliminar owner?')) {
          fetch(`/admin/owners/${id}`, { method: 'DELETE' })
            .then(() => loadOwners())
            .catch(err => console.error(err));
        }
      }
    });
  }

  function toggleAdminLayout() {
    const mobile = window.innerWidth < 600;
    const tabs = document.querySelector('.tabs');
    if (!tabs) return;
    let accordion = document.getElementById('admin-accordion');
    if (mobile) {
      if (!accordion) {
        accordion = document.createElement('ul');
        accordion.id = 'admin-accordion';
        accordion.className = 'collapsible';
        const links = tabs.querySelectorAll('a');
        links.forEach(link => {
          const id = link.getAttribute('href').substring(1);
          const content = document.getElementById(id);
          if (content) {
            const li = document.createElement('li');
            const header = document.createElement('div');
            header.className = 'collapsible-header';
            header.textContent = link.textContent;
            const body = document.createElement('div');
            body.className = 'collapsible-body';
            body.appendChild(content);
            li.appendChild(header);
            li.appendChild(body);
            accordion.appendChild(li);
          }
        });
        tabs.parentElement.insertBefore(accordion, tabs);
        M.Collapsible.init(accordion);
      }
      tabs.style.display = 'none';
    } else {
      if (accordion) {
        const items = accordion.querySelectorAll('.collapsible-body > div[id]');
        items.forEach(section => {
          tabs.parentElement.appendChild(section);
        });
        accordion.remove();
      }
      tabs.style.display = '';
      initTabs();
    }
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
    setupOwnerForms();
    setupCompetitionEditForm();
    setupPencaEditForm();
    setupRecalculateButton();
    setupDeleteHandlers();
    toggleAdminLayout();
    window.addEventListener('resize', toggleAdminLayout);
  });
