document.addEventListener('DOMContentLoaded', async function() {
    const DEBUG = window.DEBUG === true;

    function debugLog(...args) {
        if (DEBUG) {
            console.log(...args);
        }
    }
    var elems = document.querySelectorAll('.tabs');
    var instances = M.Tabs.init(elems);

    // Inicializar el dropdown
    var dropdownElems = document.querySelectorAll('.dropdown-trigger');
    var dropdownInstances = M.Dropdown.init(dropdownElems, { constrainWidth: false, coverTrigger: false });
    var collapsibleElems = document.querySelectorAll('.collapsible');

    var pencaItems = document.querySelectorAll('#pencas-collapsible li');
    var selectedPencaId = null;
    if (pencaItems.length) {
        var storedPenca = localStorage.getItem('selectedPenca');
        if (storedPenca) {
            selectedPencaId = storedPenca;
        } else {
            selectedPencaId = pencaItems[0].dataset.pencaId;
            localStorage.setItem('selectedPenca', selectedPencaId);
        }
        pencaItems.forEach((item) => {
            const header = item.querySelector('.collapsible-header');
            const body = header.nextElementSibling;
            if (item.dataset.pencaId === selectedPencaId) {
                header.classList.add('active');
                if (body) body.style.display = 'block';
            }
            header.addEventListener('click', () => {
                selectedPencaId = item.dataset.pencaId;
                localStorage.setItem('selectedPenca', selectedPencaId);
            });
        });
        M.Collapsible.init(collapsibleElems);
    }

    const pencas = window.PENCAS || [];
    const userRole = document.body.getAttribute('data-role');
    const username = document.body.getAttribute('data-username');

    // Inicializar Materialize
    M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), { constrainWidth: false, coverTrigger: false });
    M.Modal.init(document.querySelectorAll('.modal'));

    const normalizeName = name => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const isLessThan30MinutesToMatch = (matchDate, matchTime) => {
        const matchDateTime = new Date(`${matchDate}T${matchTime}:00`);
        const now = new Date();
        return (matchDateTime - now) / 60000 < 30;
    };

    try {
        const matches = await fetch('/matches').then(r => r.json());
        matches.sort((a,b) => new Date(`${a.date}T${a.time}:00`) - new Date(`${b.date}T${b.time}:00`));
        const allPreds = await fetch('/predictions').then(r => r.json());

        for (const penca of pencas) {
            const pencaMatches = matches.filter(m => {
                if (Array.isArray(penca.fixture) && penca.fixture.length) {
                    return penca.fixture.some(id => id.toString() === m._id.toString());
                }
                if (penca.competition) {
                    return m.competition === penca.competition;
                }
                return true;
            });
            const matchIds = pencaMatches.map(m => m._id.toString());
            const userPreds = allPreds.filter(p => p.username === username && p.pencaId === penca._id && matchIds.includes(p.matchId.toString()));
            const matchesList = document.getElementById(`matches-list-${penca._id}`);
            const predsList = document.getElementById(`predictions-list-${penca._id}`);
            matchesList.innerHTML = '';
            predsList.innerHTML = '';

            pencaMatches.forEach(match => {
                const team1Flag = normalizeName(match.team1);
                const team2Flag = normalizeName(match.team2);
                const userPrediction = userPreds.find(pr => pr.matchId.toString() === match._id.toString());

                const mDiv = document.createElement('div');
                mDiv.className = 'col s12 m6';
                mDiv.innerHTML = `
                    <div class="card match-card ${match.result1 !== undefined && match.result2 !== undefined ? 'saved' : ''}">
                        <div class="card-content">
                            <div class="row">
                                <div class="col s10">
                                    <div class="date-time">
                                        <div class="info"><img src="/images/cal.png" class="small-icon" alt="Fecha"><span>${match.date}</span></div>
                                        <div class="info"><img src="/images/clock.png" class="small-icon" alt="Hora"><span>${match.time}</span></div>
                                    </div>
                                </div>
                            </div>
                            <div class="match-header">
                                <div class="team"><img src="/images/${team1Flag}.png" alt="${match.team1}" class="circle responsive-img"><span class="team-name">${match.team1}</span></div>
                                <span class="vs">vs</span>
                                <div class="team"><img src="/images/${team2Flag}.png" alt="${match.team2}" class="circle responsive-img"><span class="team-name">${match.team2}</span></div>
                            </div>
                            <div class="match-details">
                                ${userRole === 'admin' ? `
                                <form id="matchForm-${penca._id}-${match._id}" method="POST" action="/matches/${match._id}">
                                    <div class="input-field inline">
                                        <input type="number" class="result-input" name="result1" value="${match.result1 || ''}" required>
                                        <span>-</span>
                                        <input type="number" class="result-input" name="result2" value="${match.result2 || ''}" required>
                                    </div>
                                    <button class="btn waves-effect waves-light blue darken-3" type="submit">Guardar Resultado</button>
                                </form>` : `
                                <p>Resultado: ${match.result1 !== undefined ? match.result1 : '-'} - ${match.result2 !== undefined ? match.result2 : '-'}</p>`}
                            </div>
                        </div>
                    </div>`;
                matchesList.appendChild(mDiv);

                const pDiv = document.createElement('div');
                pDiv.className = 'col s12 m6';
                pDiv.innerHTML = `
                    <div class="card match-card ${userPrediction ? 'saved' : ''}">
                        <div class="card-content">
                            <div class="row">
                                <div class="col s10">
                                    <div class="date-time">
                                        <div class="info"><img src="/images/cal.png" class="small-icon" alt="Fecha"><span>${match.date}</span></div>
                                        <div class="info"><img src="/images/clock.png" class="small-icon" alt="Hora"><span>${match.time}</span></div>
                                    </div>
                                </div>
                                <div class="col s2">
                                    ${userPrediction ? `<img src="/images/tick.png" alt="Predicción guardada" class="tick-icon right">` : ''}
                                </div>
                            </div>
                            <div class="match-header">
                                <div class="team"><img src="/images/${team1Flag}.png" alt="${match.team1}" class="circle responsive-img"><span class="team-name">${match.team1}</span></div>
                                <span class="vs">vs</span>
                                <div class="team"><img src="/images/${team2Flag}.png" alt="${match.team2}" class="circle responsive-img"><span class="team-name">${match.team2}</span></div>
                            </div>
                            <div class="match-details">
                                <form id="predictionForm-${penca._id}-${match._id}" method="POST" action="/predictions">
                                    <input type="hidden" name="matchId" value="${match._id}">
                                    <input type="hidden" name="pencaId" value="${penca._id}">
                                    <div class="input-field inline">
                                        <input type="number" class="result-input" name="result1" value="${userPrediction ? userPrediction.result1 : ''}" required>
                                        <span>-</span>
                                        <input type="number" class="result-input" name="result2" value="${userPrediction ? userPrediction.result2 : ''}" required>
                                    </div>
                                    <button class="btn waves-effect waves-light blue darken-3" type="submit">Enviar Predicción</button>
                                </form>
                            </div>
                        </div>
                    </div>`;
                predsList.appendChild(pDiv);
            });
        }

        document.querySelectorAll('form[id^="predictionForm-"]').forEach(form => {
            form.addEventListener('submit', async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(form).entries());
                const match = matches.find(m => m._id.toString() === data.matchId);
                if (isLessThan30MinutesToMatch(match.date, match.time)) {
                    M.toast({html: 'No se puede enviar predicción dentro de los 30 minutos previos al partido', classes: 'red'});
                    return;
                }
                try {
                    const resp = await fetch(form.action, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(data)
                    });
                    const result = await resp.json();
                    if (resp.ok) {
                        M.toast({html: 'Predicción actualizada correctamente!', classes: 'green'});
                        const card = form.closest('.card');
                        if (card) {
                            card.classList.add('saved');
                            if (!card.querySelector('.tick-icon')) {
                                const tick = document.createElement('img');
                                tick.src = '/images/tick.png';
                                tick.alt = 'Predicción guardada';
                                tick.className = 'tick-icon right';
                                card.querySelector('.row').appendChild(tick);
                            }
                        }
                    } else {
                        console.error('Error:', result.error);
                        M.toast({html: 'Error al actualizar la predicción', classes: 'red'});
                    }
                } catch (err) {
                    console.error('Error al enviar la predicción:', err);
                    M.toast({html: 'Error al enviar la predicción', classes: 'red'});
                }
            });
        });

        if (userRole === 'admin') {
            document.querySelectorAll('form[id^="matchForm-"]').forEach(form => {
                form.addEventListener('submit', async e => {
                    e.preventDefault();
                    const data = Object.fromEntries(new FormData(form).entries());
                    try {
                        const resp = await fetch(form.action, {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify(data)
                        });
                        const result = await resp.json();
                        if (resp.ok) {
                            M.toast({html: 'Resultado actualizado correctamente!', classes: 'green'});
                        } else {
                            console.error('Error:', result.error);
                            M.toast({html: 'Error al actualizar el resultado', classes: 'red'});
                        }
                    } catch (err) {
                        console.error('Error al enviar el resultado:', err);
                        M.toast({html: 'Error al enviar el resultado', classes: 'red'});
                    }
                });
            });
        }
    } catch (err) {
        console.error('Error al cargar los partidos:', err);
    }

    // Cargar ranking por penca
    for (const penca of pencas) {
        try {
            const rankingResponse = await fetch(`/ranking?pencaId=${penca._id}`);
            if (!rankingResponse.ok) throw new Error(rankingResponse.status);
            const ranking = await rankingResponse.json();
            ranking.sort((a,b) => b.score - a.score);
            const highest = ranking[0]?.score;
            const list = document.getElementById(`ranking-list-${penca._id}`);
            list.innerHTML = '';
            const col = document.createElement('ul');
            col.className = 'collection';
            col.innerHTML = ranking.map(u => `
                <li class="collection-item avatar ${u.score === highest ? 'highlight-first' : ''}">
                    <img src="${u.avatar ? '/avatar/' + u.username : '/images/avatar.webp'}" alt="${u.username}" class="circle">
                    <span class="title">${u.username}</span>
                    <p>Puntaje: ${u.score}</p>
                </li>
            `).join('');
            list.appendChild(col);
        } catch(err) {
            console.error('Error al cargar el ranking:', err);
        }
    }

    document.getElementById('logout-button').addEventListener('click', async () => {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) { window.location.href = '/'; } else {
                M.toast({html: 'Error al cerrar sesión', classes: 'red'});
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            M.toast({html: 'Error al cerrar sesión', classes: 'red'});
        }
    });

    const avatarImage = document.querySelector('a.dropdown-trigger img');
    if (avatarImage) {
        const req = new XMLHttpRequest();
        req.open('GET', avatarImage.src, true);
        req.onreadystatechange = function() {
            if (req.readyState === 4 && req.status !== 200) {
                avatarImage.src = '/images/avatar.webp';
            }
        };
        req.send();
    }

    const joinBtn = document.getElementById('join-button');
    if (userRole === 'user' && joinBtn) {
        joinBtn.addEventListener('click', async () => {
            const code = document.getElementById('join-code').value;
            try {
                const resp = await fetch('/pencas/join', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ code })
                });
                const data = await resp.json();
                const msg = document.getElementById('join-message');
                if (resp.ok) {
                    msg.textContent = data.message;
                    msg.className = 'green-text';
                } else {
                    msg.textContent = data.error || 'Error';
                    msg.className = 'red-text';
                }
            } catch (err) {
                console.error('join penca error', err);
            }
        });
    }

    if (userRole === 'owner') {
        try {
            const resp = await fetch('/pencas/mine');
            const pencas = await resp.json();
            const container = document.getElementById('manage-content');
            pencas.forEach(p => {
                const div = document.createElement('div');
                div.innerHTML = `<h5>${p.name}</h5>`;
                const pending = document.createElement('ul');
                pending.innerHTML = p.pendingRequests.map(u => `<li>${u.username || u}</li>`).join('');
                div.appendChild(pending);
                container.appendChild(div);
            });
        } catch (err) {
            console.error('load owner pencas error', err);
        }
    }
});
