function setupWebSocket() {
    if (ws) {
        ws.close();
    }
    const protocol =
        window.location.protocol === 'https:'
            ? 'wss'
            : 'ws';
    ws = new WebSocket(
        `${protocol}://${window.location.host}/ws?token=${token}`
    );
    ws.onopen = () => {
        console.log(
            'WebSocket connected'
        );
    };
    ws.onmessage = async (event) => {
        try {
            const data =
                JSON.parse(event.data);
            console.log(
                'Realtime event:',
                data
            );
            if (
                data.type === 'note-changed'
            ) {
                await fetchNotes();
                showToast(
                    'Dữ liệu đã được cập nhật realtime.',
                    'success'
                );
            }
        } catch (error) {
            console.error(
                'WebSocket parse error:',
                error
            );
        }
    };
    ws.onclose = () => {
        console.log(
            'WebSocket disconnected'
        );
        reconnectWebSocket();
    };
    ws.onerror = (error) => {
        console.error(
            'WebSocket error:',
            error
        );
        ws.close();
    };
}
function reconnectWebSocket() {
    clearTimeout(
        wsReconnectTimeout
    );
    wsReconnectTimeout =
        setTimeout(() => {
            console.log(
                'Reconnecting WebSocket...'
            );
            setupWebSocket();
        }, 3000);
}
function closeWebSocket() {
    if (ws) {
        ws.close();
        ws = null;
    }
}