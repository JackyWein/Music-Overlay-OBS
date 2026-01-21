// WebSocket Service

let ws;

function connectWebsocket() {
    ws = new WebSocket(WEBSOCKET_URL);

    ws.onopen = function () {
        console.log('Connected to WebSocket');
        showWidget();
        if (titleEl) titleEl.textContent = "Waiting for music...";
        if (artistEl) artistEl.textContent = "Connected to Streamer.bot";

        ws.send(JSON.stringify({
            request: 'Subscribe',
            events: {
                General: ['Custom', 'Raw'],
                Raw: ['Action', 'SubAction', 'ActionCode', 'General']
            },
            id: 'MusicOverlaySub'
        }));
    };

    ws.onmessage = function (event) {
        try {
            const data = JSON.parse(event.data);

            if (titleEl && titleEl.textContent === "Waiting for music...") {
                artistEl.textContent = "Data Received...";
            }

            let musicData = null;
            if (data.name === 'MusicUpdate' || data.event === 'MusicUpdate') {
                musicData = data;
            }
            else if (data.event && data.event.source === 'Custom' && data.data) {
                const customData = typeof data.data === 'string' ? JSON.parse(data.data) : data.data;
                if (customData.name === 'MusicUpdate' || customData.event === 'MusicUpdate') {
                    musicData = customData;
                }
            }
            else if (data.data && (data.data.name === 'MusicUpdate' || data.data.event === 'MusicUpdate')) {
                musicData = data.data;
            }

            if (musicData) {
                updateWidget(musicData);
            }
        } catch (e) {
            console.error('Error parsing message:', e, event.data);
        }
    };

    ws.onerror = function (error) {
        console.error('WebSocket Error:', error);
        showWidget();
        if (titleEl) titleEl.textContent = "Connection Error";
        if (artistEl) artistEl.textContent = "Check Console/Bot";
    };

    ws.onclose = function () {
        console.log('WebSocket closed');
        showWidget();
        if (titleEl) titleEl.textContent = "Disconnected";
        if (artistEl) artistEl.textContent = "Is Streamer.bot running?";

        setTimeout(connectWebsocket, 5000);
    };
}
