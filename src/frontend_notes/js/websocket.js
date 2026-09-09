function setupWebSocket() {
    if (ws) {
        ws.close();
    }

    const BACKEND_HOST = 'note-app-backend-3mbr.onrender.com';
    const wsUrl = `wss://${BACKEND_HOST}/ws?token=${token}`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            console.log('Realtime event:', data);
            if (data.type === 'note-changed') {
                await fetchNotes();
                showToast(
                    'Dữ liệu đã được cập nhật realtime.',
                    'success'
                );
            }
        } catch (error) {
            console.error('WebSocket parse error:', error);
        }
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        reconnectWebSocket();
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        ws.close();
    };
}
