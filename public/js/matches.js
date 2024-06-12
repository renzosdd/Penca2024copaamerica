import { getFlagImageName } from './utils.js';

export const fetchMatches = async (predictions = []) => {
    fetch('/matches', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            const predictionsList = document.getElementById('predictions-list');
            const fixtureList = document.getElementById('fixture-list');
            if (predictionsList) {
                predictionsList.innerHTML = '';
                const userPredictions = predictions.map(p => p.match_id);
                const now = new Date();
                const lastMatchDate = new Date(Math.max(...data.matches.map(m => new Date(`${m.date}T${m.time}`))));
                const disableNextStage = (lastMatchDate - now) < (2 * 60 * 60 * 1000);

                data.matches.forEach(match => {
                    const card = document.createElement('div');
                    card.className = 'match-card';
                    const matchDate = new Date(`${match.date}T${match.time}`);
                    const canEdit = (matchDate - now) > 30 * 60 * 1000;
                    const isNextStage = ['Cuartos de final', 'Semifinales', '3º Puesto', 'Final'].includes(match.group_name);
                    const prediction = predictions.find(p => p.match_id === match.id);
                    const goals_team1 = prediction ? prediction.goals_team1 : '';
                    const goals_team2 = prediction ? prediction.goals_team2 : '';

                    if (isNextStage && disableNextStage) {
                        card.style.display = 'none';
                    } else {
                        card.style.display = 'block';
                    }

                    card.innerHTML = `
                        <div class="details">
                            <h3>${match.team1} vs ${match.team2}</h3>
                            <p>${match.date} ${match.time}</p>
                            <p>Grupo: ${match.group_name}</p>
                        </div>
                        <div class="teams">
                            <div class="team">
                                <img src="images/${getFlagImageName(match.team1)}.png" alt="${match.team1}">
                                <input type="number" class="prediction-input" id="goals_team1_${match.id}" value="${goals_team1}" ${canEdit ? '' : 'disabled'} min="0">
                            </div>
                            <div class="team">
                                <span>vs</span>
                            </div>
                            <div class="team">
                                <img src="images/${getFlagImageName(match.team2)}.png" alt="${match.team2}">
                                <input type="number" class="prediction-input" id="goals_team2_${match.id}" value="${goals_team2}" ${canEdit ? '' : 'disabled'} min="0">
                            </div>
                        </div>
                        <button onclick="submitPrediction(${match.id})" ${canEdit ? '' : 'disabled'}>Enviar</button>
                    `;
                    predictionsList.appendChild(card);
                });
            }
            if (fixtureList) {
                fixtureList.innerHTML = '';
                data.matches.forEach(match => {
                    const card = document.createElement('div');
                    card.className = 'match-card';
                    card.innerHTML = `
                        <div class="details">
                            <h3>${match.team1} vs ${match.team2}</h3>
                            <p>${match.date} ${match.time}</p>
                            <p>Grupo: ${match.group_name}</p>
                        </div>
                        <div class="teams">
                            <div class="team">
                                <img src="images/${getFlagImageName(match.team1)}.png" alt="${match.team1}">
                                <input type="number" class="result-input" id="result_team1_${match.id}" value="${match.result_team1 !== null ? match.result_team1 : ''}" ${window.currentUser && window.currentUser.isAdmin ? '' : 'disabled'} min="0">
                            </div>
                            <div class="team">
                                <span>vs</span>
                            </div>
                            <div class="team">
                                <img src="images/${getFlagImageName(match.team2)}.png" alt="${match.team2}">
                                <input type="number" class="result-input" id="result_team2_${match.id}" value="${match.result_team2 !== null ? match.result_team2 : ''}" ${window.currentUser && window.currentUser.isAdmin ? '' : 'disabled'} min="0">
                            </div>
                        </div>
                        ${window.currentUser && window.currentUser.isAdmin ? `<button onclick="submitResult(${match.id})">Guardar Resultado</button>` : ''}
                    `;
                    fixtureList.appendChild(card);
                });
            }
        }
    });
};

export const fetchPredictions = async () => {
    const userId = localStorage.getItem('userId');
    fetch(`/predictions/${userId}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            fetchMatches(data.predictions);
        }
    });
};

export const submitPrediction = (matchId) => {
    const goals_team1 = document.getElementById(`goals_team1_${matchId}`).value;
    const goals_team2 = document.getElementById(`goals_team2_${matchId}`).value;

    fetch('/prediction', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            userId: localStorage.getItem('userId'),
            matchId,
            goals_team1,
            goals_team2
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            alert(data.message);
            fetchPredictions();
        }
    });
};

export const submitResult = (matchId) => {
    const result_team1 = document.getElementById(`result_team1_${matchId}`).value;
    const result_team2 = document.getElementById(`result_team2_${matchId}`).value;

    fetch(`/matches/${matchId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
            result_team1,
            result_team2
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            alert(data.message);
            fetchMatches();
        }
    });
};
