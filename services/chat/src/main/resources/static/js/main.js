let stompClient = null;
let currentUser = null; // {id, username}
let currentSubscription = null;
let currentChatType = null; // 'GROUP' or 'PRIVATE'
let activeChatId = null; // roomId or recipientId

const apiBase = '/api';

function login() {
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (email && password) {
        document.getElementById('login-overlay').style.display = 'none';

        fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
            .then(res => {
                if (!res.ok) throw new Error("Login failed");
                return res.json();
            })
            .then(user => {
                currentUser = user;
                init();
            })
            .catch(err => {
                console.error(err);
                alert("Login failed: " + err);
                document.getElementById('login-overlay').style.display = 'flex';
            });
    }
}

function init() {
    document.getElementById('current-username').innerText = currentUser.username;

    // Connect Stomp
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.connect({}, onConnected, onError);
}

function onConnected() {
    // Subscribe to private channel (using explicit topic for reliability)
    stompClient.subscribe(`/topic/private/${currentUser.id}`, onMessageReceived);

    // Register user presence
    stompClient.send("/app/chat.addUser", {}, JSON.stringify({ username: currentUser.username }));

    // Load initial data
    // Load initial data
    loadGroups();
    loadUsers(); // Keep loading all classmates for now, or maybe only friends?
    loadFriends();
    loadRequests();

    document.getElementById('status-indicator').classList.add('status-dot', 'online');
}

function onError(error) {
    console.error('WebSocket Error:', error);
    document.getElementById('current-username').innerText = "Connection Failed";
}

function loadGroups() {
    if (!currentUser) return;
    fetch(`/api/groups/user/${currentUser.id}`)
        .then(res => res.json())
        .then(rooms => {
            const list = document.getElementById('groups-list');
            if (!list) return;
            list.innerHTML = '';
            if (rooms.length === 0) {
                list.innerHTML = '<div style="padding: 10px; color: #aaa; text-align: center; font-size: 13px;">No groups yet. Create one!</div>';
                return;
            }
            rooms.forEach(room => {
                const el = document.createElement('div');
                el.className = 'list-item';
                el.innerHTML = `<div class="avatar">#</div> <span>${room.name}</span>`;
                el.onclick = () => enterRoom(room);
                list.appendChild(el);
            });
        }).catch(err => {
            console.error("Error loading groups:", err);
            document.getElementById('groups-list').innerHTML = '<div style="padding: 10px; color: red;">Error loading groups</div>';
        });
}

