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
    var collapsibleInstances = M.Collapsible.init(collapsibleElems);

    var pencaItems = document.querySelectorAll('#penca-collapsible li');
    var selectedPencaId = null;
    if (pencaItems.length) {
        var storedPenca = localStorage.getItem('selectedPenca');
        if (storedPenca) {
            selectedPencaId = storedPenca;
        } else {
            selectedPencaId = pencaItems[0].dataset.id;
            localStorage.setItem('selectedPenca', selectedPencaId);
        }
        pencaItems.forEach((item) => {
            if (item.dataset.id === selectedPencaId) {
                item.classList.add('active');
            }
            item.querySelector('.collapsible-header').addEventListener('click', () => {
                selectedPencaId = item.dataset.id;
                localStorage.setItem('selectedPenca', selectedPencaId);
                window.location.reload();
            });
        });
    }

    const userRole = document.querySelector('body').getAttribute('data-role');
    const username = document.querySelector('body').getAttribute('data-username');

    // Mostrar el rol y el nombre de usuario
    debugLog('User Role:', userRole);
    debugLog('Username:', username);

    let matches = []; // Definir la variable matches en el contexto adecuado

    // Función para normalizar los nombres de los equipos eliminando tildes y convirtiendo a minúsculas
    const normalizeName = (name) => {
        return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    };

    // Función para verificar si faltan menos de 30 minutos para el partido
    const isLessThan30MinutesToMatch = (matchDate, matchTime) => {
        const matchDateTime = new Date(`${matchDate}T${matchTime}:00`); // Combinar fecha y hora
        const now = new Date();
        const timeDifference = (matchDateTime - now) / 60000; // Diferencia en minutos

        debugLog(`currentTime (client): ${now}`);
        debugLog(`matchDateTime (client): ${matchDateTime}`);
        debugLog(`timeDifference (client): ${timeDifference} minutos`);

        return timeDifference < 30;
    };

    // Cargar los partidos
    try {
        const matchesResponse = await fetch('/matches');
        matches = await matchesResponse.json();

        // Ordenar los partidos por fecha y hora
        matches.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}:00`);
            const dateB = new Date(`${b.date}T${b.time}:00`);
            return dateA - dateB;
        });

        debugLog('Matches fetched and sorted successfully');

        const predictionsResponse = await fetch('/predictions');
        const predictions = await predictionsResponse.json();
        const userPredictions = predictions.filter(prediction => prediction.username === username && (!selectedPencaId || prediction.pencaId === selectedPencaId));

        const matchesList = document.getElementById('matches-list');
        const predictionsList = document.getElementById('predictions-list');
        matchesList.innerHTML = ''; // Limpiar cualquier contenido previo
        predictionsList.innerHTML = ''; // Limpiar cualquier contenido previo

        matches.forEach(match => {
            const team1Flag = normalizeName(match.team1); // Normalizar el nombre del equipo
            const team2Flag = normalizeName(match.team2); // Normalizar el nombre del equipo
            const userPrediction = userPredictions.find(prediction => prediction.matchId.toString() === match._id.toString());

            // Crear tarjeta de fixture
            const matchDiv = document.createElement('div');
            matchDiv.className = 'col s12 m6';
            matchDiv.innerHTML = `
                <div class="card match-card ${match.result1 !== undefined && match.result2 !== undefined ? 'saved' : ''}">
                    <div class="card-content">
                        <div class="row">
                            <div class="col s10">
                                <div class="date-time">
                                    <div class="info">
                                        <img src="/images/cal.png" alt="Fecha" class="small-icon">
                                        <span>${match.date}</span>
                                    </div>
                                    <div class="info">
                                        <img src="/images/clock.png" alt="Hora" class="small-icon">
                                        <span>${match.time}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="match-header">
                            <div class="team">
                                <img src="/images/${team1Flag}.png" alt="${match.team1}" class="circle responsive-img">
                                <span class="team-name">${match.team1}</span>
                            </div>
                            <span class="vs">vs</span>
                            <div class="team">
                                <img src="/images/${team2Flag}.png" alt="${match.team2}" class="circle responsive-img">
                                <span class="team-name">${match.team2}</span>
                            </div>
                        </div>
                        <div class="match-details">
                            ${userRole === 'admin' ? `
                            <form id="matchForm-${match._id}" method="POST" action="/matches/${match._id}">
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
                </div>
            `;
            matchesList.appendChild(matchDiv);

            // Crear tarjeta de predicciones
            const predictionDiv = document.createElement('div');
            predictionDiv.className = 'col s12 m6';
            predictionDiv.innerHTML = `
                <div class="card match-card ${userPrediction ? 'saved' : ''}">
                    <div class="card-content">
                        <div class="row">
                            <div class="col s10">
                                <div class="date-time">
                                    <div class="info">
                                        <img src="/images/cal.png" alt="Fecha" class="small-icon">
                                        <span>${match.date}</span>
                                    </div>
                                    <div class="info">
                                        <img src="/images/clock.png" alt="Hora" class="small-icon">
                                        <span>${match.time}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col s2">
                                ${userPrediction ? `<img src="/images/tick.png" alt="Predicción guardada" class="tick-icon right">` : ''}
                            </div>
                        </div>
                        <div class="match-header">
                            <div class="team">
                                <img src="/images/${team1Flag}.png" alt="${match.team1}" class="circle responsive-img">
                                <span class="team-name">${match.team1}</span>
                            </div>
                            <span class="vs">vs</span>
                            <div class="team">
                                <img src="/images/${team2Flag}.png" alt="${match.team2}" class="circle responsive-img">
                                <span class="team-name">${match.team2}</span>
                            </div>
                        </div>
                        <div class="match-details">
                            <form id="predictionForm-${match._id}" method="POST" action="/predictions">
                                <input type="hidden" name="matchId" value="${match._id}">
                                <input type="hidden" name="pencaId" value="${selectedPencaId}">
                                <div class="input-field inline">
                                    <input type="number" class="result-input" name="result1" value="${userPrediction ? userPrediction.result1 : ''}" required>
                                    <span>-</span>
                                    <input type="number" class="result-input" name="result2" value="${userPrediction ? userPrediction.result2 : ''}" required>
                                </div>
                                <button class="btn waves-effect waves-light blue darken-3" type="submit">Enviar Predicción</button>
                            </form>
                        </div>
                    </div>
                </div>
            `;
            predictionsList.appendChild(predictionDiv);
        });

        // Añadir eventos de envío para los formularios de predicción
        document.querySelectorAll('form[id^="predictionForm-"]').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());

                // Verificar si faltan menos de 30 minutos para el partido
                const match = matches.find(m => m._id.toString() === data.matchId);
                debugLog('match.date:', match.date); // Agregar esta línea
                debugLog('match.time:', match.time); // Agregar esta línea

                if (isLessThan30MinutesToMatch(match.date, match.time)) {
                    M.toast({html: 'No se puede enviar predicción dentro de los 30 minutos previos al partido', classes: 'red'});
                    return;
                }

                try {
                    const response = await fetch(form.action, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();
                    if (response.ok) {
                        debugLog('Predicción enviada exitosamente');
                        M.toast({html: 'Predicción actualizada correctamente!', classes: 'green'});
                        const matchCard = form.closest('.card');
                        if (matchCard) {
                            matchCard.classList.add('saved');
                            if (!matchCard.querySelector('.tick-icon')) {
                                const tickIcon = document.createElement('img');
                                tickIcon.src = '/images/tick.png';
                                tickIcon.alt = 'Predicción guardada';
                                tickIcon.className = 'tick-icon right';
                                matchCard.querySelector('.row').appendChild(tickIcon);
                            }
                        }
                    } else {
                        console.error('Error:', result.error);
                        M.toast({html: 'Error al actualizar la predicción', classes: 'red'});
                    }
                } catch (error) {
                    console.error('Error al enviar la predicción:', error);
                    M.toast({html: 'Error al enviar la predicción', classes: 'red'});
                }
            });
        });

        // Añadir eventos de envío para los formularios de resultados (solo para admin)
        if (userRole === 'admin') {
            document.querySelectorAll('form[id^="matchForm-"]').forEach(form => {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const formData = new FormData(form);
                    const data = Object.fromEntries(formData.entries());
                    try {
                        const response = await fetch(form.action, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(data)
                        });
                        const result = await response.json();
                        if (response.ok) {
                            debugLog('Resultado enviado exitosamente');
                            M.toast({html: 'Resultado actualizado correctamente!', classes: 'green'});
                            // Recalcular puntaje de todos los usuarios
                            //await fetch('/ranking/recalculate', { method: 'POST' });
                        } else {
                            console.error('Error:', result.error);
                            M.toast({html: 'Error al actualizar el resultado', classes: 'red'});
                        }
                    } catch (error) {
                        console.error('Error al enviar el resultado:', error);
                        M.toast({html: 'Error al enviar el resultado', classes: 'red'});
                    }
                });
            });
        }

    } catch (error) {
        console.error('Error al cargar los partidos:', error);
    }

    // Cargar el ranking
    try {
        const rankingUrl = selectedPencaId ? `/ranking?pencaId=${selectedPencaId}` : '/ranking';
        const rankingResponse = await fetch(rankingUrl);
        if (!rankingResponse.ok) {
            throw new Error(`HTTP error! status: ${rankingResponse.status}`);
        }
        let ranking = await rankingResponse.json();
        const rankingList = document.getElementById('ranking-list');
        rankingList.innerHTML = ''; // Limpiar cualquier contenido previo

        // Ordenar el ranking por puntaje en orden descendente
        ranking.sort((a, b) => b.score - a.score);

        // Encontrar el puntaje más alto
        const highestScore = ranking[0]?.score;

        const collection = document.createElement('ul');
        collection.className = 'collection';

        collection.innerHTML = ranking.map(user => `
            <li class="collection-item avatar ${user.score === highestScore ? 'highlight-first' : ''}">
                <img src="${user.avatar ? '/avatar/' + user.username : '/images/avatar.webp'}" alt="${user.username}" class="circle">
                <span class="title">${user.username}</span>
                <p>Puntaje: ${user.score}</p>
            </li>
        `).join('');

        rankingList.appendChild(collection);
    } catch (error) {
        console.error('Error al cargar el ranking:', error.message);
    }

    // Manejar el cierre de sesión
    document.getElementById('logout-button').addEventListener('click', async () => {
        try {
            const response = await fetch('/logout', { method: 'POST' });
            if (response.ok) {
                window.location.href = '/';
            } else {
                console.error('Error al cerrar sesión');
                M.toast({html: 'Error al cerrar sesión', classes: 'red'});
            }
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            M.toast({html: 'Error al cerrar sesión', classes: 'red'});
        }
    });

    // Verificar si el avatar está disponible
    const avatarImage = document.querySelector('a.dropdown-trigger img');
    const avatarSrc = avatarImage.src;
    const avatarRequest = new XMLHttpRequest();
    avatarRequest.open('GET', avatarSrc, true);
    avatarRequest.onreadystatechange = function() {
        if (avatarRequest.readyState === 4) {
            if (avatarRequest.status !== 200) {
                // Si el avatar no está disponible, usa el avatar por defecto
                avatarImage.src = '/images/avatar.webp';
            }
        }
    };
    avatarRequest.send();

    // Solicitar unirse a una penca
    const joinBtn = document.getElementById('join-button');
    if (joinBtn) {
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

    // Cargar solicitudes y participantes para owners
    if (userRole === 'owner') {
        try {
            const resp = await fetch('/pencas/mine');
            const pencas = await resp.json();
            const container = document.getElementById('manage-content');
            pencas.forEach(penca => {
                const div = document.createElement('div');
                div.innerHTML = `<h5>${penca.name}</h5>`;
                const pending = document.createElement('ul');
                pending.innerHTML = penca.pendingRequests.map(u => `<li>${u.username || u}</li>`).join('');
                div.appendChild(pending);
                container.appendChild(div);
            });
        } catch (err) {
            console.error('load owner pencas error', err);
        }
    }
});
