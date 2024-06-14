document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(loginForm);
            const response = await fetch('/login', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                window.location.href = '/platform';
            } else {
                const error = await response.json();
                alert(`Login failed: ${error.error}`);
            }
        });
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(registerForm);
            const response = await fetch('/register', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                window.location.href = '/platform';
            } else {
                const error = await response.json();
                alert(`Registration failed: ${error.error}`);
            }
        });
    }

    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(updateProfileForm);
            const response = await fetch('/updateProfile', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                alert('Profile updated');
            } else {
                alert('Failed to update profile');
            }
        });
    }

    const predictionForm = document.getElementById('predictionForm');
    if (predictionForm) {
        predictionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(predictionForm);
            const response = await fetch('/predictions/submit', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                alert('Prediction submitted');
            } else {
                alert('Failed to submit prediction');
            }
        });
    }

    const adminForm = document.getElementById('adminForm');
    if (adminForm) {
        adminForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(adminForm);
            const response = await fetch('/admin/update', {
                method: 'POST',
                body: formData
            });
            if (response.ok) {
                alert('Results updated');
            } else {
                alert('Failed to update results');
            }
        });
    }

    async function fetchRanking() {
        const response = await fetch('/predictions/ranking');
        const rankingData = await response.json();
        const rankingDiv = document.getElementById('userRanking');
        rankingDiv.innerHTML = '';
        rankingData.forEach(user => {
            const userDiv = document.createElement('div');
            userDiv.textContent = `${user.username}: ${user.points} puntos`;
            rankingDiv.appendChild(userDiv);
        });
    }

    if (document.getElementById('userRanking')) {
        fetchRanking();
    }

    // Inicialización de modales
    const modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);
});
