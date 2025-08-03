const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const http = require('http');

// Telegram setup
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Target URL to check
const url = 'https://www.goethe.de/ins/bd/en/spr/prf/gzsd1.cfm';

// Main checking function
async function checkButton() {
    try {
        const res = await fetch(url);
        const html = await res.text();

        const dom = new JSDOM(html);
        const prButtons = dom.window.document.querySelectorAll('.pr-buttons');

        let foundActive = false;

        for (let i = 0; i < prButtons.length; i++) {
            const button = prButtons[i].querySelector('button');
            if (!button) continue;

            const text = button.textContent.trim().toLowerCase();
            const isDisabled = button.hasAttribute('disabled');

            if (text === 'book' && !isDisabled) {
                console.log(`✅ Found active button at index ${i}: "${text}"`);
                await sendTelegramNotification(
                    'Goethe Slot Open',
                    `🚨 Booking button #${i + 1} ("${button.textContent.trim()}") is now clickable!`
                );
                foundActive = true;
                break; // optional: stop after first active button
            } else {
                console.log(`🔁 Button #${i + 1} not active (text="${text}", disabled=${isDisabled})`);
            }
        }

        if (!foundActive) {
            console.log('🔁 No active booking button found.');
        }

    } catch (err) {
        console.error('❌ Error in checkButton():', err);
    }

    const delay = Math.floor(Math.random() * 501) + 2500; // 2500–3000 ms
    console.log(`⏱️ Checking again in ${delay} ms...\n`);
    setTimeout(checkButton, delay);
}

// Send Telegram message
async function sendTelegramNotification(title, message) {
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const text = `*${title}*\n${message}`;

    try {
        const response = await fetch(telegramUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: text,
                parse_mode: 'Markdown'
            }),
        });

        if (response.ok) {
            console.log('📱 Telegram notification sent.');
        } else {
            console.log('❌ Telegram notification failed.');
            const errorText = await response.text();
            console.error('Response:', errorText);
        }
    } catch (err) {
        console.error('❌ Error in sendTelegramNotification():', err);
    }
}

// 🟢 Keep-alive log every 1 min
setInterval(() => {
    console.log(`🟢 Script is still running at ${new Date().toISOString()}`);
}, 60000);

// 🛡️ Catch uncaught and unhandled errors
process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Promise Rejection:', reason);
});

// Start checking
checkButton();

// 🌐 Minimal HTTP server for Render health check and UptimeRobot ping logging
const serverPort = process.env.PORT || 3000;
http.createServer((req, res) => {
    console.log(`🌐 Received ping at ${new Date().toISOString()} from ${req.socket.remoteAddress}`);
    res.writeHead(200);
    res.end('OK');
}).listen(serverPort, () => {
    console.log(`🌐 HTTP server listening on port ${serverPort}`);
});
