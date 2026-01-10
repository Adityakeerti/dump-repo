'use strict';

const chatPage = document.querySelector('#chat-sidebar');
const messageForm = document.querySelector('#chat-form');
const messageInput = document.querySelector('#message-input');
const messageArea = document.querySelector('#chat-messages');

let stompClient = null;
let username = null;

const colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function connect() {
    username = getUrlParameter('username') || 'Guest';

    if (username) {
        const socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.debug = null; // Disable debug logging for cleaner console

        stompClient.connect({}, onConnected, onError);
    }
}

function onConnected() {
    // Subscribe to the Public Topic
    stompClient.subscribe('/topic/public', onMessageReceived);

    // Tell your username to the server
    stompClient.send("/app/chat.addUser",
        {},
        JSON.stringify({ sender: username, type: 'JOIN' })
    );
}

function onError(error) {
    const errorElement = document.createElement('div');
    errorElement.classList.add('chat-system-message');
    errorElement.style.color = '#ff5652';
    errorElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    messageArea.appendChild(errorElement);
}

function sendMessage(event) {
    const messageContent = messageInput.value.trim();

    if (messageContent && stompClient) {
        const chatMessage = {
            sender: username,
            content: messageInput.value,
            type: 'CHAT'
        };

        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
        messageInput.value = '';
    }
    event.preventDefault();
}


function onMessageReceived(payload) {
    const message = JSON.parse(payload.body);
    const messageElement = document.createElement('div');

    if (message.type === 'JOIN') {
        messageElement.classList.add('chat-system-message');
        messageElement.textContent = message.sender + ' joined!';
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('chat-system-message');
        messageElement.textContent = message.sender + ' left!';
    } else {
        messageElement.classList.add('message');

        if (message.sender === username) {
            messageElement.classList.add('self');
        } else {
            messageElement.classList.add('other');

            const senderElement = document.createElement('div');
            senderElement.classList.add('message-sender');
            senderElement.textContent = message.sender;
            // Add a random color to sender name for fun (optional)
            // senderElement.style.color = getAvatarColor(message.sender);
            messageElement.appendChild(senderElement);
        }

        const textElement = document.createElement('div');
        textElement.textContent = message.content;
        messageElement.appendChild(textElement);
    }

    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

// Export Chat Functionality
function exportChat() {
    const messages = [];
    document.querySelectorAll('.message').forEach(msgEl => {
        const sender = msgEl.querySelector('.message-sender') ? msgEl.querySelector('.message-sender').textContent : 'Me';
        const content = Array.from(msgEl.childNodes)
            .filter(node => node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('message-sender')))
            .map(node => node.textContent)
            .join('').trim();

        messages.push(`[${sender}]: ${content}`);
    });

    if (messages.length === 0) {
        alert('No messages to export!');
        return;
    }

    const blob = new Blob([messages.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-history-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}

// Start connection
document.addEventListener('DOMContentLoaded', () => {
    connect();
    const exportBtn = document.getElementById('export-chat-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportChat);
    }
});

messageForm.addEventListener('submit', sendMessage);
