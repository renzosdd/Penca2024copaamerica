document.addEventListener('DOMContentLoaded', async function() {
    var elems = document.querySelectorAll('.tabs');
    var instances = M.Tabs.init(elems);

    const userRole = 'user'; // Cambiar esto dinámicamente según el rol del usuario autenticado

    // Cargar los partidos para el fixture
    try {
        const matchesResponse = await fetch('/matches');
        const matches = await matchesResponse.json();
        const matchesList = document.getElementById('matches-list');
        matchesList.innerHTML = ''; // Limpiar cualquier contenido previo
        matches.forEach(match => {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match-card';
            matchDiv.innerHTML = `
                <div class="match-header">
                    <div class="team">
                        <img src="/flags/${match.team1.toLowerCase()}.png" alt="${match.team1}">
                        <span>${match.team1}</span>
                    </div>
                    <span>vs</span>
                    <div class="team">
                        <img src="/flags/${match.team2.toLowerCase()}.png" alt="${match.team2}">
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
        console.error('Error al cargar los partidos:', error);
    }

    // Cargar los partidos para las predicciones
    try {
        const predictionsResponse = await fetch('/matches');
        const predictions = await predictionsResponse.json();
        const predictionsList = document.getElementById('predictions-list');
        predictionsList.innerHTML = ''; // Limpiar cualquier contenido previo
        predictions.forEach(match => {
            const predictionDiv = document.createElement('div');
            predictionDiv.className = 'match-card';
            predictionDiv.innerHTML = `
                <div class="match-header">
                    <div class="team">
                        <img src="/flags/${match.team1.toLowerCase()}.png" alt="${match.team1}">
                        <span>${match.team1}</span>
                    </div>
                    <span>vs</span>
                    <div class="team">
                        <img src="/flags/${match.team2.toLowerCase()}.png" alt="${match.team2}">
                        <span>${match.team2}</span>
                    </div>
                </div>
                <div class="match-details">
                    <p>Fecha: ${match.date} Hora: ${match.time}</p>
                    <form id="predictionForm" method="POST" action="/predictions">
                        <input type="hidden" name="matchId" value="${match._id}">
                        <input type="number" class="result-input" name="result1" required>
                        <span>-</span>
                        <input type="number" class="result-input" name="result2" required>
                        <button class="btn waves-effect waves-light" type="submit">Enviar Predicción</button>
                    </form>
                </div>
            `;
            predictionsList.appendChild(predictionDiv);
        });
    } catch (error) {
        console.error('Error al cargar las predicciones:', error);
    }
});
