let currentUser = null;

const FLAG_MAPPING = {
    'Argentina': 'argentina',
    'Bolivia': 'bolivia',
    'Brasil': 'brasil',
    'Canadá': 'canada',
    'Chile': 'chile',
    'Colombia': 'colombia',
    'Costa Rica': 'costarica',
    'Ecuador': 'ecuador',
    'Estados Unidos': 'estadosunidos',
    'Jamaica': 'jamaica',
    'México': 'mexico',
    'Panamá': 'panama',
    'Paraguay': 'paraguay',
    'Perú': 'peru',
    'Uruguay': 'uruguay',
    'Venezuela': 'venezuela',
    // Agregar más mapeos aquí según sea necesario
};

const getFlagImageName = (team) => {
    return FLAG_MAPPING[team] ? FLAG_MAPPING[team] : 'default';
};

const openTab = (evt, tabName) => {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    const tablinks = document.getElementsByClassName("tablink");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";

    if (tabName === 'Predictions') {
        fetchPredictions();
    } else if (tabName === 'Fixture') {
        fetchFixture();
    }
};

const fetchMatches = (predictions = []) => {
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

                    card.innerHTML = `
                        <div class="details">
                            <h3>${match.team1} vs ${match.team2}</h3>
                            <p>${match.date} ${match.time}</p>
                            <p>Grupo: ${match.group_name}</p>
                        </div>
                        <div class="teams">
                            <div class="team">
                                <img src="images/${getFlagImageName(match.team1)}.png" alt="${match.team1}">
                                <input type="number" class="prediction-input" id="goals_team1_${match.id}" value="${goals_team1}" ${canEdit && !(isNextStage && disableNextStage) ? '' : 'disabled'} min="0">
                            </div>
                            <div class="team">
                                <span>vs</span>
                            </div>
                            <div class="team">
                                <img src="images/${getFlagImageName(match.team2)}.png" alt="${match.team2}">
                                <input type="number" class="prediction-input" id="goals_team2_${match.id}" value="${goals_team2}" ${canEdit && !(isNextStage && disableNextStage) ? '' : 'disabled'} min="0">
                            </div>
                        </div>
                        <button onclick="submitPrediction(${match.id})" ${canEdit && !(isNextStage && disableNextStage) ? '' : 'disabled'}>Enviar</button>
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
                                <input type="number" class="result-input" id="result_team1_${match.id}" value="${match.result_team1 !== null ? match.result_team1 : ''}" ${currentUser && currentUser.isAdmin ? '' : 'disabled'} min="0">
                            </div>
                            <div class="team">
                                <span>vs</span>
                            </div>
                            <div class="team">
                                <img src="images/${getFlagImageName(match.team2)}.png" alt="${match.team2}">
                                <input type="number" class="result-input" id="result_team2_${match.id}" value="${match.result_team2 !== null ? match.result_team2 : ''}" ${currentUser && currentUser.isAdmin ? '' : 'disabled'} min="0">
                            </div>
                        </div>
                        ${currentUser && currentUser.isAdmin ? `<button onclick="submitResult(${match.id})">Guardar Resultado</button>` : ''}
                    `;
                    fixtureList.appendChild(card);
                });
            }
        }
    });
};

const fetchPredictions = () => {
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

const fetchFixture = () => {
    fetchMatches();
};

const login = async () => {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (data.error) {
        alert('Error: ' + data.error);
    } else {
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('user', JSON.stringify(data.user)); // Store the user object
        currentUser = data.user;
        window.location.href = '/';
    }
};

const register = async () => {
    const username = document.getElementById('register-username').value;
    const password = document.getElementById('register-password').value;
    const email = document.getElementById('register-email').value;
    const firstName = document.getElementById('register-firstname').value;
    const lastName = document.getElementById('register-lastname').value;
    const phone = document.getElementById('register-phone').value;

    const response = await fetch('/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password, email, firstName, lastName, phone })
    });

    const data = await response.json();

    if (data.error) {
        alert('Error: ' + data.error);
    } else {
        alert('Usuario registrado correctamente');
        document.getElementById('registerModal').style.display = 'none';
    }
};

const updateProfile = async () => {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const phone = document.getElementById('phone').value;
    const email = document.getElementById('email').value;
    const userId = localStorage.getItem('userId');

    const response = await fetch(`/profile/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ firstName, lastName, phone, email })
    });

    const data = await response.json();

    if (data.error) {
        alert('Error: ' + data.error);
    } else {
        alert('Perfil actualizado correctamente');
    }
};

const submitPrediction = (matchId) => {
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

const submitResult = (matchId) => {
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

const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return false;
    }
    currentUser = JSON.parse(localStorage.getItem('user'));
    return true;
};

const fetchUser = async () => {
    try {
        const response = await fetch('/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const data = await response.json();
        if (data.error) {
            console.error('Error fetching user:', data.error);
            return;
        }

        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));

        const userMenu = document.getElementById('userMenu');
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');

        if (currentUser) {
            userMenu.style.display = 'block';
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            document.getElementById('avatarBtn').src = currentUser.avatar;
        } else {
            userMenu.style.display = 'none';
            loginBtn.style.display = 'block';
            registerBtn.style.display = 'block';
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }
};

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await login();
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await register();
        });
    }

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateProfile();
        });
    }

    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('user'); // Clear the stored user data
            window.location.href = '/login';
        });
    }

    const avatarBtn = document.getElementById('avatarBtn');
    if (avatarBtn) {
        avatarBtn.addEventListener('click', () => {
            const dropdown = document.getElementById('dropdown');
            if (dropdown) {
                dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
            }
        });
    }

    const spans = document.getElementsByClassName('close');
    Array.from(spans).forEach(span => {
        span.onclick = function () {
            const modal = span.parentElement.parentElement;
            if (modal) {
                modal.style.display = 'none';
            }
        };
    });

    window.onclick = function (event) {
        const registerModal = document.getElementById('registerModal');
        if (event.target === registerModal) {
            registerModal.style.display = 'none';
        }
    };

    if (localStorage.getItem('token')) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        fetchPredictions();
        fetchFixture();
        fetchUser(); // Ensure user data is fetched on load
    }

    window.onload = async () => {
        fetchPredictions();
        fetchFixture();
        if (!currentUser) {
            fetchUser(); // Fetch user data if not already fetched
        }
    };

    // Llama a la función para actualizar los cruces de predicciones
    updatePredictionRounds();
});


// Fetch standings and update standings table
const fetchStandings = () => {
    fetch('/standings', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        const standingsTable = document.getElementById('standings-table');
        if (standingsTable) {
            standingsTable.innerHTML = `
                <tr>
                    <th>Grupo</th>
                    <th>Equipo</th>
                    <th>Puntos</th>
                    <th>Goles a Favor</th>
                    <th>Goles en Contra</th>
                    <th>Diferencia de Goles</th>
                </tr>
            `;
            data.standings.forEach(team => {
                standingsTable.innerHTML += `
                    <tr>
                        <td>${team.group_name}</td>
                        <td>${team.team}</td>
                        <td>${team.points}</td>
                        <td>${team.goals_for}</td>
                        <td>${team.goals_against}</td>
                        <td>${team.goal_difference}</td>
                    </tr>
                `;
            });
        }
    });
};

document.getElementById("defaultOpen").addEventListener('click', () => {
    fetchStandings();
});

const updatePredictionRounds = () => {
    fetch('/predictions/updateNextRounds', {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            alert('Error: ' + data.error);
        } else {
            console.log(data.message);
            fetchPredictions();
        }
    });
};
