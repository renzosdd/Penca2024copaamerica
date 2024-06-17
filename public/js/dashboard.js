document.addEventListener('DOMContentLoaded', async function() {
    var elems = document.querySelectorAll('.tabs');
    var instances = M.Tabs.init(elems);

    // Inicializar el dropdown
    var dropdownElems = document.querySelectorAll('.dropdown-trigger');
    var dropdownInstances = M.Dropdown.init(dropdownElems, { constrainWidth: false, coverTrigger: false });

    // Inicializar el modal
    var modalElems = document.querySelectorAll('.modal');
    var modalInstances = M.Modal.init(modalElems);

    const userRole = document.querySelector('body').getAttribute('data-role');
    const username = document.querySelector('body').getAttribute('data-username');

    // Mostrar el rol y el nombre de usuario
    console.log('Rol del usuario:', userRole);
    console.log('Nombre de usuario:', username);

    let matches = []; // Definir la variable matches en el contexto adecuado

    // Función para normalizar los nombres de los equipos eliminando tildes y convirtiendo a minúsculas
    const normalizeName = (name) => {
        return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    };

    // Función para formatear la fecha en formato DD/MM/YYYY
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = String(date.getUTCDate()).padStart(2, '0');
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Los meses son de 0 a 11
        const year = date.getUTCFullYear();
        return `${day}/${month}/${year}`;
    };

    // Función para restablecer partidos
    if (userRole === 'admin') {
        document.getElementById('reset-matches-btn').addEventListener('click', async () => {
            if (confirm('¿Estás seguro de que deseas restablecer todos los partidos y predicciones?')) {
                const secondConfirmation = confirm('¡Atención! Esta acción es irreversible. ¿Deseas continuar?');
                if (!secondConfirmation) return;

                try {
                    const response = await fetch('/reset-matches', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include' // Para enviar cookies junto con la solicitud
                    });

                    const result = await response.json();

                    if (response.ok) {
                        M.toast({ html: result.message, classes: 'green' });
                        location.reload();
                    } else {
                        M.toast({ html: result.error, classes: 'red' });
                    }
                } catch (error) {
                    console.error('Error al reestablecer partidos:', error);
                    M.toast({ html: 'Error al reestablecer partidos', classes: 'red' });
                }
            }
        });
    }

    // Función para obtener la URL de la bandera con un fallback a una imagen por defecto
    const getFlagUrl = (team) => {
        const normalizedTeam = normalizeName(team);
        return `/images/${normalizedTeam}.png`;
    };

    // Cargar los partidos
    try {
        const matchesResponse = await fetch('/matches');
        matches = await matchesResponse.json();
        console.log('Partidos cargados correctamente');

        const predictionsResponse = await fetch('/predictions');
        const predictions = await predictionsResponse.json();
        const userPredictions = predictions.filter(prediction => prediction.username === username);

        const matchesList = document.getElementById('matches-list');
        const predictionsList = document.getElementById('predictions-list');
        matchesList.innerHTML = ''; // Limpiar cualquier contenido previo
        predictionsList.innerHTML = ''; // Limpiar cualquier contenido previo

        matches.forEach(match => {
            const team1Flag = getFlagUrl(match.team1);
            const team2Flag = getFlagUrl(match.team2);
            const userPrediction = userPredictions.find(prediction => prediction.matchId.toString() === match._id.toString());

            const formattedDate = formatDate(match.date);
            const matchDate = new Date(`${match.date}T${match.time}:00.000Z`);
            const now = new Date();
            const thirtyMinutesBefore = new Date(matchDate.getTime() - 30 * 60000);
            const editable = now < thirtyMinutesBefore && matchDate > now;

            // Crear tarjeta de fixture
            const matchDiv = document.createElement('div');
            matchDiv.className = 'col s12 m6';
            matchDiv.innerHTML = `
                <div class="card match-card ${match.result1 !== undefined && match.result2 !== undefined ? 'saved' : ''}">
                    <div class="card-content">
                        <div class="row">
                            <div class="col s6">
                                <div class="date-time">
                                    <div class="info">
                                        <img src="/images/cal.png" alt="Fecha" class="small-icon">
                                        <span>${formattedDate}</span>
                                    </div>
                                    <div class="info">
                                        <img src="/images/clock.png" alt="Hora" class="small-icon">
                                        <span>${match.time}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="match-header center-align">
                            <span class="team-name">${match.team1}</span>
                            <span class="vs">vs</span>
                            <span class="team-name">${match.team2}</span>
                        </div>
                        <div class="match-details center-align">
                            <img src="${team1Flag}" alt="${match.team1}" class="circle responsive-img flag" onerror="this.src='/images/default.png'">
                            <div class="input-field inline">
                                <input type="number" class="result-input" name="result1" value="${match.result1 || ''}" required ${userRole !== 'admin' ? 'disabled' : ''} min="0">
                            </div>
                            <span class="vs">-</span>
                            <div class="input-field inline">
                                <input type="number" class="result-input" name="result2" value="${match.result2 || ''}" required ${userRole !== 'admin' ? 'disabled' : ''} min="0">
                            </div>
                            <img src="${team2Flag}" alt="${match.team2}" class="circle responsive-img flag" onerror="this.src='/images/default.png'">
                        </div>
                        <div class="center-align">
                            ${userRole === 'admin' ? `
                            <form id="matchForm-${match._id}" method="POST" action="/matches/update">
                                <input type="hidden" name="matchId" value="${match._id}">
                                <button class="btn waves-effect waves-light blue darken-3" type="submit">Guardar Resultado</button>
                            </form>` : ''}
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
                            <div class="col s6">
                                <div class="date-time">
                                    <div class="info">
                                        <img src="/images/cal.png" alt="Fecha" class="small-icon">
                                        <span>${formattedDate}</span>
                                    </div>
                                    <div class="info">
                                        <img src="/images/clock.png" alt="Hora" class="small-icon">
                                        <span>${match.time}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="col s6 right-align">
                                ${userPrediction ? `<img src="/images/tick.png" alt="Predicción guardada" class="tick-icon right">` : ''}
                            </div>
                        </div>
                        <div class="match-header center-align">
                            <span class="team-name">${match.team1}</span>
                            <span class="vs">vs</span>
                            <span class="team-name">${match.team2}</span>
                        </div>
                        <div class="match-details center-align">
                            <img src="${team1Flag}" alt="${match.team1}" class="circle responsive-img flag" onerror="this.src='/images/default.png'">
                            <div class="input-field inline">
                                <input type="number" class="result-input" name="result1" value="${userPrediction ? userPrediction.result1 : ''}" ${!editable ? 'disabled' : ''} required min="0">
                            </div>
                            <span class="vs">-</span>
                            <div class="input-field inline">
                                <input type="number" class="result-input" name="result2" value="${userPrediction ? userPrediction.result2 : ''}" ${!editable ? 'disabled' : ''} required min="0">
                            </div>
                            <img src="${team2Flag}" alt="${match.team2}" class="circle responsive-img flag" onerror="this.src='/images/default.png'">
                        </div>
                        <div class="center-align">
                            <form id="predictionForm-${match._id}" method="POST" action="/predictions">
                                <input type="hidden" name="matchId" value="${match._id}">
                                <button class="btn waves-effect waves-light blue darken-3" type="submit" ${!editable ? 'disabled' : ''}>Enviar Predicción</button>
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
                        console.log('Predicción enviada exitosamente');
                        M.toast({html: '¡Predicción actualizada correctamente!', classes: 'green'});
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
                            console.log('Resultado enviado exitosamente');
                            M.toast({html: '¡Resultado actualizado correctamente!', classes: 'green'});
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
        M.toast({html: 'Error al cargar los partidos', classes: 'red'});
    }

    // Cargar el ranking
    try {
        const rankingResponse = await fetch('/ranking');
        const ranking = await rankingResponse.json();
        if (!Array.isArray(ranking)) {
            throw new Error('La respuesta del servidor no es un array');
        }
        const rankingList = document.getElementById('ranking-list');
        rankingList.innerHTML = ''; // Limpiar cualquier contenido previo

        const table = document.createElement('table');
        table.className = 'striped';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Jugador</th>
                    <th>Puntaje</th>
                </tr>
            </thead>
            <tbody>
                ${ranking.sort((a, b) => b.score - a.score).map((user, index) => `
                    <tr class="${index === 0 ? 'highlight-first' : ''}">
                        <td>${user.username}</td>
                        <td>${user.score}</td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        rankingList.appendChild(table);
    } catch (error) {
        console.error('Error al cargar el ranking:', error);
        M.toast({html: 'Error al cargar el ranking', classes: 'red'});
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
});
