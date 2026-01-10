const API_BASE = '/api/v1/users';
const storedUser = JSON.parse(sessionStorage.getItem('chatAppUser')) || {};
const currentUser = {
    username: storedUser.username || '',
    email: storedUser.email || '',
    status: storedUser.status || ''
};

document.addEventListener('DOMContentLoaded', async () => {
    const loadingView = document.getElementById('loading-view');
    const dashboardView = document.getElementById('dashboard-view');
    const logoutBtn = document.getElementById('logout-btn');

    // UI State Management
    function switchView(viewName) {
        loadingView.classList.add('hidden');
        dashboardView.classList.add('hidden');

        if (viewName === 'loading') loadingView.classList.remove('hidden');
        if (viewName === 'dashboard') {
            dashboardView.classList.remove('hidden');
            document.getElementById('current-username').textContent = currentUser.username;
            document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
        }
    }

    // --- Auto Auth Logic ---
    async function authenticate() {
        // 1. Get User from Query Params
        const urlParams = new URLSearchParams(window.location.search);
        const qUsername = urlParams.get('username');
        const qEmail = urlParams.get('email');

        let userToAuth = {
            username: qUsername || currentUser.username,
            email: qEmail || currentUser.email,
            password: 'campus_static_password_123' // Fixed password for integration
        };

        if (!userToAuth.email || !userToAuth.username) {
            // Check session storage fallback
            if (currentUser.email) {
                userToAuth = { ...currentUser, password: 'campus_static_password_123' };
            } else {
                alert('Access Denied: No user information provided via Dashboard.');
                return;
            }
        }

        try {
            // 2. Try Login
            let response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userToAuth.email, password: userToAuth.password })
            });

            if (!response.ok) {
                console.log('Login failed, attempting registration...');
                // 3. If Login fails, Try Registering
                const regResponse = await fetch(API_BASE, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userToAuth)
                });

                if (regResponse.ok) {
                    // Registration success, try login again
                    response = await fetch(`${API_BASE}/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userToAuth.email, password: userToAuth.password })
                    });
                } else {
                    throw new Error('Registration failed during auto-setup');
                }
            }

            if (response.ok) {
                // 4. Success
                const userData = await response.json();
                currentUser.username = userData.username;
                currentUser.email = userData.email;
                currentUser.status = userData.status;
                sessionStorage.setItem('chatAppUser', JSON.stringify(currentUser));

                switchView('dashboard');
            } else {
                alert('Campus Hub Authentication Failed. Please return to Dashboard.');
            }

        } catch (err) {
            console.error(err);
            alert('Connection Error to Meeting Server. Ensure backend is running.');
        }
    }

    // Logout Handler (Just closes tab or clears session)
    logoutBtn.addEventListener('click', async () => {
        if (!currentUser.email) return;
        try {
            await fetch(`${API_BASE}/logout?email=${encodeURIComponent(currentUser.email)}`, { method: 'POST' });
            sessionStorage.removeItem('chatAppUser');
            window.close(); // Close the tab
        } catch (err) {
            console.error(err);
        }
    });

    // --- New UI Logic ---

    const createMeetingCard = document.getElementById('create-meeting-card');
    const joinMeetingCard = document.getElementById('join-meeting-card');
    const joinModal = document.getElementById('join-modal-overlay');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const modalJoinBtn = document.getElementById('modal-join-btn');
    const modalInput = document.getElementById('modal-room-id');

    // Create Meeting Action
    createMeetingCard.addEventListener('click', () => {
        const roomID = Math.floor(Math.random() * 10000) + "";
        const username = currentUser.username || 'Guest';
        window.open(`group_call.html?roomID=${roomID}&username=${username}`, '_blank');
    });

    // Show Join Modal
    joinMeetingCard.addEventListener('click', () => {
        joinModal.classList.remove('hidden');
        modalInput.focus();
    });

    // Hide Join Modal
    modalCancelBtn.addEventListener('click', () => {
        joinModal.classList.add('hidden');
        modalInput.value = '';
    });

    // Join Meeting Action
    const joinRoom = () => {
        const roomID = modalInput.value.trim();
        if (!roomID) {
            alert('Please enter a Room ID');
            return;
        }
        const username = currentUser.username || 'Guest';
        window.open(`group_call.html?roomID=${roomID}&username=${username}`, '_blank');
        joinModal.classList.add('hidden');
        modalInput.value = '';
    };

    modalJoinBtn.addEventListener('click', joinRoom);

    // Allow Enter key in modal
    modalInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') joinRoom();
    });

    // Start
    authenticate();
});
