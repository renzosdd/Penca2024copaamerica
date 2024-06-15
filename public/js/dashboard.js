document.addEventListener('DOMContentLoaded', async function() {
    var elems = document.querySelectorAll('.tabs');
    var instances = M.Tabs.init(elems);

    const userRole = document.querySelector('body').getAttribute('data-role');
    const username = document.querySelector('body').getAttribute('data-username');

    // Mostrar el rol y el nombre de usuario
    alert('User Role: ' + userRole);
    alert('Username: ' + username);

    let matches = []; // Definir la variable matches en el contexto adecuado

    // Cargar los partidos para el fixture
    try {
        const matchesResponse = await fetch('/matches');
        matches = await matchesResponse.json(); // Asignar valor a la variable matches
        alert('Matches fetched successfully');
        const matchesList = document.getElementById('matches-list');
        matchesList.innerHTML = ''; // Limpiar cualquier contenido previo
        matches.forEach(match => {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match-card';
            matchDiv.innerHTML = `
                <div class="match-header">
                    <div class="team">
                        <img src="/images/${match.team1.toLowerCase()}.png" alt="${match.team1}">
                        <span>${match.team1}</span>
                    </div>
                    <span>vs</span>
                    <div class="team">
                        <img src="/images/${match.team2.toLowerCase()}.png" alt="${match.team2}">
                        <span>${match.team2}</span>
                    </div>
                </div>
                <div class="match-details">
                    <p>Fecha: ${match.date} Hora: ${match.time}</p>
                    <p>Resultado: ${match.result1 || '-'} - ${match.result2 || '-'}</p>
                </div>
            `;
            if (userRole === 'admin') {
                matchDiv.innerHTML += `
                    <div class="match-details">
                        <form method="POST" action="/matches/${match._id}">
                            <input type="number" class="result-input" name="result1" value="${match.result1 || ''}" required>
                            <span>-</span>
                            <input type="number" class="result-input" name="result2" value="${match.result2 || ''}" required>
                            <button class="btn waves-effect waves-light" type="submit">Actualizar</button>
                        </form>
                    </div>
                `;
            }
            matchesList.appendChild(matchDiv);
        });
    } catch (error) {
        alert('Error al cargar los partidos: ' + error.message);
        console.error('Error al cargar los partidos:', error);
    }

    // Cargar las predicciones del usuario actual
    try {
        const predictionsResponse = await fetch('/predictions');
        const predictions = await predictionsResponse.json();
        alert('Predictions fetched successfully');
        const userPredictions = predictions.filter(prediction => prediction.username === username);
        const predictionsList = document.getElementById('predictions-list');
        predictionsList.innerHTML = ''; // Limpiar cualquier contenido previo
        matches.forEach(match => {
            const userPrediction = userPredictions.find(prediction => prediction.matchId === match._id);
            alert('Processing match: ' + match._id);
            const predictionDiv = document.createElement('div');
            predictionDiv.className = 'match-card';
            predictionDiv.innerHTML = `
                <div class="match-header">
                    <div class="team">
                        <img src="/images/${match.team1.toLowerCase()}.png" alt="${match.team1}">
                        <span>${match.team1}</span>
                    </div>
                    <span>vs</span>
                    <div class="team">
                        <img src="/images/${match.team2.toLowerCase()}.png" alt="${match.team2}">
                        <span>${match.team2}</span>
                    </div>
                </div>
                <div class="match-details">
                    <p>Fecha: ${match.date} Hora: ${match.time}</p>
                    <form id="predictionForm-${match._id}" method="POST" action="/predictions">
                        <input type="hidden" name="matchId" value="${match._id}">
                        <input type="number" class="result-input" name="result1" value="${userPrediction ? userPrediction.result1 : ''}" required>
                        <span>-</span>
                        <input type="number" class="result-input" name="result2" value="${userPrediction ? userPrediction.result2 : ''}" required>
                        <button class="btn waves-effect waves-light" type="submit">Enviar Predicción</button>
                    </form>
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
                        alert('Predicción enviada exitosamente');
                    } else {
                        alert('Error: ' + result.error);
                    }
                } catch (error) {
                    alert('Error al enviar la predicción: ' + error.message);
                    console.error('Error al enviar la predicción:', error);
                }
            });
            predictionsList.appendChild(predictionDiv);
        });
    } catch (error) {
        alert('Error al cargar las predicciones: ' + error.message);
        console.error('Error al cargar las predicciones:', error);
    }
});
