import { login, register } from './auth.js';

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await login();
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await register();
});
