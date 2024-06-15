document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.tabs');
    var instances = M.Tabs.init(elems);

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
                                <input type="number" id="result1-${match._id}" placeholder="Resultado ${match.team1}" min="0">
                            </div>
                            <div class="input-field">
                                <input type="number" id="result2-${match._id}" placeholder="Resultado ${match.team2}" min="0">
                            </div>
                            <button class="btn" onclick="saveResult('${match._id}')">Guardar</button>
                        </div>
                    </div>
                `;
                matchesList.appendChild(matchDiv);
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
});
