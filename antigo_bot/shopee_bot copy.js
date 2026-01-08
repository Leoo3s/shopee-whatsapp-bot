const axios = require('axios');
const CryptoJS = require('crypto-js');

// --- CONFIGURAÇÕES TÉCNICAS E DE CONEXÃO ---
const CONFIG = {
    appId: '18304520716',
    appSecret: 'F3KOKWWA46UOQKKX62YKUHVHGTZZCRMS',
    whatsappUrl: 'http://localhost:3000/send', 
    groupId: '120363422656221096@g.us',
    intervaloMinutos: 5
};

console.log("\x1b[1m🚀 Buscador de Ofertas Iniciado!\x1b[0m");

// Armazena IDs enviados para evitar repetição (Filtro Anti-Spam)
let sentIds = [];

// --- LISTA DE PALAVRAS-CHAVE PARA BUSCA ---
const categoriasAtivas = [
    "Casa e Decoração Artigos de Cozinha",
    "Casa e Decoração Item de Banheiro",
    "Casa e Decoração Louça",
    "Casa e Decoração Roupa de Cama",
    "Casa e Decoração Móveis",
    "Casa e Decoração Organizadores para casa",
    "Eletrodomésticos Utensílios de cozinha",
    "Eletrodomésticos Eletrodomésticos pequenos",
    "Eletrodomésticos Eletrodomésticos grandes",
    "Videogames Consoles e Acessórios",
    "Televisão",
    "Geladeiras",
    "Maquinas de Lavar Roupa",
    "Micro-ondas",
    "Aspiradores de pó",
    "Cafeteiras",
    "Liquidificadores e Batedeiras",
    "Eletrodomésticos TVs e Acessórios"
];

// --- MODELOS DE TEXTO (COPYWRITING) ---
const templates = [
    { header: "🚨 *OFERTA RELÂMPAGO!* 🚨", body: "Encontramos um preço absurdo para este item! O estoque está voando. 💨", cta: "APROVEITE AGORA" },
    { header: "⭐ *ACHADINHO DE OURO!* ⭐", body: "Um dos itens mais amados da Shopee com um desconto especial hoje. Vale cada centavo! 💸", cta: "VER NA LOJA" },
    { header: "💰 *OPORTUNIDADE ÚNICA!* 💰", body: "Nosso sistema detectou o menor preço dos últimos dias neste produto! 📉", cta: "PEGAR DESCONTO" },
    { header: "💎 *QUALIDADE PREMIUM* 💎", body: "Esse produto é um dos mais bem avaliados da categoria. Preço baixo e muita qualidade! ✨", cta: "EU QUERO" },
    { header: "🎁 *ACHADINHO ÚTIL* 🎁", body: "Olha o que eu acabei de encontrar! Às vezes a gente nem sabe que precisa, até ver o preço. 👀", cta: "CONFERIR" },
    { header: "🔥 *PREÇO DE ATACADO* 🔥", body: "A Shopee liberou um desconto agressivo para este item agora. É a hora de garantir o seu! ⚡", cta: "APROVEITAR" },
    { header: "👀 *VOCÊ VIU ISSO?* 👀", body: "Estava navegando e esse desconto saltou na tela. É o melhor custo-benefício do dia! 😱", cta: "EU QUERO" },
    { header: "🧸 *DESEJO DO DIA* 🧸", body: "Sabe aquele item que todo mundo está querendo? Ele entrou em promoção agora mesmo! 😍", cta: "GARANTIR O MEU" },
    { header: "🛑 *PARE TUDO E OLHA ISSO* 🛑", body: "Se você estava esperando um sinal para comprar, o sinal é esse preço baixo! 👇", cta: "VER PROMOÇÃO" },
    { header: "🏠 *CASA RENOVA* 🏠", body: "Aquele toque que faltava no seu lar com um preço que cabe no seu bolso. 🛠️", cta: "CONFERIR AGORA" },
    { header: "🛒 *CARRINHO CHEIO* 🛒", body: "Economizar de verdade é comprar o que você precisa quando o preço cai assim! 📉", cta: "ADICIONAR AGORA" },
    { header: "🌟 *SELEÇÃO ESPECIAL* 🌟", body: "Filtramos os melhores vendedores e achamos esse preço imbatível. Pode confiar! ✅", cta: "VER DETALHES" },
    { header: "💸 *ECONOMIA REAL* 💸", body: "A diferença de preço para as outras lojas é bizarra. Vale muito a pena conferir! 😲", cta: "PEGAR OFERTA" },
    { header: "🏃‍♂️ *CORRE QUE DÁ TEMPO* 🏃‍♂️", body: "Promoções assim duram poucos minutos. Se eu fosse você, não deixava passar! ⏳", cta: "QUERO COMPRAR" },
    { header: "📦 *DIRETO PRO SEU LAR* 📦", body: "Praticidade e preço baixo em um só clique. O que você buscava apareceu aqui! 🚚", cta: "VER NA SHOPEE" },
    { header: "🤫 *QUASE DE GRAÇA* 🤫", body: "Não espalha, mas esse é o menor valor que já vimos para este produto este ano! 🙊", cta: "APROVEITAR JÁ" },
    { header: "🍼 *MÃE ECONOMIZA* 🍼", body: "Qualidade para o seu pequeno com aquele desconto que ajuda no orçamento do mês! ❤️", cta: "VER PROMOÇÃO" },
    { header: "🌈 *ACHADINHO IMPERDÍVEL* 🌈", body: "Aquele item que facilita sua vida e ainda estava com um super desconto escondido! 🕵️", cta: "EU QUERO" },
    { header: "⚡ *FLASH DEAL* ⚡", body: "O algoritmo da Shopee acaba de baixar o preço deste item. É agora ou nunca! 🏹", cta: "COMPRAR AGORA" },
    { header: "📉 *QUEDA DE PREÇO* 📉", body: "Alerta de baixa de preço! O valor despencou e nós te avisamos primeiro. 🔔", cta: "VER DESCONTO" }
];

