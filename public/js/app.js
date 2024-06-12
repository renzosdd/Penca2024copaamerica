import { login, register, logout } from './auth.js';
import { fetchMatches, fetchPredictions, submitPrediction, submitResult } from './matches.js';
import { updateProfile, fetchUser } from './profile.js';

window.currentUser = JSON.parse(localStorage.getItem('user')); // Asegúrate de que currentUser esté definido

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
    }
};

window.submitPrediction = submitPrediction;
window.submitResult = submitResult;

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
            window.location.href = '/login.html';
        });
    }

    if (localStorage.getItem('token')) {
        window.currentUser = JSON.parse(localStorage.getItem('user'));
        fetchPredictions();
        fetchMatches();
        fetchUser(); // Ensure user data is fetched on load
    }

    window.onload = async () => {
        fetchPredictions();
        fetchMatches();
        if (!window.currentUser) {
            fetchUser(); // Fetch user data if not already fetched
        }
    };
});
