const wppconnect = require('@wppconnect-team/wppconnect');
const axios = require('axios');
const CryptoJS = require('crypto-js');
const fs = require('fs');
const path = require('path');
const { Client } = require('../models/Client');

// Armazena instâncias ativas: { clientId: { clientWpp, interval, runCycle } }
const activeBots = {};

/**
 * BotManager - Gerenciador Central de Sessões e Lógica de Busca
 * Esta classe isola cada cliente, gerencia a conexão WhatsApp e o loop de ofertas da Shopee.
 */
class BotManager {
    constructor(io) {
        this.io = io;
    }

    /**
     * Inicia uma sessão de bot para um cliente específico
     */
    async startBot(clientRecord) {
        const clientId = clientRecord.id;

        // Evita cliques duplos durante a inicialização
        if (activeBots[clientId] && activeBots[clientId].status === 'initializing') return;

        console.log(`[SYSTEM] Iniciando motor para: ${clientRecord.email}`);
        this.emitStatus(clientId, 'initializing', 'Preparando ambiente...');

        // Reserva o slot no gerenciador
        activeBots[clientId] = { status: 'initializing' };

        try {
            const clientWpp = await wppconnect.create({
                session: clientId,
                catchQR: (base64) => this.emitStatus(clientId, 'qrcode', base64),
                statusFind: (status) => this.handleWppStatus(clientId, status),
                headless: true, // Roda em background
                useChrome: true,
                autoClose: 0,
                tokenStore: 'file',
                folderNameToken: 'tokens',
                puppeteerOptions: {
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-accelerated-2d-canvas',
                        '--no-first-run',
                        '--no-zygote',
                        '--single-process',
                        '--disable-gpu'
                    ]
                }
            });

            // Sucesso na conexão
            this.emitStatus(clientId, 'connected', 'WhatsApp Online!');

            // Inicia o loop de busca (Aguarda sincronização inicial de 5s)
            setTimeout(() => {
                const loop = this.setupShopeeLoop(clientWpp, clientId);
                activeBots[clientId] = {
                    client: clientWpp,
                    interval: loop.interval,
                    runCycle: loop.runCycle,
                    status: 'online'
                };
                this.fetchGroups(clientId);
            }, 5000);

        } catch (error) {
            console.error(`[FATAL] Erro ao iniciar bot ${clientId}:`, error);
            this.stopBot(clientId);
            this.emitStatus(clientId, 'error', 'Falha ao abrir navegador');
        }
    }

    /**
     * Gerencia a tradução de estados técnicos do WhatsApp para o SaaS
     */
    handleWppStatus(clientId, status) {
        console.log(`[WPP] Status ${clientId}: ${status}`);
        if (['isLogged', 'inChat', 'chatsLoaded'].includes(status)) {
            this.emitStatus(clientId, 'connected', 'Conectado');
        } else if (['browserClose', 'qrReadError', 'serverClose'].includes(status)) {
            this.stopBot(clientId);
        }
    }

    /**
     * Configura o loop de busca de ofertas da Shopee
     */
    setupShopeeLoop(wppClient, clientId) {
        // Arquivo para não repetir ofertas enviadas
        const storePath = path.join(process.cwd(), 'store');
        if (!fs.existsSync(storePath)) fs.mkdirSync(storePath);
        const sentIdsFile = path.join(storePath, `sent_${clientId}.json`);

        let sentIds = [];
        try { if (fs.existsSync(sentIdsFile)) sentIds = JSON.parse(fs.readFileSync(sentIdsFile)); } catch (e) { }

        const runCycle = async () => {
            try {
                // Busca dados REAIS e ATUALIZADOS do banco para cada ciclo
                const config = await Client.findByPk(clientId);
                if (!config || !config.shopeeAppId || !config.shopeeAppSecret || !config.whatsappGroupId) {
                    console.log(`[LOOP] ${clientId} possui configurações incompletas.`);
                    return;
                }

                // VERIFICAÇÃO SE ESTÁ PAUSADO
                if (config.isPaused) {
                    console.log(`[LOOP] ${config.email} está PAUSADO. Pulando ciclo.`);
                    return;
                }

                // VERIFICAÇÃO DE HORÁRIO DE FUNCIONAMENTO
                const now = new Date();
                const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                const isWithinHours = (current, start, end) => {
                    if (start <= end) return current >= start && current <= end;
                    return current >= start || current <= end; // Trata horários que passam da meia-noite
                };

                if (!isWithinHours(currentTime, config.startTime, config.endTime)) {
                    console.log(`[LOOP] ${config.email} fora do horário (${config.startTime} - ${config.endTime}). Atual: ${currentTime}. Pulando.`);
                    return;
                }

                // VERIFICAÇÃO DE LIMITES POR PLANO
                const limits = { 'free': 20, 'pro': 100, 'enterprise': 9999 };
                const maxOffers = limits[config.plan] || 20;

                // Reset diário de ofertas
                const today = new Date().toISOString().split('T')[0];
                if (config.lastResetDate !== today) {
                    await config.update({ offersToday: 0, lastResetDate: today });
                }

                if (config.offersToday >= maxOffers) {
                    console.log(`[LIMIT] Cliente ${config.email} atingiu o limite diário do plano ${config.plan}.`);
                    return;
                }

                // ESPECIFICAÇÕES DE BUSCA (Keywords do Cliente)
                let keywordList = ["Celular", "Smartphone", "Monitor Gamer"]; // Fallback total

                if (config.keywords && config.keywords.trim() !== '') {
                    keywordList = config.keywords.split(',').map(k => k.trim()).filter(k => k !== '');
                    console.log(`[LOOP] Usando ${keywordList.length} palavras-chave do cliente: ${config.email}`);
                } else {
                    console.log(`[LOOP] Cliente ${config.email} sem palavras-chave. Usando padrão.`);
                }

                const selectedKey = keywordList[Math.floor(Math.random() * keywordList.length)];

                console.log(`[CYCLE] Pesquisando "${selectedKey}" para ${config.email}...`);

                // Assinatura da API Shopee
                const timestamp = Math.floor(Date.now() / 1000);
                const query = `query { productOfferV2(keyword: "${selectedKey}", sortType: 2, page: 1, limit: 10) { nodes { itemId productName imageUrl price offerLink } } }`;
                const payload = JSON.stringify({ query });
                const signature = CryptoJS.SHA256(config.shopeeAppId + timestamp + payload + config.shopeeAppSecret).toString();

                const response = await axios.post('https://open-api.affiliate.shopee.com.br/graphql', payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `SHA256 Credential=${config.shopeeAppId}, Timestamp=${timestamp}, Signature=${signature}`
                    }
                });

                const products = response.data?.data?.productOfferV2?.nodes || [];
                const freshProduct = products.find(p => !sentIds.includes(p.itemId));

                if (freshProduct) {
                    // CONSTRUÇÃO DA MENSAGEM (PERSONALIZADA)
                    let message = "";
                    if (config.messageMode === 'custom' && config.customTemplate) {
                        message = config.customTemplate
                            .replace(/{produto}/g, freshProduct.productName)
                            .replace(/{preco}/g, freshProduct.price)
                            .replace(/{link}/g, freshProduct.offerLink);
                    } else {
                        // Padrão do sistema premium
                        message = `🔥 *OFERTA IMPERDÍVEL!* 🔥\n\n` +
                            `📦 *${freshProduct.productName}*\n\n` +
                            `😱 *Por apenas:* R$ ${freshProduct.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n\n` +
                            `🛒 *Garanta o seu aqui:* ${freshProduct.offerLink}\n\n` +
                            `⚠️ _Válido enquanto durarem os estoques!_`;
                    }

                    // Envio para o WhatsApp
                    try {
                        await wppClient.sendImage(config.whatsappGroupId, freshProduct.imageUrl, 'thumb.jpg', message);
                    } catch (e) {
                        await wppClient.sendText(config.whatsappGroupId, message);
                    }

                    // Atualiza estatísticas
                    sentIds.push(freshProduct.itemId);
                    if (sentIds.length > 300) sentIds.shift();
                    fs.writeFileSync(sentIdsFile, JSON.stringify(sentIds));

                    await config.increment('offersToday');
                    console.log(`[SUCCESS] Oferta enviada para ${config.email}. Total hoje: ${config.offersToday + 1}`);
                }

            } catch (error) {
                console.error(`[ERROR-CYCLE] Erro no loop de ${clientId}:`, error.message);
            } finally {
                // AGENDA O PRÓXIMO CICLO COM O INTERVALO ATUALIZADO
                try {
                    const clientConfig = await Client.findByPk(clientId);
                    const waitTime = clientConfig ? clientConfig.searchInterval : 300000;

                    console.log(`[LOOP] Próxima busca para ${clientId} em ${waitTime / 1000 / 60} minutos.`);

                    if (activeBots[clientId]) {
                        clearTimeout(activeBots[clientId].timer);
                        activeBots[clientId].timer = setTimeout(runCycle, waitTime);
                    }
                } catch (e) {
                    // Fallback para 5 min caso o banco falhe
                    if (activeBots[clientId]) {
                        activeBots[clientId].timer = setTimeout(runCycle, 5 * 60 * 1000);
                    }
                }
            }
        };

        // Roda agora
        runCycle();
        return { runCycle };
    }

    /**
     * Busca os grupos do usuário com redundância
     */
    async fetchGroups(clientId) {
        const bot = activeBots[clientId];
        if (!bot || !bot.client) return;
        try {
            let chats = await bot.client.listChats();
            if (!chats || chats.length === 0) chats = await bot.client.getAllGroups();

            const groups = chats
                .filter(c => c.isGroup === true || (c.id && c.id._serialized && c.id._serialized.includes('@g.us')))
                .map(c => ({ id: c.id._serialized, name: c.name || 'Grupo sem nome' }));

            this.emitStatus(clientId, 'groups_list', groups.slice(0, 50)); // Limita a 50 grupos para performance
        } catch (e) { console.log('Erro ao buscar grupos:', e.message); }
    }

    /**
     * Desliga o bot de forma limpa
     */
    async stopBot(clientId) {
        if (activeBots[clientId]) {
            if (activeBots[clientId].timer) clearTimeout(activeBots[clientId].timer);
            try { if (activeBots[clientId].client) await activeBots[clientId].client.close(); } catch (e) { }
            delete activeBots[clientId];
        }

        // Limpa cache de tokens se solicitado ou falha crítica
        const tokenPath = path.join(process.cwd(), 'tokens', clientId);
        if (fs.existsSync(tokenPath)) try { fs.rmSync(tokenPath, { recursive: true, force: true }); } catch (e) { }

        this.emitStatus(clientId, 'offline', 'Bot Desconectado');
    }

    /**
     * Recupera o status atual do bot na memória
     */
    getBotStatus(clientId) {
        if (!activeBots[clientId]) return 'offline';
        if (activeBots[clientId].status === 'initializing') return 'initializing';
        return 'connected';
    }

    /**
     * Dispara status para o frontend via Socket.io
     */
    emitStatus(clientId, type, payload) {
        this.io.to(clientId).emit('bot-status', { type, payload });
    }

    /**
     * Interface para o comando de teste manual
     */
    async triggerCycle(clientId) {
        if (activeBots[clientId] && activeBots[clientId].runCycle) {
            await activeBots[clientId].runCycle();
        } else {
            throw new Error("Bot não está rodando!");
        }
    }
}

module.exports = BotManager;
