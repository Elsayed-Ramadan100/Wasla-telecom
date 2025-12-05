/**
 * Support Logic
 */
document.addEventListener('DOMContentLoaded', () => {
    // FAQ Accordion
    document.querySelectorAll('.faq-question').forEach(q => {
        q.addEventListener('click', () => {
            const item = q.parentElement;
            item.classList.toggle('active');
        });
    });

    // Chat Logic
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatMsgs = document.getElementById('chat-messages');

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        div.textContent = text;
        chatMsgs.appendChild(div);
        chatMsgs.scrollTop = chatMsgs.scrollHeight;
    }

    function handleSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';

        // Simulate Bot Response
        setTimeout(() => {
            let response = "Thank you for contacting Wasla. An agent will be with you shortly.";
            if (text.toLowerCase().includes('offer')) response = "You can view our latest offers on the Offers page.";
            if (text.toLowerCase().includes('gift') || text.toLowerCase().includes('10gb')) response = "The 10GB gift is automatically added to new accounts and is valid for 30 days.";

            addMessage(response, 'bot');
        }, 1000);
    }

    chatSend.addEventListener('click', handleSend);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // Ticket Form
    document.getElementById('ticket-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const subject = document.getElementById('ticket-subject').value;
        WaslaUtils.showToast(`Ticket "${subject}" created. We will reply via email.`, 'success');
        e.target.reset();
    });
});
