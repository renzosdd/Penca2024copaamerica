document.addEventListener('DOMContentLoaded', function() {
    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems);

    var elemsDropdown = document.querySelectorAll('.dropdown-trigger');
    var instancesDropdown = M.Dropdown.init(elemsDropdown, {
        constrainWidth: false,
        coverTrigger: false
    });
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
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
