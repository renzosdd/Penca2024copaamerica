document.addEventListener('DOMContentLoaded', async function() {
    var elems = document.querySelectorAll('.tabs');
    var instances = M.Tabs.init(elems);

    // Inicializar el dropdown
    var dropdownElems = document.querySelectorAll('.dropdown-trigger');
    var dropdownInstances = M.Dropdown.init(dropdownElems, { constrainWidth: false, coverTrigger: false });

    const userRole = document.querySelector('body').getAttribute('data-role');
    const username = document.querySelector('body').getAttribute('data-username');

    // Mostrar el rol y el nombre de usuario
    console.log('User Role:', userRole);
    console.log('Username:', username);

    let matches = []; // Definir la variable matches en el contexto adecuado

    // Función para normalizar los nombres de los equipos eliminando tildes y convirtiendo a minúsculas
    const normalizeName = (name) => {
        return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
    };

    // Cargar los partidos para el fixture
    if (userRole === 'admin') {
        try {
            const matchesResponse = await fetch('/matches');
            matches = await matchesResponse.json(); // Asignar valor a la variable matches
            console.log('Matches fetched successfully');
            const matchesList = document.getElementById('matches-list');
            matchesList.innerHTML = ''; // Limpiar cualquier contenido previo
            const predictionsResponse = await fetch('/predictions');
            const predictions = await predictionsResponse.json();
            const userPredictions = predictions.filter(prediction => prediction.username === username);

            matches.forEach(match => {
                const team1Flag = normalizeName(match.team1); // Normalizar el nombre del equipo
                const team2Flag = normalizeName(match.team2); // Normalizar el nombre del equipo
                const userPrediction = userPredictions.find(prediction => prediction.matchId.toString() === match._id.toString());

                const matchDiv = document.createElement('div');
                matchDiv.className = 'col s12 m6';
                matchDiv.innerHTML = `
                    <div class="card match-card ${userPrediction ? 'saved' : ''}">
                        <div class="card-content">
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
                                <div class="info">
                                    <img src="/images/cal.png" alt="Fecha">
                                    <p>${match.date}</p>
                                </div>
                                <div class="info">
                                    <img src="/images/clock.png" alt="Hora">
                                    <p>${match.time}</p>
                                </div>
                                <form id="predictionForm-${match._id}" method="POST" action="/predictions">
                                    <input type="hidden" name="matchId" value="${match._id}">
                                    <div class="input-field inline">
                                        <input type="number" class="result-input" name="result1" value="${userPrediction ? userPrediction.result1 : ''}" required>
                                        <span>-</span>
                                        <input type="number" class="result-input" name="result2" value="${userPrediction ? userPrediction.result2 : ''}" required>
                                        <button class="btn waves-effect waves-light blue darken-3" type="submit">Enviar Predicción</button>
                                    </div>
                                </form>
                                ${userPrediction ? `<img src="/images/tick.png" alt="Predicción guardada" class="tick-icon">` : ''}
                            </div>
                        </div>
                    </div>
                `;
                matchesList.appendChild(matchDiv);
            });
        } catch (error) {
            console.error('Error al cargar los partidos:', error);
        }
    }

    // Cargar las predicciones del usuario actual
    try {
        const predictionsResponse = await fetch('/predictions');
        const predictions = await predictionsResponse.json();
        console.log('Predictions fetched successfully');
        const userPredictions = predictions.filter(prediction => prediction.username === username);
        const predictionsList = document.getElementById('predictions-list');
        predictionsList.innerHTML = ''; // Limpiar cualquier contenido previo
        matches.forEach(match => {
            const team1Flag = normalizeName(match.team1); // Normalizar el nombre del equipo
            const team2Flag = normalizeName(match.team2); // Normalizar el nombre del equipo
            const userPrediction = userPredictions.find(prediction => prediction.matchId.toString() === match._id.toString());
            console.log('Processing match:', match._id);
            const predictionDiv = document.createElement('div');
            predictionDiv.className = 'col s12 m6';
            predictionDiv.innerHTML = `
                <div class="card match-card ${userPrediction ? 'saved' : ''}">
                    <div class="card-content">
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
                            <div class="info">
                                <img src="/images/cal.png" alt="Fecha">
                                <p>${match.date}</p>
                            </div>
                            <div class="info">
                                <img src="/images/clock.png" alt="Hora">
                                <p>${match.time}</p>
                            </div>
                            <form id="predictionForm-${match._id}" method="POST" action="/predictions">
                                <input type="hidden" name="matchId" value="${match._id}">
                                <div class="input-field inline">
                                    <input type="number" class="result-input" name="result1" value="${userPrediction ? userPrediction.result1 : ''}" required>
                                    <span>-</span>
                                    <input type="number" class="result-input" name="result2" value="${userPrediction ? userPrediction.result2 : ''}" required>
                                    <button class="btn waves-effect waves-light blue darken-3" type="submit">Enviar Predicción</button>
                                </div>
                            </form>
                            ${userPrediction ? `<img src="/images/tick.png" alt="Predicción guardada" class="tick-icon">` : ''}
                        </div>
                    </div>
                </div>
            `;
            predictionDiv.querySelector('form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const form = e.target;
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
                        // Mostrar mensaje de éxito
                        M.toast({html: 'Predicción actualizada correctamente!', classes: 'green'});
                        // Actualizar el tick verde al guardar la predicción
                        const matchCard = form.closest('.card');
                        if (matchCard) {
                            matchCard.classList.add('saved');
                            if (!matchCard.querySelector('.tick-icon')) {
                                const tickIcon = document.createElement('img');
                                tickIcon.src = '/images/tick.png';
                                tickIcon.alt = 'Predicción guardada';
                                tickIcon.className = 'tick-icon';
                                matchCard.querySelector('.match-details').appendChild(tickIcon);
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
            predictionsList.appendChild(predictionDiv);
        });
    } catch (error) {
        console.error('Error al cargar las predicciones:', error);
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
