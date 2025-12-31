// public/js/websocket.js
let socket = null;
let charts = {};

function initWebSocket() {
    const token = localStorage.getItem('token');
    
    socket = io({
        query: { token },
        transports: ['websocket', 'polling']
    });
    
    socket.on('connect', () => {
        console.log('WebSocket connected');
        updateConnectionStatus('connected');
        
        // Subscribe to VPS updates
        const vpsList = JSON.parse(localStorage.getItem('vpsList') || '[]');
        vpsList.forEach(vps => {
            socket.emit('subscribe', vps.id);
        });
    });
    
    socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus('disconnected');
    });
    
    socket.on('vps-update', (data) => {
        console.log('VPS update received:', data);
        updateVPSStatus(data);
    });
    
    socket.on('stats-update', (data) => {
        console.log('Stats update received:', data);
        updateCharts(data);
    });
    
    socket.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

function updateConnectionStatus(status) {
    const statusEl = document.getElementById('connectionStatus');
    const dot = document.querySelector('.status-dot');
    
    if (statusEl) {
        statusEl.textContent = status.charAt(0).toUpperCase() + status.slice(1);
        dot.className = `status-dot ${status}`;
    }
}

function updateVPSStatus(vpsData) {
    // Update VPS card in the list
    const vpsCard = document.querySelector(`[data-vps-id="${vpsData.id}"]`);
    if (vpsCard) {
        const statusEl = vpsCard.querySelector('.vps-status');
        if (statusEl) {
            statusEl.textContent = vpsData.status;
            statusEl.className = `vps-status ${vpsData.status}`;
        }
    }
    
    // Update stats if modal is open
    if (document.getElementById('vpsDetailModal').style.display === 'block') {
        updateVPSDetail(vpsData.id);
    }
}
