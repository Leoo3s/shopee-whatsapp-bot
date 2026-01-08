const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { Client } = require('./models/Client');
const BotManager = require('./services/BotManager');

/**
 * SERVIDOR CENTRAL SAAS SHOPEEBOT
 * Responsável pelas rotas de API, Autenticação e Sincronização em tempo real.
 */
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const botManager = new BotManager(io);

// --- ENDPOINTS DA API ---

// Registro de Novos Clientes
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const client = await Client.create({ email, password });
        res.json({ success: true, clientId: client.id });
    } catch (e) { res.status(400).json({ error: "E-mail já cadastrado ou dados inválidos." }); }
});

// Login do Painel
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const client = await Client.findOne({ where: { email, password } });
        if (client) res.json({ success: true, clientId: client.id });
        else res.status(401).json({ error: 'Credenciais incorretas.' });
    } catch (e) { res.status(500).json({ error: 'Erro interno no servidor.' }); }
});

// Busca Configurações (Garante que Keywords e Templates voltem para o Front)
app.get('/api/config/:clientId', async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.clientId);
        res.json(client);
    } catch (e) { res.status(404).json({ error: 'Cliente não encontrado.' }); }
});

// Salva Configurações (O coração da customização)
app.post('/api/config/:clientId', async (req, res) => {
    try {
        const {
            shopeeAppId, shopeeAppSecret, whatsappGroupId,
            keywords, messageMode, customTemplate, searchInterval,
            startTime, endTime
        } = req.body;

        await Client.update(
            { shopeeAppId, shopeeAppSecret, whatsappGroupId, keywords, messageMode, customTemplate, searchInterval, startTime, endTime },
            { where: { id: req.params.clientId } }
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: 'Erro ao salvar configurações.' }); }
});

// Controle de Ligar/Desligar Robô
app.post('/api/start/:clientId', async (req, res) => {
    const client = await Client.findByPk(req.params.clientId);
    botManager.startBot(client);
    res.json({ success: true });
});

app.post('/api/stop/:clientId', async (req, res) => {
    await botManager.stopBot(req.params.clientId);
    res.json({ success: true });
});

app.post('/api/refresh-groups/:clientId', async (req, res) => {
    await botManager.fetchGroups(req.params.clientId);
    res.json({ success: true });
});

app.post('/api/toggle-pause/:clientId', async (req, res) => {
    try {
        const client = await Client.findByPk(req.params.clientId);
        await client.update({ isPaused: !client.isPaused });
        res.json({ success: true, isPaused: client.isPaused });
    } catch (e) { res.status(500).json({ error: 'Erro ao alternar status.' }); }
});

app.post('/api/test-cycle/:clientId', async (req, res) => {
    try {
        await botManager.triggerCycle(req.params.clientId);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: e.message }); }
});

// --- COMUNICAÇÃO EM TEMPO REAL (SOCKET.IO) ---

io.on('connection', (socket) => {
    socket.on('join-client-room', (clientId) => {
        socket.join(clientId);
        console.log(`[SOCKET] Cliente ${clientId} conectado.`);

        // Sincroniza status imediato para o frontend que acabou de abrir
        const status = botManager.getBotStatus(clientId);
        socket.emit('bot-status', { type: status, payload: 'Sincronizado' });
    });
});

// Inicialização
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 ==========================================`);
    console.log(`SaaS Backend disponível na porta: ${PORT}`);
    console.log(`Modo: Cloud Ready (Pronto para Nuvem)`);
    console.log(`==========================================\n`);
});
