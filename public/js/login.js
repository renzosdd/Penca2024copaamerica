document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.modal');
    M.Modal.init(elems);

    var elemsDropdown = document.querySelectorAll('.dropdown-trigger');
    M.Dropdown.init(elemsDropdown, {
        constrainWidth: false,
        coverTrigger: false
    });

    document.querySelectorAll('.modal-trigger').forEach(function(trigger) {
        trigger.addEventListener('click', function(e) {
            e.preventDefault();
            var targetSelector = trigger.getAttribute('href') || trigger.dataset.target;
            var modal = document.querySelector(targetSelector);
            if (modal) {
                var instance = M.Modal.getInstance(modal) || M.Modal.init([modal])[0];
                instance.open();
            }
        });
    });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
        username: document.getElementById('login-username').value,
        password: document.getElementById('login-password').value
    };
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        const result = await response.json();
        if (response.ok) {
            window.location.href = result.redirectUrl;
        } else {
            M.toast({html: result.error, classes: 'red'});
        }
    } catch (error) {
        M.toast({html: 'Error al iniciar sesión', classes: 'red'});
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    formData.set('username', document.getElementById('register-username').value);
    try {
        const response = await fetch(form.action, {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        if (response.ok) {
            M.toast({html: 'Registro exitoso! Redirigiendo...', classes: 'green'});
            const modalInstance = M.Modal.getInstance(document.getElementById('register-modal'));
            modalInstance.close();
            setTimeout(() => {
                window.location.href = result.redirectUrl;
            }, 1000);
        } else {
            M.toast({html: result.error, classes: 'red'});
        }
    } catch (error) {
        M.toast({html: 'Error al registrar', classes: 'red'});
    }
});
