require('dotenv').config();
const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const app = express();

app.use(express.json());

// --- CONFIGURAÇÕES DE NOTIFICAÇÃO PESSOAL ---
const MEU_NUMERO_COM_9 = process.env.ADMIN_NUMBER;
const MEU_NUMERO_SEM_9 = process.env.ADMIN_NUMBER_ALT;

let totalEnviados = 0;
let errosNoCiclo = 0;
const inicioSistema = new Date();

const getTimestamp = () => {
    const agora = new Date();
    return `\x1b[90m[${agora.toLocaleTimeString('pt-BR')}]\x1b[0m`;
};

// --- INICIALIZAÇÃO DO WHATSAPP ---
wppconnect.create({
    session: 'afiliado-shopee',
    catchQR: (base64Qr, asciiQR) => { console.log(asciiQR); },
    statusFind: (statusSession) => {
        console.log(`${getTimestamp()} ℹ️ Status: \x1b[36m${statusSession}\x1b[0m`);
    }
}).then(async (client) => {
    global.client = client;
    console.log(`${getTimestamp()} \x1b[32mWhatsApp conectado com sucesso! ✅\x1b[0m`);

    // --- NOTIFICAÇÃO DE REINÍCIO APRIMORADA ---
    setTimeout(async () => {
        const dataHora = new Date().toLocaleString('pt-BR');
        const msgInicio = `🚀 *SISTEMA INICIALIZADO* 🚀\n\n` +
            `📅 *Data/Hora:* ${dataHora}\n` +
            `✅ *Status:* Conectado com Sucesso\n` +
            `⚙️ *Plataforma:* Node.js ${process.version}\n\n` +
            `_Monitoramento de ofertas ativo!_`;

        const enviar = async (numero) => {
            try {
                await global.client.sendText(numero, msgInicio);
                console.log(`\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m \x1b[35m📲 Notificação de boot enviada para: ${numero}\x1b[0m`);
                return true;
            } catch (e) { return false; }
        };

        const enviado = await enviar(MEU_NUMERO_COM_9);
        if (!enviado) await enviar(MEU_NUMERO_SEM_9);
    }, 5000);

    // --- RELATÓRIO DE STATUS AUTOMÁTICO (A cada 1 hora) ---
    setInterval(async () => {
        const agora = new Date();
        const uptime = Math.floor((agora - inicioSistema) / (1000 * 60 * 60));

        const statusMsg = `📊 *RELATÓRIO DE PERFORMANCE* 📊\n\n` +
            `⏱️ *Uptime:* ${uptime} horas online\n` +
            `✅ *Sucessos:* ${totalEnviados} ofertas enviadas\n` +
            `❌ *Falhas:* ${errosNoCiclo} erros de envio\n` +
            `📡 *Porta:* 3000 (Ativa)\n\n` +
            `_O sistema continua monitorando as ofertas._`;

        try {
            await client.sendText(MEU_NUMERO_COM_9, statusMsg);
            console.log(`${getTimestamp()} \x1b[35m📊 Relatório enviado ao administrador.\x1b[0m`);
            errosNoCiclo = 0;
        } catch (err) {
            await client.sendText(MEU_NUMERO_SEM_9, statusMsg).catch(() => { });
        }
    }, 60 * 60 * 1000);
});

// --- ROTA DE ENVIO ---
app.post('/send', async (req, res) => {
    const { groupId, message, imageUrl, productName, offerLink } = req.body; // Adicionado offerLink
    if (!global.client) return res.status(503).json({ erro: "WhatsApp desconectado" });

    try {
        // 1. ENVIA PARA O GRUPO (Sua lógica original)
        if (imageUrl && imageUrl.includes('http')) {
            await global.client.sendImage(groupId, imageUrl, 'foto.jpg', message);
        } else {
            await global.client.sendText(groupId, message);
        }
        totalEnviados++;
        console.log(`${getTimestamp()} \x1b[32m✅ GRUPO (#${totalEnviados}):\x1b[0m ${productName}`);


        res.json({ status: 'sucesso' });
    } catch (error) {
        errosNoCiclo++;
        console.error(`${getTimestamp()} \x1b[31m❌ ERRO:\x1b[0m`, error.message);
        res.status(500).json({ erro: true });
    }
});

app.listen(3000, () => console.log(`\n🚀 SERVIDOR API PORTA 3000\n`));