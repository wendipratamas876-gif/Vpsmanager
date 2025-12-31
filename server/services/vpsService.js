// server/services/vpsService.js
const axios = require('axios');
const db = require('../utils/jsonDatabase');
const monitoringService = require('./monitoringService');

class VPSService {
    constructor() {
        this.digitalOceanToken = process.env.DIGITALOCEAN_TOKEN;
        this.apiClient = axios.create({
            baseURL: 'https://api.digitalocean.com/v2',
            headers: {
                'Authorization': `Bearer ${this.digitalOceanToken}`,
                'Content-Type': 'application/json'
            }
        });
    }
    
    async createDroplet(userId, config) {
        try {
            const dropletConfig = {
                name: config.name,
                region: 'sgp1', // Singapore
                size: this.mapConfigToSize(config),
                image: this.mapOSToImage(config.os),
                ssh_keys: [process.env.SSH_KEY_ID],
                backups: false,
                ipv6: true,
                user_data: null,
                private_networking: null,
                volumes: null,
                tags: [`user-${userId}`]
            };
            
            // Create droplet on DigitalOcean
            const response = await this.apiClient.post('/droplets', dropletConfig);
            const droplet = response.data.droplet;
            
            // Save to our database
            const vpsData = {
                userId,
                name: config.name,
                provider: 'digitalocean',
                dropletId: droplet.id,
                ipAddress: null, // Will be updated later
                status: 'creating',
                config: {
                    cpu: config.cpu,
                    ram: config.ram,
                    storage: config.storage,
                    os: config.os
                },
                createdAt: new Date().toISOString()
            };
            
            const savedVPS = await db.createVPS(vpsData);
            
            // Start monitoring once VPS is active
            setTimeout(() => {
                monitoringService.startMonitoring(savedVPS.id, userId);
            }, 60000); // Start monitoring after 1 minute
            
            return savedVPS;
            
        } catch (error) {
            console.error('Error creating droplet:', error);
            throw new Error('Failed to create VPS');
        }
    }
    
    mapConfigToSize(config) {
        // Map our config to DigitalOcean sizes
        const sizeMap = {
            '1-2': 's-1vcpu-2gb',      // 1 CPU, 2GB RAM
            '2-4': 's-2vcpu-4gb',      // 2 CPU, 4GB RAM
            '4-8': 's-4vcpu-8gb',      // 4 CPU, 8GB RAM
            '8-16': 's-8vcpu-16gb'     // 8 CPU, 16GB RAM
        };
        
        const key = `${config.cpu}-${config.ram}`;
        return sizeMap[key] || 's-1vcpu-2gb';
    }
    
    mapOSToImage(os) {
        const imageMap = {
            'ubuntu-20-04': 'ubuntu-20-04-x64',
            'ubuntu-22-04': 'ubuntu-22-04-x64',
            'debian-11': 'debian-11-x64',
            'centos-8': 'centos-8-x64'
        };
        
        return imageMap[os] || 'ubuntu-22-04-x64';
    }
    
    async getDropletStatus(dropletId) {
        try {
            const response = await this.apiClient.get(`/droplets/${dropletId}`);
            return response.data.droplet.status;
        } catch (error) {
            console.error('Error getting droplet status:', error);
            return 'unknown';
        }
    }
    
    async controlDroplet(dropletId, action) {
        try {
            let endpoint;
            
            switch(action) {
                case 'start':
                    endpoint = `/droplets/${dropletId}/actions`;
                    await this.apiClient.post(endpoint, { type: 'power_on' });
                    break;
                case 'stop':
                    endpoint = `/droplets/${dropletId}/actions`;
                    await this.apiClient.post(endpoint, { type: 'power_off' });
                    break;
                case 'reboot':
                    endpoint = `/droplets/${dropletId}/actions`;
                    await this.apiClient.post(endpoint, { type: 'reboot' });
                    break;
                case 'delete':
                    await this.apiClient.delete(`/droplets/${dropletId}`);
                    break;
                default:
                    throw new Error('Invalid action');
            }
            
            return { success: true };
        } catch (error) {
            console.error(`Error ${action} droplet:`, error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new VPSService();
