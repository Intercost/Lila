const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');

// Updated history format to match Gemini/FastAPI requirements
// Structure: { role: 'user' | 'model', parts: [{ text: '...' }] }
let chatHistory = []; 

window.onload = () => {
    const initialMessageElement = chatWindow.querySelector('.message.lila .typewriter');
    if (initialMessageElement) {
        const text = initialMessageElement.dataset.text;
        typeWriter(initialMessageElement, text);
        // Sync initial message with the correct backend format
        chatHistory.push({ role: 'model', parts: [{ text: text }] });
    }
};

async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    appendMessage('user', messageText);
    userInput.value = '';
    userInput.disabled = true; 
    sendBtn.disabled = true;

    try {
        // Changed URL to relative path for Vercel deployment
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                message: messageText, 
                history: chatHistory 
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        // Update local history with the synchronized history from the backend
        chatHistory = data.history; 
        
        appendMessage('lila', data.response, true); 

    } catch (error) {
        console.error('Error sending message:', error);
        appendMessage('lila', 'SYSTEM ERROR: Lila is offline. Connection failed: ' + error.message, true);
    } finally {
        userInput.disabled = false;
        sendBtn.disabled = false;
        userInput.focus();
    }
}

function appendMessage(sender, text, useTypewriter = false) {
    const messageDiv = document.createElement('div');
    // Map backend roles to CSS classes
    const cssClass = sender === 'model' || sender === 'lila' ? 'lila' : 'user';
    messageDiv.classList.add('message', cssClass);

    if (useTypewriter) {
        const p = document.createElement('p');
        p.classList.add('typewriter');
        messageDiv.appendChild(p);
        chatWindow.appendChild(messageDiv);
        scrollToBottom();
        typeWriter(p, text);
    } else {
        messageDiv.innerHTML = `<p>${text}</p>`;
        chatWindow.appendChild(messageDiv);
        scrollToBottom();
        // If it's a manual user append (not from backend sync), add to history
        if (sender === 'user') {
            chatHistory.push({ role: 'user', parts: [{ text: text }] });
        }
    }
}

function typeWriter(element, text, callback = () => {}) {
    let i = 0;
    element.classList.add('typewriter-active');
    element.innerHTML = ''; 

    const speed = 30; 

    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            chatWindow.scrollTop = chatWindow.scrollHeight; 
            setTimeout(type, speed);
        } else {
            element.classList.remove('typewriter-active');
            element.classList.add('typewriter-done');
            callback(); 
        }
    }
    type();
}

function scrollToBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

sendBtn.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') sendMessage();
});