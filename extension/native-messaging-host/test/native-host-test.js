const os = require('os');
const net = require('net');
const path = require('path');
const fs = require('fs');

const sockPath = path.join(os.tmpdir(), 'keeweb-example.sock');

try {
    fs.unlinkSync(sockPath);
} catch {}

const server = net.createServer((socket) => {
    socket.on('data', (data) => {
        socket.write(data);
    });
    socket.on('end', () => {});
});
server.listen(sockPath);
