document.addEventListener('DOMContentLoaded', function() {
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

    const registerModalBtn = document.getElementById('registerModalBtn');
    const registerModal = document.getElementById('registerModal');
    const closeModal = document.getElementsByClassName('close')[0];

    registerModalBtn.onclick = function() {
        registerModal.style.display = 'block';
    }

    closeModal.onclick = function() {
        registerModal.style.display = 'none';
    }

    window.onclick = function(event) {
        if (event.target === registerModal) {
            registerModal.style.display = 'none';
        }
    }
});

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
