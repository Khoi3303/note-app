function showToast(message, type = 'success') {
    let bgColor = '#4caf50';
    if (type === 'error') {
        bgColor = '#f44336';
    }
    if (type === 'warning') {
        bgColor = '#ff9800';
    }
    Toastify({
        text: message,
        duration: 3000,
        gravity: "top",
        position: "right",
        close: true,
        stopOnFocus: true,
        style: {
            background: bgColor,
            borderRadius: "10px",
            padding: "12px 16px",
            fontSize: "14px"
        }
    }).showToast();
}