import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import os from 'os'

// Get network IP address
function getNetworkIp() {
    const nets = os.networkInterfaces()
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address
            }
        }
    }
    return 'localhost'
}

const networkIp = getNetworkIp()

// Custom plugin to display URLs on server start
const showUrlsPlugin = () => ({
    name: 'show-urls',
    configureServer(server) {
        server.httpServer?.once('listening', () => {
            const port = 3000

            setTimeout(() => {
                console.log('\n' + '='.repeat(60))
                console.log('  🎓 CAMPUS INTELLIGENCE SYSTEM')
                console.log('='.repeat(60))
                console.log(`\n  📚 Student Login:`)
                console.log(`     Local:   https://localhost:${port}/student/login`)
                console.log(`     Network: https://${networkIp}:${port}/student/login`)
                console.log(`\n  🏛️  Management Login:`)
                console.log(`     Local:   https://localhost:${port}/management/login`)
                console.log(`     Network: https://${networkIp}:${port}/management/login`)
                console.log(`\n  🎨 VBoard (HTTPS - Camera Enabled):`)
                console.log(`     https://${networkIp}:9444/`)
                console.log(`\n  📱 Mobile Scanner (HTTPS):`)
                console.log(`     https://${networkIp}:9443/scanner`)
                console.log('\n' + '='.repeat(60) + '\n')
            }, 100)
        })
    }
})

export default defineConfig({
    plugins: [react(), mkcert(), showUrlsPlugin()],
    server: {
        port: 3000,
        host: '0.0.0.0',
        open: false,
        proxy: {
            '/api/library': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
            },
            // Backend-chat endpoints (port 8083)
            '/api/notices': {
                target: 'http://localhost:8083',
                changeOrigin: true,
                secure: false,
            },
            '/api/groups': {
                target: 'http://localhost:8083',
                changeOrigin: true,
                secure: false,
            },
            '/api/history': {
                target: 'http://localhost:8083',
                changeOrigin: true,
                secure: false,
            },
            '/api/users': {
                target: 'http://localhost:8083',
                changeOrigin: true,
                secure: false,
            },
            '/api/friends': {
                target: 'http://localhost:8083',
                changeOrigin: true,
                secure: false,
            },
            '/api': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
            },
            '/agent-api': {
                target: 'http://localhost:8010',
                changeOrigin: true,
                secure: false,
                rewrite: (path) => path.replace(/^\/agent-api/, '')
            },
            '/ws': {
                target: 'http://localhost:8082',
                changeOrigin: true,
                secure: false,
                ws: true // Enable WebSocket proxying
            },
            '/ws-chat': {
                target: 'http://localhost:8083',
                changeOrigin: true,
                secure: false,
                ws: true,
                rewrite: (path) => path.replace(/^\/ws-chat/, '/ws')
            }
        }
    }
})