// --- FUNÇÃO PRINCIPAL DE BUSCA E ENVIO ---
async function executarCiclo() {
    try {
        // Sorteio de categoria, página e preparação do tempo para assinatura
        const escolhaNome = categoriasAtivas[Math.floor(Math.random() * categoriasAtivas.length)];
        const timestamp = Math.floor(Date.now() / 1000);
        const randomPage = Math.floor(Math.random() * 10) + 1;

        console.log(`\x1b[33m[${new Date().toLocaleTimeString()}]\x1b[0m 🔎 Buscando em: ${escolhaNome}...`);

        // Montagem da Query GraphQL para a API da Shopee
        const query = `query { productOfferV2(keyword: "${escolhaNome}", sortType: 2, page: ${randomPage}, limit: 50)
        { nodes { 
                    itemId 
                    productName 
                    imageUrl 
                    price 
                    offerLink 
                    priceDiscountRate 
                    ratingStar
                    sales
                    } } }`;

// Função para transformar números em formato k (Ex: 1200 -> 1.2k)
function formatarVendas(n) {
    if (n >= 1000) {
        return (n / 1000).toFixed(1).replace('.0', '') + 'k';
    }
    return n;
}

        // Geração da assinatura de segurança (Security Signature)
        const payloadString = JSON.stringify({ query });
        const signature = CryptoJS.SHA256(CONFIG.appId + timestamp + payloadString + CONFIG.appSecret).toString();

        // Requisição para os servidores da Shopee
        const response = await axios.post('https://open-api.affiliate.shopee.com.br/graphql', payloadString, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `SHA256 Credential=${CONFIG.appId}, Timestamp=${timestamp}, Signature=${signature}`
            }
        });

        // Filtragem: Produto deve ter nome, não ter sido enviado e ter vendas > 0
        const products = response.data?.data?.productOfferV2?.nodes || [];
        const freshProduct = products.find(p => p.productName && p.productName.trim() !== "" && !sentIds.includes(p.itemId) && p.sales > 0);

        if (!freshProduct) {
            console.log(`\x1b[90m[${new Date().toLocaleTimeString()}] ⚠️ Nenhum produto novo agora.\x1b[0m`);
            return;
        }

        // Gerenciamento da lista de IDs enviados (mantém os últimos 200)
        sentIds.push(freshProduct.itemId);
        if (sentIds.length > 200) sentIds.shift();

        // --- PROCESSAMENTO DE PREÇOS E DESCONTOS ---
        const price = parseFloat(freshProduct.price);
        const discountRate = parseInt(freshProduct.priceDiscountRate || 0);
        const priceStr = price.toFixed(2).replace('.', ',');
        let priceSection = '';

        // Cálculo do preço original baseado na porcentagem de desconto da API
        if (discountRate > 0) {
            const originalPrice = price / (1 - (discountRate / 100));
            const oldPriceStr = originalPrice.toFixed(2).replace('.', ',');
            priceSection = `❌ De: ~R$ ${oldPriceStr}~\n✅ *Por apenas: R$ ${priceStr}*\n📉 *(${discountRate}% OFF)*`;
        } else {
            priceSection = `💰 *Valor: R$ ${priceStr}*`;
        }

        // --- FORMATAÇÃO VISUAL DA MENSAGEM ---
        const rating = freshProduct.ratingStar ? `⭐ ${freshProduct.ratingStar}` : '⭐ 4.5';
        const vendasNum = parseInt(freshProduct.sales || 0);
        const vendas = vendasNum > 0 ? `| 🔥 +${formatarVendas(vendasNum)} vendidos` : '';
        const copy = templates[Math.floor(Math.random() * templates.length)];

        const messageBody = `${copy.header}\n\n` +
                  `${rating} ${vendas}\n\n` +
                  `🛍️ *${freshProduct.productName.trim()}*\n\n` +
                  `${copy.body}\n\n` +
                  `${priceSection}\n\n` +
                  `🚀 *${copy.cta}:*\n${freshProduct.offerLink}\n\n` +
                  `---\n` +
                  `_⚠️ Preços sujeitos a alteração conforme as regras da plataforma._`;

        // --- ENVIO DOS DADOS PARA A API LOCAL (INDEX.JS) ---
        await axios.post(CONFIG.whatsappUrl, {
            groupId: CONFIG.groupId,
            productName: freshProduct.productName.trim(),
            imageUrl: freshProduct.imageUrl,
            message: messageBody,
            offerLink: freshProduct.offerLink
        });

        console.log(`\x1b[32m[${new Date().toLocaleTimeString()}] ✅ ENVIADO: ${freshProduct.productName.trim()}\x1b[0m`);

    } catch (error) {
        console.error("\x1b[31m❌ Erro no ciclo:\x1b[0m", error.message);
    }
}

// --- CONTROLE DE AGENDAMENTO (TIMERS) ---
function iniciarAgendamento() {
    executarCiclo();
    
    // Intervalo com variação de até 30s para evitar comportamento robótico (Anti-Ban)
    setInterval(() => {
        const delayExtra = Math.floor(Math.random() * 30000);
        setTimeout(() => {
            executarCiclo();
        }, delayExtra);
    }, CONFIG.intervaloMinutos * 60 * 1000);
}

// Aguarda 10 segundos iniciais para estabilização do sistema
setTimeout(iniciarAgendamento, 10000);