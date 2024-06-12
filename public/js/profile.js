export const fetchUser = async () => {
    const response = await fetch('/profile', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });

    const data = await response.json();

    if (response.ok) {
        document.getElementById('firstName').value = data.user.firstName || '';
        document.getElementById('lastName').value = data.user.lastName || '';
        document.getElementById('email').value = data.user.email || '';
        document.getElementById('phone').value = data.user.phone || '';
    } else {
        alert('Error fetching user: ' + data.error);
    }
};

export const updateProfile = async () => {
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
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

    if (response.ok) {
        alert('Profile updated successfully');
    } else {
        alert('Error updating profile: ' + data.error);
    }
};
