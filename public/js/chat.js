const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');

sendButton.addEventListener('click', async () => {
    const userMessage = chatInput.value;
    if (!userMessage) return;

    // Display user message
    appendMessage('You: ' + userMessage);
    chatInput.value = '';

    // Send message to the AI model
    const response = await fetchAIResponse(userMessage);
    appendMessage('AI: ' + response);
});

function appendMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    chatLog.appendChild(messageElement);
    chatLog.scrollTop = chatLog.scrollHeight; // Scroll to the bottom
}

async function fetchAIResponse(message) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
        });
        const data = await response.json();
        return data.reply || 'Sorry, I did not understand that.';
    } catch (error) {
        console.error('Error fetching AI response:', error);
        return 'Error: Unable to get response.';
    }
}