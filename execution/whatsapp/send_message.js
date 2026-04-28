const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        args: ['--no-sandbox']
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('Client is ready!');
    
    // Check if we have arguments to send a message immediately
    const args = process.argv.slice(2);
    if (args.length >= 2) {
        const target = args[0]; // Format: '5511999999999@c.us' or 'groupid@g.us'
        const message = args.slice(1).join(' ');
        
        client.sendMessage(target, message).then(response => {
            console.log('Message sent successfully');
            process.exit(0);
        }).catch(err => {
            console.error('Error sending message:', err);
            process.exit(1);
        });
    } else {
        console.log('No message provided. Staying online...');
    }
});

client.on('message', msg => {
    if (msg.body == '!ping') {
        msg.reply('pong');
    }
});

client.initialize();
