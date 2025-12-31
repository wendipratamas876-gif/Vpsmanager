// server/services/monitoringService.js
const db = require('../utils/jsonDatabase');
const { io } = require('../index');

class MonitoringService {
    constructor() {
        this.activeVPS = new Map();
    }
    
    // Simulate VPS monitoring (in real implementation, connect to actual VPS)
    startMonitoring(vpsId, userId) {
        if (this.activeVPS.has(vpsId)) {
            return;
        }
        
        const interval = setInterval(async () => {
            try {
                // Generate random stats (replace with actual monitoring)
                const stats = {
                    cpu: Math.floor(Math.random() * 100),
                    memory: Math.floor(Math.random() * 100),
                    disk: Math.floor(Math.random() * 100),
                    networkIn: Math.floor(Math.random() * 1000),
                    networkOut: Math.floor(Math.random() * 1000),
                    timestamp: new Date().toISOString()
                };
                
                // Update database
                await db.updateVPSStats(vpsId, stats);
                
                // Send update via WebSocket
                io.to(`vps-${vpsId}`).emit('stats-update', {
                    vpsId,
                    stats
                });
                
            } catch (error) {
                console.error(`Monitoring error for VPS ${vpsId}:`, error);
            }
        }, 5000); // Update every 5 seconds
        
        this.activeVPS.set(vpsId, interval);
    }
    
    stopMonitoring(vpsId) {
        if (this.activeVPS.has(vpsId)) {
            clearInterval(this.activeVPS.get(vpsId));
            this.activeVPS.delete(vpsId);
        }
    }
    
    // VPS control actions
    async controlVPS(vpsId, action) {
        const statusMap = {
            'start': 'running',
            'stop': 'stopped',
            'reboot': 'rebooting',
            'delete': 'deleting'
        };
        
        const newStatus = statusMap[action];
        
        if (!newStatus) {
            throw new Error('Invalid action');
        }
        
        // Update VPS status in database
        const updatedVPS = await db.updateVPS(vpsId, { status: newStatus });
        
        if (!updatedVPS) {
            throw new Error('VPS not found');
        }
        
        // Start/stop monitoring based on status
        if (newStatus === 'running') {
            this.startMonitoring(vpsId, updatedVPS.userId);
        } else if (newStatus === 'stopped') {
            this.stopMonitoring(vpsId);
        }
        
        // Broadcast status update
        io.emit('vps-update', {
            id: vpsId,
            status: newStatus,
            updatedAt: new Date().toISOString()
        });
        
        return updatedVPS;
    }
}

module.exports = new MonitoringService();
