document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.tabs');
    var instances = M.Tabs.init(elems);

    fetch('/session')
        .then(response => response.json())
        .then(session => {
            sessionStorage.setItem('userRole', session.user.role);
            const isAdmin = session.user.role === 'admin';
            const isUser = session.user.role === 'user';

            // Fetch matches for fixture tab
            fetch('/matches')
                .then(response => response.json())
                .then(matches => {
                    const matchesList = document.getElementById('matches-list');
                    matches.forEach(match => {
                        const matchDiv = document.createElement('div');
                        matchDiv.innerHTML = `
                            <div class="card">
                                <div class="card-content">
                                    <span class="card-title">${match.team1} vs ${match.team2}</span>
                                    <p>${match.date} ${match.time}</p>
                                    <p>${match.competition} - Grupo ${match.group_name}</p>
                                    <div class="input-field">
                                        <input type="number" id="result1-${match._id}" placeholder="Resultado ${match.team1}" min="0" ${!isAdmin ? 'disabled' : ''}>
                                    </div>
                                    <div class="input-field">
                                        <input type="number" id="result2-${match._id}" placeholder="Resultado ${match.team2}" min="0" ${!isAdmin ? 'disabled' : ''}>
                                    </div>
                                    ${isAdmin ? `<button class="btn" onclick="saveResult('${match._id}')">Guardar</button>` : ''}
                                </div>
                            </div>
                        `;
                        matchesList.appendChild(matchDiv);
                    });
                });

            // Fetch matches for predictions tab
            fetch('/matches')
                .then(response => response.json())
                .then(matches => {
                    const predictionsList = document.getElementById('predictions-list');
                    matches.forEach(match => {
                        const predictionDiv = document.createElement('div');
                        predictionDiv.innerHTML = `
                            <div class="card">
                                <div class="card-content">
                                    <span class="card-title">${match.team1} vs ${match.team2}</span>
                                    <p>${match.date} ${match.time}</p>
                                    <p>${match.competition} - Grupo ${match.group_name}</p>
                                    <div class="input-field">
                                        <input type="number" id="pred-result1-${match._id}" placeholder="Resultado ${match.team1}" min="0" ${!isUser ? 'disabled' : ''}>
                                    </div>
                                    <div class="input-field">
                                        <input type="number" id="pred-result2-${match._id}" placeholder="Resultado ${match.team2}" min="0" ${!isUser ? 'disabled' : ''}>
                                    </div>
                                    ${isUser ? `<button class="btn" onclick="savePrediction('${match._id}')">Guardar</button>` : ''}
                                </div>
                            </div>
                        `;
                        predictionsList.appendChild(predictionDiv);
                    });
                });

            window.saveResult = function(id) {
                const result1 = parseInt(document.getElementById(`result1-${id}`).value);
                const result2 = parseInt(document.getElementById(`result2-${id}`).value);
                if (isNaN(result1) || isNaN(result2)) {
                    alert('Por favor, introduce resultados válidos');
                    return;
                }
                fetch(`/matches/${id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ result1, result2 })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Error al guardar los resultados');
                    } else {
                        alert('Resultados guardados');
                    }
                })
                .catch(err => alert('Error al guardar los resultados'));
            }

            window.savePrediction = function(id) {
                const result1 = parseInt(document.getElementById(`pred-result1-${id}`).value);
                const result2 = parseInt(document.getElementById(`pred-result2-${id}`).value);
                if (isNaN(result1) || isNaN(result2)) {
                    alert('Por favor, introduce resultados válidos');
                    return;
                }
                fetch('/predictions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ matchId: id, result1, result2 })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        alert('Error al guardar la predicción');
                    } else {
                        alert('Predicción guardada');
                    }
                })
                .catch(err => alert('Error al guardar la predicción'));
            }
        })
        .catch(err => console.error('Error fetching session', err));
});
