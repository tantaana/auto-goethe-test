const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const http = require('http');
const fs = require('fs'); // <-- Added here to use file system

// Telegram setup
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// Target URL to check
const url = 'https://www.goethe.de/ins/bd/en/spr/prf/gzsd1.cfm';

// Main checking function
async function checkButton() {
    try {
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
        });

        const html = await res.text();

        // === SAVE fetched HTML to a file for inspection ===
        fs.writeFileSync('debug.html', html);
        console.log('📝 Saved fetched HTML to debug.html');

        const dom = new JSDOM(html);
        const prButtons = dom.window.document.querySelectorAll('.pr-buttons');

        console.log(`🔎 Found ${prButtons.length} .pr-buttons`);

        let foundActive = false;

        for (let i = 0; i < prButtons.length; i++) {
            const button = prButtons[i].querySelector('button');
            if (!button) {
                console.log(`❌ No <button> inside .pr-buttons[${i}]`);
                continue;
            }

            const text = button.textContent.trim();
            const textLower = text.toLowerCase();
            const isDisabled = button.hasAttribute('disabled');

            console.log(`🔍 Button #${i + 1}: text="${text}", disabled=${isDisabled}`);

            if (textLower === 'book' && !isDisabled) {
                console.log(`✅ Button #${i + 1} is ACTIVE!`);
                await sendTelegramNotification(
                    'Goethe Slot Open',
                    `🚨 Booking button #${i + 1} ("${text}") is now clickable!`
                );
                foundActive = true;
                break; // Stop after first active button is found
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

const serverPort = process.env.PORT || 3000;

// === HTTP server with /debug-html route to serve saved HTML file ===
http.createServer((req, res) => {
    if (req.url === '/debug-html') {
        try {
            const data = fs.readFileSync('debug.html', 'utf8');
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
            console.log('🌐 Served debug.html');
        } catch (err) {
            res.writeHead(500);
            res.end('Error reading debug.html');
            console.error('❌ Error reading debug.html:', err);
        }
        return;
    }

    console.log(`🌐 Received ping at ${new Date().toISOString()} from ${req.socket.remoteAddress}`);
    res.writeHead(200);
    res.end('OK');
}).listen(serverPort, () => {
    console.log(`🌐 HTTP server listening on port ${serverPort}`);
});

// Start checking
checkButton();
