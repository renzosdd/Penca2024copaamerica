import { login, register, logout, fetchUser } from './auth.js';
import { fetchMatches, fetchPredictions, submitPrediction, submitResult } from './matches.js';
import { updateProfile } from './profile.js';

window.currentUser = JSON.parse(localStorage.getItem('user'));

window.openTab = (evt, tabName) => {
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
        fetchMatches();
    } else if (tabName === 'Leaderboard') {
        fetchLeaderboard();
    }
};

const profileModal = document.getElementById('profileModal');
const registerModal = document.getElementById('registerModal');
const registerModalBtn = document.getElementById('registerModalBtn');
const closeRegisterModal = document.getElementById('closeRegisterModal');
const closeProfile = document.getElementsByClassName('close')[0];
const profileBtn = document.getElementById('profileBtn');

if (registerModalBtn) {
    registerModalBtn.onclick = () => {
        registerModal.style.display = 'block';
    };
}

if (closeRegisterModal) {
    closeRegisterModal.onclick = () => {
        registerModal.style.display = 'none';
    };
}

if (profileBtn) {
    profileBtn.onclick = () => {
        profileModal.style.display = 'block';
        loadProfileData();
    };
}

if (closeProfile) {
    closeProfile.onclick = () => {
        profileModal.style.display = 'none';
    };
}

window.onclick = (event) => {
    if (event.target == registerModal) {
        registerModal.style.display = 'none';
    }
    if (event.target == profileModal) {
        profileModal.style.display = 'none';
    }
};

const loadProfileData = async () => {
    const user = await fetchUser();
    document.getElementById('firstName').value = user.firstName || '';
    document.getElementById('lastName').value = user.lastName || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('phone').value = user.phone || '';
};

const fetchLeaderboard = async () => {
    const response = await fetch('/leaderboard', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });
    const data = await response.json();
    const tableBody = document.getElementById('leaderboard-table').getElementsByTagName('tbody')[0];
    tableBody.innerHTML = '';
    data.forEach(user => {
        const row = tableBody.insertRow();
        row.insertCell(0).innerText = user.username;
        row.insertCell(1).innerText = user.firstName;
        row.insertCell(2).innerText = user.lastName;
        row.insertCell(3).innerText = user.points;
    });
};

document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const success = await login();
            if (success) {
                window.location.href = '/index.html';
            }
        });
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const success = await register();
            if (success) {
                registerModal.style.display = 'none';
            }
        });
    }

    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateProfile();
            profileModal.style.display = 'none';
        });
    }

    const logoutButton = document.getElementById('logoutBtn');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            logout();
            window.location.href = '/login.html';
        });
    }

    if (localStorage.getItem('token')) {
        window.currentUser = JSON.parse(localStorage.getItem('user'));
        setUserAvatar();
        fetchPredictions();
        fetchMatches();
        loadProfileData();
    }
});

window.submitPrediction = (matchId) => {
    const goals_team1 = document.getElementById(`goals_team1_${matchId}`).value;
    const goals_team2 = document.getElementById(`goals_team2_${matchId}`).value;

    if (goals_team1 && goals_team2) {
        submitPrediction(matchId);
    } else {
        alert('Both fields must be filled');
    }
};

window.submitResult = submitResult;

const setUserAvatar = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    const avatar = user.avatar ? user.avatar : 'images/avatar.webp';
    document.getElementById('user-avatar').src = avatar;
    document.getElementById('user-name').textContent = user.username;
};

if (localStorage.getItem('token')) {
    setUserAvatar();
}
