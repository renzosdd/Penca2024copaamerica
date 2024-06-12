export const login = async () => {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok) {
        localStorage.setItem('token', data.accessToken);
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('user', JSON.stringify(data.user));
        window.location.href = '/index.html';
    } else {
        alert('Login failed: ' + data.error);
    }
};

export const register = async () => {
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;
    const email = document.getElementById('reg-email').value;
    const firstName = document.getElementById('reg-firstName').value;
    const lastName = document.getElementById('reg-lastName').value;
    const phone = document.getElementById('reg-phone').value;
    const avatar = document.getElementById('reg-avatar').files[0];

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    formData.append('email', email);
    formData.append('firstName', firstName);
    formData.append('lastName', lastName);
    formData.append('phone', phone);
    if (avatar) {
        formData.append('avatar', avatar);
    }

    const response = await fetch('/register', {
        method: 'POST',
        body: formData
    });

    const data = await response.json();

    if (response.ok) {
        alert('Registration successful!');
        document.getElementById('register-form').reset();
        window.location.href = '/login.html';
    } else {
        alert('Registration failed: ' + data.error);
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    window.location.href = '/login.html';
};

export const fetchUser = async () => {
    const response = await fetch('/profile', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });

    const data = await response.json();

    if (response.ok) {
        return data.user;
    } else {
        alert('Error fetching user: ' + data.error);
    }
};
