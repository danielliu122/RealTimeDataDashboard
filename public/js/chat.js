const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');

// Initialize conversation memory
let conversationHistory = [];

sendButton.addEventListener('click', async () => {
    const userMessage = chatInput.value;
    if (!userMessage) return;

    // Display user message
    appendMessage('You: ' + userMessage);
    conversationHistory.push(userMessage); // Store user message
    chatInput.value = '';

    // Send message to the AI model with conversation history
    const response = await fetchAIResponse(conversationHistory);
    appendMessage('AI: ' + response, true);
});

function appendMessage(message, isAI = false) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;

    // Append to chat log for both user and AI messages
    chatLog.appendChild(messageElement);

    // If the message is from AI, add a separator for clarity
    if (isAI) {
        const separator = document.createElement('div');
        separator.textContent = ''; // Optional: Add a visual separator
        chatLog.appendChild(separator);
    }

    chatLog.scrollTop = chatLog.scrollHeight; // Scroll to the bottom
}

async function fetchAIResponse(history) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ messages: history }), // Send entire conversation history
        });
        const data = await response.json();
        return data.reply || 'Sorry, I did not understand that.';
    } catch (error) {
        console.error('Error fetching AI response:', error);
        return 'Error: Unable to get response.';
    }
}