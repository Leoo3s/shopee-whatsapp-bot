const { Sequelize, DataTypes } = require('sequelize');

// Configuração de conexão flexível (Nuvem ou Local)
const dbUrl = process.env.DATABASE_URL;
const sequelize = dbUrl
    ? new Sequelize(dbUrl, {
        dialect: 'postgres',
        logging: false,
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false // Necessário para a maioria dos bancos grátis (Supabase/Railway)
            }
        }
    })
    : new Sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
    });

/**
 * Modelo de Cliente SaaS
 * Armazena credenciais, configurações de bot, plano e estatísticas de uso.
 */
const Client = sequelize.define('Client', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },

    // Configurações Shopee
    shopeeAppId: { type: DataTypes.STRING, allowNull: true },
    shopeeAppSecret: { type: DataTypes.STRING, allowNull: true },

    // Configurações WhatsApp
    whatsappGroupId: { type: DataTypes.STRING, allowNull: true },

    // Configurações do Bot
    keywords: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: 'Celular, Smartphone, Monitor Gamer'
    },

    // CUSTOMIZAÇÃO DE MENSAGEM
    messageMode: {
        type: DataTypes.STRING,
        defaultValue: 'standard'
    },
    customTemplate: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: '🔥 *OFERTA IMPERDÍVEL* 🔥\n\n🛍️ {produto}\n💰 Por apenas: *R$ {preco}*\n\n🔗 Compre aqui: {link}'
    },

    // SISTEMA DE PLANOS
    plan: {
        type: DataTypes.STRING,
        defaultValue: 'free'
    },

    // LIMITES
    offersToday: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    // Intervalo de busca em MILISSEGUNDOS (Padrão 5 min = 300000)
    searchInterval: {
        type: DataTypes.INTEGER,
        defaultValue: 300000
    },
    // Data de término do teste de 7 dias
    trialEndDate: {
        type: DataTypes.DATE,
        defaultValue: () => {
            const date = new Date();
            date.setDate(date.getDate() + 7);
            return date;
        }
    },
    lastResetDate: {
        type: DataTypes.STRING,
        defaultValue: new Date().toISOString().split('T')[0]
    },

    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    isPaused: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    startTime: {
        type: DataTypes.STRING,
        defaultValue: '00:00'
    },
    endTime: {
        type: DataTypes.STRING,
        defaultValue: '23:59'
    },
    isAdmin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
});

// Sincronização com migração MANUAL para SQLite (Sequelize alter:true falha no SQLite para novas colunas)
sequelize.sync().then(async () => {
    const columns = [
        { name: 'keywords', type: 'TEXT' },
        { name: 'messageMode', type: 'STRING DEFAULT "standard"' },
        { name: 'customTemplate', type: 'TEXT' },
        { name: 'plan', type: 'STRING DEFAULT "free"' },
        { name: 'offersToday', type: 'INTEGER DEFAULT 0' },
        { name: 'lastResetDate', type: 'STRING' },
        { name: 'searchInterval', type: 'INTEGER DEFAULT 300000' },
        { name: 'trialEndDate', type: 'DATETIME' },
        { name: 'isPaused', type: 'BOOLEAN DEFAULT false' },
        { name: 'startTime', type: 'STRING DEFAULT "00:00"' },
        { name: 'endTime', type: 'STRING DEFAULT "23:59"' },
        { name: 'isAdmin', type: 'BOOLEAN DEFAULT false' }
    ];

    for (const col of columns) {
        try {
            await sequelize.query(`ALTER TABLE Clients ADD COLUMN ${col.name} ${col.type};`);
            console.log(`[DB] Coluna ${col.name} adicionada.`);
        } catch (e) {
            // Ignora se a coluna já existir
        }
    }
    console.log("Banco de dados pronto para o SaaS.");
});

module.exports = { Client, sequelize };
