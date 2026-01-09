const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const { Client } = require('./models/Client');
const BotManager = require('./services/BotManager');

/**
 * SERVIDOR CENTRAL SAAS SHOPEEBOT
 * Responsável pelas rotas de API, Autenticação e Sincronização em tempo real.
 */
const app = express();
app.use(cors());
app.use(express.json());

// Rota de teste para confirmar que o servidor está vivo
app.get('/', (req, res) => {
    res.send('🚀 SaaS ShopeeBot Backend - ONLINE');
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
const botManager = new BotManager(io);

// --- ENDPOINTS DA API ---

// Registro de Novos Clientes
app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Hash da senha antes de salvar
        const hashedPassword = await bcrypt.hash(password, 10);
        const client = await Client.create({ email, password: hashedPassword });
        res.json({ success: true, clientId: client.id });
    } catch (e) {
        if (e.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: "Este e-mail já está em uso. Tente fazer login." });
        }
        res.status(400).json({ error: "Erro ao criar conta. Verifique os dados." });
    }
});

// Login do Painel
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const client = await Client.findOne({ where: { email } });

        if (client && await bcrypt.compare(password, client.password)) {
            res.json({ success: true, clientId: client.id, isAdmin: client.isAdmin });
        } else {
            res.status(401).json({ error: 'Credenciais incorretas.' });
        }
    } catch (e) {
        console.error('[LOGIN-ERROR]', e);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// --- ROTAS ADMINISTRATIVAS (DONO DO APP) ---

// Promover usuário a ADMIN (Use no navegador com seu email)
app.get('/api/admin/promo/:email', async (req, res) => {
    try {
        const client = await Client.findOne({ where: { email: req.params.email } });
        if (client) {
            await client.update({ isAdmin: true, plan: 'enterprise' });
            res.send(`🏆 ${req.params.email} agora é ADMINISTRADOR!`);
        } else res.status(404).send("Usuário não encontrado.");
    } catch (e) { res.status(500).send("Erro ao promover."); }
});

// Estatísticas Globais
app.get('/api/admin/stats', async (req, res) => {
    try {
        const totalUsers = await Client.count();
        const totalOffers = await Client.sum('offersToday');
        const activeUsers = await Client.count({ where: { isPaused: false } });
        res.json({ totalUsers, totalOffers, activeUsers });
    } catch (e) { res.status(500).json({ error: 'Erro ao buscar stats' }); }
});

// Lista de Usuários do Sistema
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await Client.findAll({
            attributes: ['id', 'email', 'plan', 'offersToday', 'createdAt', 'isPaused']
        });
        res.json(users);
    } catch (e) { res.status(500).json({ error: 'Erro ao buscar usuários' }); }
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

        console.log(`[API] POST /api/config/${req.params.clientId} - Saving client configuration`); // Added logging
        await Client.update(
            { shopeeAppId, shopeeAppSecret, whatsappGroupId, keywords, messageMode, customTemplate, searchInterval, startTime, endTime },
            { where: { id: req.params.clientId } }
        );
        console.log(`[API] POST /api/config/${req.params.clientId} - Configuration saved successfully`); // Added logging
        res.json({ success: true });
    } catch (e) {
        console.error(`[API-ERROR] POST /api/config/${req.params.clientId} - Error: ${e.message}`); // Added logging
        res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
});

// Controle de Ligar/Desligar Robô
app.post('/api/start/:clientId', async (req, res) => {
    console.log(`[API] POST /api/start/${req.params.clientId} - Attempting to start bot`); // Added logging
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