function loadUsers() {
    if (!currentUser) return;

    // Fetch users, friends, and sent requests concurrently
    Promise.all([
        fetch('/api/users').then(res => res.json()),
        fetch(`/api/friends/${currentUser.id}`).then(res => res.json()),
        fetch(`/api/friends/sent/${currentUser.id}`).then(res => res.json())
    ]).then(([allUsers, friends, sentRequests]) => {
        const list = document.getElementById('users-list');
        if (!list) return;
        list.innerHTML = '';

        const friendIds = new Set(friends.map(f => f.id));
        const sentRequestIds = new Set(sentRequests.map(r => r.receiver.id));

        allUsers.forEach(user => {
            if (user.id !== currentUser.id) {
                const el = document.createElement('div');
                el.className = 'list-item user-item';

                let actionBtn = '';
                if (friendIds.has(user.id)) {
                    actionBtn = `<button class="glass-btn small action-btn" onclick="enterPrivateChatById(${user.id}, '${user.username}')">Message</button>`;
                } else if (sentRequestIds.has(user.id)) {
                    actionBtn = `<button class="glass-btn small action-btn requested" disabled>Requested</button>`;
                } else {
                    actionBtn = `<button class="glass-btn small action-btn" onclick="sendFriendRequest(${user.id})">Add Friend</button>`;
                }

                el.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                        <div class="avatar">${user.username ? user.username[0] : '?'}</div>
                        <div style="display: flex; flex-direction: column;">
                            <span>${user.username}</span>
                            <span style="font-size: 10px; color: ${user.status === 'ONLINE' ? '#4caf50' : '#888'}">${user.status}</span>
                        </div>
                    </div>
                    ${actionBtn}
                `;
                list.appendChild(el);
            }
        });
    }).catch(err => console.error("Error loading users/relationships:", err));
}

function switchTab(event, tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Hide all containers safely
    const containers = ['groups-list', 'users-list', 'friends-list'];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    const activeContainer = document.getElementById(`${tab}-list`);
    if (activeContainer) {
        activeContainer.classList.remove('hidden');
    }

    if (tab === 'friends') {
        loadFriends();
        loadRequests();
    } else if (tab === 'users') {
        loadUsers();
    } else if (tab === 'groups') {
        loadGroups();
    }
}

function enterRoom(room) {
    if (currentSubscription) currentSubscription.unsubscribe();
    currentChatType = 'GROUP';
    activeChatId = room.id;

    // Update UI
    document.getElementById('chat-title').innerText = room.name;
    document.getElementById('chat-desc').innerText = room.description;
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;

    // Subscribe
    currentSubscription = stompClient.subscribe(`/topic/room/${room.id}`, onMessageReceived);

    // Load History
    fetch(`/api/history/room/${room.id}`).then(res => res.json()).then(displayHistory);
}

function enterPrivateChat(user) {
    // For private chat, we don't subscribe to a new topic (we use user queue),
    // but we need to track who we are talking to.
    if (currentSubscription) {
        currentSubscription.unsubscribe();
        currentSubscription = null;
    }

    currentChatType = 'PRIVATE';
    activeChatId = user.id; // Recipient ID

    document.getElementById('chat-title').innerText = user.username;
    document.getElementById('chat-desc').innerText = "Private Message";
    document.getElementById('message-input').disabled = false;
    document.getElementById('send-btn').disabled = false;

    fetch(`/api/history/private/${currentUser.id}/${user.id}`).then(res => res.json()).then(displayHistory);
}

function displayHistory(messages) {
    const container = document.getElementById('messages-area');
    container.innerHTML = '';
    messages.forEach(msg => appendMessage(msg));
    scrollToBottom();
}

function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    console.log("Message received:", message);

    // Filter if it belongs to current chat
    if (currentChatType === 'GROUP' && message.chatRoom && message.chatRoom.id == activeChatId) {
        appendMessage(message);
        scrollToBottom();
    } else if (currentChatType === 'PRIVATE' && message.sender && (message.recipient || message.type === 'CHAT')) {
        const senderId = message.sender.id;
        const recipientId = message.recipient ? message.recipient.id : null;

        const otherId = (senderId == currentUser.id) ? recipientId : senderId;

        if (otherId == activeChatId) {
            appendMessage(message);
            scrollToBottom();
        } else {
            console.log("Message for another chat. Current active:", activeChatId, "Message other side:", otherId);
        }
    }
}

function appendMessage(message) {
    const container = document.getElementById('messages-area');
    if (!container || !currentUser) return;

    // Remove placeholder if present
    const placeholder = container.querySelector('.placeholder-msg');
    if (placeholder) placeholder.remove();

    const isMine = message.sender && message.sender.username === currentUser.username;

    const div = document.createElement('div');
    div.className = `message ${isMine ? 'sent' : 'received'}`;

    div.innerHTML = `
        <span class="message-meta">${message.sender ? message.sender.username : 'Unknown'}</span>
        <div class="msg-content">${message.content}</div>
    `;

    container.appendChild(div);
}

function sendMessage() {
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    if (!content) return;

    if (currentChatType === 'GROUP') {
        const msg = {
            senderId: currentUser.id,
            content: content,
            type: 'CHAT'
        };
        console.log("Sending group message to", activeChatId, msg);
        stompClient.send(`/app/chat.sendMessage/${activeChatId}`, {}, JSON.stringify(msg));
    } else {
        const msg = {
            senderId: currentUser.id,
            content: content,
            type: 'CHAT',
            recipientId: activeChatId
        };
        console.log("Sending private message to", activeChatId);
        stompClient.send("/app/chat.sendPrivateMessage", {}, JSON.stringify(msg));
    }

    input.value = '';
}

function scrollToBottom() {
    const container = document.getElementById('messages-area');
    container.scrollTop = container.scrollHeight;
}

// Allow Enter key to send
document.getElementById('message-input').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Friend Features
function openFriendModal() {
    document.getElementById('friend-modal').classList.remove('hidden');
    document.getElementById('friend-modal').style.display = 'flex';
}

function closeFriendModal() {
    document.getElementById('friend-modal').classList.add('hidden');
    document.getElementById('friend-modal').style.display = 'none';
}

function sendFriendRequest(targetId) {
    if (!targetId) return;

    fetch(`/api/friends/add?senderId=${currentUser.id}&receiverId=${targetId}`, { method: 'POST' })
        .then(() => {
            alert("Request Sent!");
            loadUsers(); // Refresh the list to show "Requested" state
        })
        .catch(err => alert("Error sending request: " + err));
}

function enterPrivateChatById(id, username) {
    enterPrivateChat({ id: id, username: username });
}

function loadFriends() {
    if (!currentUser) return;
    fetch(`/api/friends/${currentUser.id}`)
        .then(res => res.json())
        .then(friends => {
            const list = document.getElementById('friends-list');
            const requestsDiv = document.getElementById('pending-requests');
            if (!list) return;
            list.innerHTML = '';
            list.appendChild(requestsDiv);

            if (friends.length === 0) {
                const empty = document.createElement('div');
                empty.style.cssText = 'padding: 10px; color: #aaa; text-align: center; font-size: 13px;';
                empty.innerText = 'No friends yet. Add some classmates!';
                list.appendChild(empty);
                return;
            }

            friends.forEach(user => {
                const el = document.createElement('div');
                el.className = 'list-item';
                el.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; width: 100%;" onclick="enterPrivateChatById(${user.id}, '${user.username}')">
                        <div class="avatar">${user.username ? user.username[0] : '?'}</div>
                        <div style="flex: 1;">
                            <span>${user.username}</span>
                            <span class="status-dot ${user.status === 'ONLINE' ? 'online' : ''}"></span>
                        </div>
                    </div>
                     <button onclick="removeFriend(${user.id})" class="glass-btn small" style="padding: 2px 8px; font-size: 10px; background: rgba(255,0,0,0.2); margin-left: 5px;">X</button>
                `;
                // Remove the parent onclick so button doesn't trigger chat
                list.appendChild(el);
            });
        }).catch(err => console.error("Error loading friends:", err));
}

function removeFriend(friendId) {
    if (!confirm("Remove this friend?")) return;
    fetch(`/api/friends/remove?userId=${currentUser.id}&friendId=${friendId}`, { method: 'POST' })
        .then(() => {
            loadFriends();
            loadUsers(); // To update the "Add Friend" button status
        });
}

function loadRequests() {
    fetch(`/api/friends/requests/${currentUser.id}`).then(res => res.json()).then(requests => {
        const list = document.getElementById('requests-list');
        const container = document.getElementById('pending-requests');
        list.innerHTML = '';

        if (requests.length > 0) {
            container.classList.remove('hidden');
            requests.forEach(req => {
                const el = document.createElement('div');
                el.style.display = 'flex';
                el.style.justifyContent = 'space-between';
                el.style.alignItems = 'center';
                el.style.padding = '5px';
                el.style.background = 'rgba(255,255,255,0.05)';
                el.style.borderRadius = '5px';
                el.style.marginBottom = '5px';

                el.innerHTML = `
                    <span style="font-size: 13px">${req.sender.username}</span>
                    <button onclick="acceptRequest(${req.id})" style="padding: 2px 8px; font-size: 11px;">Accept</button>
                `;
                list.appendChild(el);
            });
        } else {
            container.classList.add('hidden');
        }
    });
}

function acceptRequest(requestId) {
    fetch(`/api/friends/accept?requestId=${requestId}`, { method: 'POST' })
        .then(() => {
            loadRequests();
            loadFriends();
        });
}

// Group Management
function openGroupModal() {
    document.getElementById('group-modal').classList.remove('hidden');
    document.getElementById('group-modal').style.display = 'flex';

    // Populate friends to select
    const list = document.getElementById('friend-selection-list');
    list.innerHTML = '<div style="color: #aaa; padding: 5px;">Loading friends...</div>';

    fetch(`/api/friends/${currentUser.id}`)
        .then(res => res.json())
        .then(friends => {
            list.innerHTML = '';
            if (friends.length === 0) {
                list.innerHTML = '<div style="color: #aaa; padding: 5px;">No friends to add.</div>';
                return;
            }
            friends.forEach(friend => {
                const el = document.createElement('div');
                el.style.padding = '5px';
                el.innerHTML = `
                    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                        <input type="checkbox" value="${friend.id}" class="friend-checkbox"> 
                        <span>${friend.username}</span>
                    </label>
                `;
                list.appendChild(el);
            });
        });
}

function closeGroupModal() {
    document.getElementById('group-modal').classList.add('hidden');
    document.getElementById('group-modal').style.display = 'none';
}

function createGroup() {
    const name = document.getElementById('group-name-input').value.trim();
    const desc = document.getElementById('group-desc-input').value.trim();

    // Collect selected friends
    const checkboxes = document.querySelectorAll('.friend-checkbox:checked');
    const memberIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (!name) {
        alert("Group name is required");
        return;
    }

    fetch('/api/groups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: name,
            description: desc,
            creatorId: currentUser.id,
            memberIds: memberIds
        })
    }).then(res => res.json())
        .then(group => {
            alert("Group created!");
            closeGroupModal();
            loadGroups();
            document.getElementById('group-name-input').value = '';
            document.getElementById('group-desc-input').value = '';
        });
}

// Logout
function logout() {
    if (confirm("Are you sure you want to logout?")) {
        fetch(`/api/logout?userId=${currentUser.id}`, { method: 'POST' })
            .then(() => {
                if (stompClient) stompClient.disconnect();
                location.reload();
            });
    }
}
