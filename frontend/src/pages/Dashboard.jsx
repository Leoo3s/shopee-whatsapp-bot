import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import {
    Rocket, Settings, LogOut, Smartphone, QrCode, Save,
    CheckCircle2, RefreshCw, Users, Zap, List, MessageSquare,
    Crown, ShieldCheck, Check, Clock, Play, Pause, Moon, ShoppingBag,
    Menu, X, BarChart3, Activity
} from 'lucide-react';

const KOYEB_URL = 'https://innocent-rici-1leo3s-0914f4ce.koyeb.app';
const API_URL = import.meta.env.VITE_API_URL || `${KOYEB_URL}/api`;
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || KOYEB_URL;

const socket = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling']
});

/**
 * Dashboard Central do ShopeeFlow
 * Gerencia conexão, configuração de mensagens, grupos e planos.
 */
export default function Dashboard({ user, onLogout }) {
    const [activeTab, setActiveTab] = useState('connect');
    const [config, setConfig] = useState({
        shopeeAppId: '',
        shopeeAppSecret: '',
        whatsappGroupId: '',
        keywords: '',
        messageMode: 'standard',
        customTemplate: '',
        plan: 'free',
        offersToday: 0,
        searchInterval: 300000,
        isPaused: false,
        startTime: '00:00',
        endTime: '23:59'
    });

    // Estados de Controle do Bot
    const [botStatus, setBotStatus] = useState('offline');
    const [qrCode, setQrCode] = useState(null);
    const [availableGroups, setAvailableGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Responsividade

    // Estados Admin
    const [adminStats, setAdminStats] = useState(null);
    const [adminUsers, setAdminUsers] = useState([]);

    const isConnected = botStatus === 'connected';
    const isWaitingQr = botStatus === 'qrcode';
    const isInitializing = botStatus === 'initializing';

    // 1. CARREGAMENTO INICIAL
    useEffect(() => {
        socket.connect();
        socket.emit('join-client-room', user.id);

        fetchUserConfig();

        const statusHandler = (data) => {
            console.log("[SOCKET] Evento:", data.type);
            if (data.type === 'qrcode') {
                setBotStatus('qrcode');
                setQrCode(data.payload);
            } else if (data.type === 'connected') {
                setBotStatus('connected');
                setQrCode(null);
            } else if (data.type === 'offline') {
                setBotStatus('offline');
                setQrCode(null);
            } else if (data.type === 'groups_list') {
                setAvailableGroups(data.payload);
                setLoadingGroups(false);
            }
        };

        socket.on('bot-status', statusHandler);
        return () => {
            socket.off('bot-status', statusHandler);
            socket.disconnect();
        };
    }, [user.id]);

    // Sempre que trocar de aba, garante que subimos a página
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [activeTab]);

    const fetchUserConfig = async () => {
        try {
            const res = await axios.get(`${API_URL}/config/${user.id}`);
            if (res.data) {
                setConfig(prev => ({ ...prev, ...res.data }));
            }
        } catch (e) { console.error("Erro ao carregar configurações."); }
    };

    const fetchAdminData = async () => {
        if (!user.isAdmin) return;
        try {
            const [s, u] = await Promise.all([
                axios.get(`${API_URL}/admin/stats`),
                axios.get(`${API_URL}/admin/users`)
            ]);
            setAdminStats(s.data);
            setAdminUsers(u.data);
        } catch (e) { console.error("Erro admin."); }
    };

    useEffect(() => {
        if (activeTab === 'admin') fetchAdminData();
    }, [activeTab]);

    // 2. AÇÕES DO USUÁRIO
    const handleTogglePause = async () => {
        try {
            const res = await axios.post(`${API_URL}/toggle-pause/${user.id}`);
            setConfig(prev => ({ ...prev, isPaused: res.data.isPaused }));
        } catch (e) { alert('Erro ao alternar status do bot.'); }
    };

    const handleSaveConfig = async () => {
        try {
            await axios.post(`${API_URL}/config/${user.id}`, config);
            alert('✅ Configurações salvas no servidor!');
            fetchUserConfig(); // Recarrega para confirmar
        } catch (e) { alert('❌ Erro ao salvar'); }
    };

    const handleConnect = async () => {
        if (!config.shopeeAppId || !config.shopeeAppSecret) {
            alert('⚠️ Configure suas chaves da Shopee na aba Configuração primeiro!');
            setActiveTab('config');
            return;
        }
        setBotStatus('initializing');
        try { await axios.post(`${API_URL}/start/${user.id}`); }
        catch (e) { setBotStatus('offline'); alert('Erro ao iniciar serviço.'); }
    };

    const handleDisconnect = async () => {
        try { await axios.post(`${API_URL}/stop/${user.id}`); } catch (e) { }
    };

    const handleTriggerCycle = async () => {
        if (!isConnected) return alert('Bot Offline!');
        try {
            await axios.post(`${API_URL}/test-cycle/${user.id}`);
            alert('🚀 Busca manual iniciada! Cheque seu grupo.');
        } catch (e) { alert('Erro ao forçar busca.'); }
    };

    const refreshGroups = async () => {
        if (!isConnected) return alert('Bot Offline!');
        setLoadingGroups(true);
        try { await axios.post(`${API_URL}/refresh-groups/${user.id}`); }
        catch (e) { setLoadingGroups(false); }
    };

    const handleUpgradePlan = async (planName) => {
        const confirmMsg = `Você deseja mudar para o ${planName}? Esta é uma simulação de pagamento.`;
        if (window.confirm(confirmMsg)) {
            try {
                const planKey = planName.toLowerCase().includes('pro') ? 'pro' :
                    planName.toLowerCase().includes('max') ? 'enterprise' : 'free';
                await axios.post(`${API_URL}/config/${user.id}`, { ...config, plan: planKey });
                alert('🚀 Plano atualizado com sucesso! (Simulação)');
                fetchUserConfig();
            } catch (e) { alert('Erro ao atualizar plano.'); }
        }
    };

    // 3. UI RENDER
    return (
        <div className="flex min-h-screen bg-[#f8fafc] flex-col md:flex-row">

            {/* MOBILE HEADER */}
            <div className="md:hidden bg-white p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 z-50">
                <h1 className="text-xl font-black text-slate-800 tracking-tighter">Shopee<span className="text-[#ee4d2d]">Flow</span></h1>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-500">
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* SIDEBAR RESPONSIVA */}
            <aside className={`w-64 bg-white border-r border-slate-200 flex flex-col fixed md:sticky top-0 h-screen z-40 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-8 border-b border-slate-100 mb-6 text-center hidden md:block">
                    <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-[#ee4d2d] shadow-sm">
                        <ShoppingBag size={40} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tighter">
                        Shopee<span className="text-[#ee4d2d]">Flow</span>
                    </h1>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-10 md:mt-0">
                    <SidebarItem active={activeTab === 'connect'} onClick={() => { setActiveTab('connect'); setIsSidebarOpen(false); }} icon={<Smartphone size={20} />} label="Conexão" badge={isConnected ? "Online" : null} />
                    <SidebarItem active={activeTab === 'config'} onClick={() => { setActiveTab('config'); setIsSidebarOpen(false); }} icon={<Settings size={20} />} label="Configuração" />
                    <SidebarItem active={activeTab === 'status'} onClick={() => { setActiveTab('status'); setIsSidebarOpen(false); }} icon={<Rocket size={20} />} label="Dashboard" />
                    <SidebarItem active={activeTab === 'plans'} onClick={() => { setActiveTab('plans'); setIsSidebarOpen(false); }} icon={<Crown size={20} />} label="Assinatura" highlight />
                    {user.isAdmin && (
                        <SidebarItem active={activeTab === 'admin'} onClick={() => { setActiveTab('admin'); setIsSidebarOpen(false); }} icon={<BarChart3 size={20} />} label="Administração" />
                    )}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="px-4 py-3 bg-slate-50 rounded-xl mb-4">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Plano Atual</p>
                        <p className="text-sm font-bold text-slate-700 capitalize flex items-center gap-2">
                            <ShieldCheck size={14} className="text-[#ee4d2d]" /> {config.plan === 'free' ? 'Trial 7 Dias' : config.plan}
                        </p>
                    </div>
                    <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium">
                        <LogOut size={18} /> Sair do Painel
                    </button>
                </div>
            </aside>

            {/* OVERLAY MOBILE */}
            {isSidebarOpen && (
                <div onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden" />
            )}

            {/* CONTEÚDO DINÂMICO */}
            <main className="flex-1 p-8 md:p-12 overflow-y-auto">

                {/* ABA 1: CONEXÃO */}
                {activeTab === 'connect' && (
                    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                        <Header title="Gerenciar Conexão" desc="Acesse seu WhatsApp usando criptografia de ponta a ponta." />

                        {isConnected ? (
                            <div className="bg-white border-2 border-green-100 rounded-3xl p-12 text-center shadow-xl shadow-green-50">
                                <div className="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 size={48} /></div>
                                <h3 className="text-2xl font-black text-slate-800">Conectado com Sucesso!</h3>
                                <p className="text-slate-500 mt-2 mb-8 leading-relaxed max-w-sm mx-auto">O robô agora está monitorando a API da Shopee e enviará ofertas para o grupo escolhido.</p>
                                <button onClick={handleDisconnect} className="px-8 py-3 rounded-full text-red-500 text-sm font-bold border border-red-100 hover:bg-red-50 transition">Desconectar Sessão com Segurança</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <Step number="1" title="Preparar Motor" desc="Clique no botão para ligar o servidor de conexão invisível." />
                                    <Step number="2" title="Escanear QR Code" desc="Abra seu WhatsApp > Menu > Aparelhos > Conectar." />
                                    <Step number="3" title="Mantenha Ativo" desc="A conexão é persistente, você só precisa escanear 1 vez." />
                                    {!isInitializing && !isWaitingQr && (
                                        <button onClick={handleConnect} className="w-full btn-primary py-5 rounded-2xl shadow-xl shadow-orange-200 text-lg font-black uppercase tracking-tighter hover:scale-[1.02] transition-transform">
                                            Iniciar Nova Conexão
                                        </button>
                                    )}
                                    {isInitializing && <div className="p-5 bg-orange-50 border border-orange-100 text-orange-700 rounded-2xl flex items-center justify-center gap-3 font-bold animate-pulse"><RefreshCw className="animate-spin" /> Verificando Servidor...</div>}
                                </div>
                                <div className="bg-white border-4 border-slate-50 rounded-3xl p-10 flex flex-col items-center justify-center min-h-[400px] shadow-sm relative overflow-hidden">
                                    {isWaitingQr && qrCode ? (
                                        <div className="text-center animate-in zoom-in duration-500">
                                            <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100">
                                                <img src={qrCode} className="w-64 h-64 mix-blend-multiply" alt="Autenticação" />
                                            </div>
                                            <p className="text-xs text-[#ee4d2d] mt-6 font-black uppercase tracking-widest animate-bounce">Escaneie o código acima</p>
                                        </div>
                                    ) : !isConnected && (
                                        <div className="text-slate-200 flex flex-col items-center select-none">
                                            <QrCode size={120} strokeWidth={0.5} />
                                            <p className="mt-4 text-sm font-medium text-slate-400">Aguardando comando...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ABA 2: CONFIGURAÇÃO (TOTALMENTE REFATORADA) */}
                {activeTab === 'config' && (
                    <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                        <Header title="Configurações do Robô" desc="Defina sua estratégia de busca e o visual das ofertas." />

                        <div className="space-y-8">
                            {/* CREDENCIAIS */}
                            <ConfigSection icon={<ShieldCheck size={18} />} title="API Shopee Afiliação">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormInput label="App ID" value={config.shopeeAppId} onChange={v => setConfig({ ...config, shopeeAppId: v })} placeholder="Ex: 18304..." />
                                    <FormInput label="App Secret" type="password" value={config.shopeeAppSecret} onChange={v => setConfig({ ...config, shopeeAppSecret: v })} placeholder="••••••••••••" />
                                </div>
                            </ConfigSection>

                            {/* CONFIGURAÇÃO DE TEMPO */}
                            <ConfigSection icon={<Clock size={18} />} title="Controle de Tempo">
                                <div className="space-y-6">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-4 font-medium">A cada quanto tempo o robô deve buscar uma nova oferta?</p>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {[1, 2, 5, 10, 20, 30, 60].map(min => (
                                                <button
                                                    key={min}
                                                    onClick={() => setConfig({ ...config, searchInterval: min * 60000 })}
                                                    className={`py-3 rounded-xl border-2 font-bold transition-all ${config.searchInterval === (min * 60000) ? 'border-[#ee4d2d] bg-orange-50 text-[#ee4d2d]' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                                                >
                                                    {min} Min
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-50">
                                        <p className="text-xs text-slate-400 mb-4 font-medium">Intervalo de funcionamento diário:</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Início</label>
                                                <input
                                                    type="time"
                                                    className="w-full border-2 border-slate-50 rounded-2xl px-5 py-4 text-slate-700 focus:border-[#ee4d2d] outline-none bg-slate-50 font-bold"
                                                    value={config.startTime || '00:00'}
                                                    onChange={e => setConfig({ ...config, startTime: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2 ml-1">Término</label>
                                                <input
                                                    type="time"
                                                    className="w-full border-2 border-slate-50 rounded-2xl px-5 py-4 text-slate-700 focus:border-[#ee4d2d] outline-none bg-slate-50 font-bold"
                                                    value={config.endTime || '23:59'}
                                                    onChange={e => setConfig({ ...config, endTime: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-300 mt-2 italic">* O robô ficará em espera fora deste horário.</p>
                                    </div>
                                </div>
                            </ConfigSection>

                            {/* BUSCA */}
                            <ConfigSection icon={<List size={18} />} title="Palavras-Chave de Busca">
                                <p className="text-xs text-slate-400 mb-3">O robô vai escolher aleatoriamente um termo da sua lista a cada ciclo.</p>
                                <textarea
                                    className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-700 focus:border-[#ee4d2d] outline-none transition min-h-[120px] bg-slate-50 font-medium"
                                    value={config.keywords || ''}
                                    onChange={e => setConfig({ ...config, keywords: e.target.value })}
                                    placeholder="Ex: iphone, monitor, teclado mecânico, fralda pampers"
                                />
                                <p className="text-[10px] uppercase font-bold text-slate-300 mt-2">Separe as palavras por vírgula</p>
                            </ConfigSection>

                            {/* PERSONALIZAÇÃO DE MENSAGEM */}
                            <ConfigSection icon={<MessageSquare size={18} />} title="Modelo de Mensagem">
                                <div className="flex gap-4 p-1 bg-slate-100 rounded-xl mb-4 w-fit">
                                    <button onClick={() => setConfig({ ...config, messageMode: 'standard' })} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${config.messageMode === 'standard' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Padrão ShopeeBot</button>
                                    <button onClick={() => setConfig({ ...config, messageMode: 'custom' })} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${config.messageMode === 'custom' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Personalizado</button>
                                </div>

                                {config.messageMode === 'custom' && (
                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                        <textarea
                                            className="w-full border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-700 focus:border-[#ee4d2d] outline-none transition min-h-[150px] font-mono text-sm leading-relaxed"
                                            value={config.customTemplate || ''}
                                            onChange={e => setConfig({ ...config, customTemplate: e.target.value })}
                                            placeholder="Ex: 🔥 OFERTA: {produto}... {link}"
                                        />
                                        <div className="flex flex-wrap gap-2">
                                            <TagLabel label="{produto}" />
                                            <TagLabel label="{preco}" />
                                            <TagLabel label="{link}" />
                                        </div>
                                    </div>
                                )}
                            </ConfigSection>

                            {/* DESTINO */}
                            <ConfigSection icon={<Users size={18} />} title="Grupo de Destino">
                                <div className="flex items-center gap-4">
                                    <select
                                        className="flex-1 border-2 border-slate-100 rounded-2xl px-5 py-4 text-slate-700 focus:border-[#ee4d2d] outline-none bg-white font-bold cursor-pointer"
                                        value={config.whatsappGroupId || ''}
                                        onChange={e => setConfig({ ...config, whatsappGroupId: e.target.value })}
                                    >
                                        <option value="">Selecione para onde enviar...</option>
                                        {availableGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name}</option>
                                        ))}
                                    </select>
                                    <button onClick={refreshGroups} className="p-4 rounded-2xl border-2 border-slate-100 hover:bg-slate-50 transition text-slate-400 group disabled:opacity-50" disabled={!isConnected || loadingGroups}>
                                        <RefreshCw size={20} className={loadingGroups ? 'animate-spin text-[#ee4d2d]' : 'group-hover:rotate-180 transition-transform duration-500'} />
                                    </button>
                                </div>
                            </ConfigSection>

                            <button onClick={handleSaveConfig} className="w-full btn-primary py-5 rounded-3xl flex items-center justify-center gap-3 font-black text-lg shadow-2xl shadow-orange-100 hover:scale-[1.01] transition-all">
                                <Save size={24} /> Salvar Toda a Configuração
                            </button>
                        </div>
                    </div>
                )}

                {/* ABA 3: DASHBOARD */}
                {activeTab === 'status' && (
                    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                        <Header title="Painel Operacional" desc="Monitoramento em tempo real do seu bot." />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            <StatCard icon={<ShieldCheck />} label="Status de Conexão" value={isConnected ? "Online" : "Desconectado"} color={isConnected ? "text-green-500" : "text-slate-400"} />
                            <StatCard icon={<Zap />} label="Ofertas Enviadas Hoje" value={`${config.offersToday || 0} / ${config.plan === 'free' ? 20 : config.plan === 'pro' ? 100 : '∞'}`} />
                            <StatCard icon={<Moon />} label="Horário Ativo" value={`${config.startTime || '00:00'} às ${config.endTime || '23:59'}`} />
                        </div>

                        <div className="bg-white border-4 border-slate-50 rounded-[40px] p-16 text-center shadow-sm relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 p-8 text-orange-50 transition-colors ${isConnected ? 'text-orange-100 animate-pulse' : ''}`}><Rocket size={180} strokeWidth={0.5} /></div>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-xl transition-all duration-700 ${isConnected ? 'bg-[#ee4d2d] rotate-[360deg] shadow-orange-200' : 'bg-slate-100 shadow-slate-100'}`}>
                                    <Rocket size={40} className="text-white" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-800">Seu Robô está {isConnected ? 'Voando!' : 'em Repouso'}</h3>
                                <p className="text-slate-400 mt-4 max-w-sm leading-relaxed font-medium">
                                    {isConnected
                                        ? `Ele esta monitorando seus termos e enviará uma nova oferta a cada ${config.searchInterval / 60000} minutos.`
                                        : "O motor do robô precisa ser ligado na aba de Conexão para começar a buscar ofertas."}
                                </p>

                                {isConnected && (
                                    <div className="flex flex-col md:flex-row gap-4 mt-10">
                                        <button
                                            onClick={handleTogglePause}
                                            className={`px-10 py-4 rounded-2xl flex items-center gap-3 font-black shadow-lg uppercase text-xs tracking-widest transition-all ${config.isPaused ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-100' : 'bg-slate-100 hover:bg-slate-200 text-slate-600 shadow-slate-50'}`}
                                        >
                                            {config.isPaused ? <><Play size={18} fill="white" /> Ativar Robô</> : <><Pause size={18} fill="currentColor" /> Pausar Robô</>}
                                        </button>

                                        {!config.isPaused && (
                                            <button onClick={handleTriggerCycle} className="btn-primary px-10 py-4 rounded-2xl flex items-center gap-3 font-black shadow-lg shadow-orange-100 uppercase text-xs tracking-widest">
                                                <Zap size={18} fill="white" /> Forçar Busca Agora
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* INDICADOR DE STATUS EXTRA */}
                        <div className="mt-6 flex justify-center">
                            <div className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${config.isPaused ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                                <div className={`w-2 h-2 rounded-full ${config.isPaused ? 'bg-amber-400 animate-pulse' : 'bg-green-500 animate-ping'}`}></div>
                                {config.isPaused ? 'Robô em Pausa - Não enviará nada' : 'Modo Automático Ativo'}
                            </div>
                        </div>
                    </div>
                )}

                {/* ABA 4: PLANOS & ASSINATURA */}
                {activeTab === 'plans' && (
                    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                        <div className="text-center mb-12">
                            <Header title="Gestão de Assinatura" desc="Acompanhe seu status e potencialize suas vendas." center />
                        </div>

                        {/* INFO DO PLANO ATUAL */}
                        <div className="bg-white border-2 border-slate-100 rounded-[32px] p-10 mb-12 shadow-sm flex flex-col md:flex-row items-center gap-10">
                            <div className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center text-[#ee4d2d]">
                                <Crown size={40} />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                                    Seu Plano: <span className="text-[#ee4d2d]">{config.plan === 'free' ? 'Plano Start (Trial)' : config.plan === 'pro' ? 'Plano Pro' : 'Plano Max'}</span>
                                </h3>
                                <p className="text-slate-500 mt-1 font-medium italic">
                                    {config.plan === 'free' ? `Seu período de teste termina em: ${new Date(config.trialEndDate).toLocaleDateString('pt-BR')}` : 'Sua assinatura está ativa e renova automaticamente.'}
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="px-6 py-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <p className="text-[10px] font-black uppercase text-slate-400">Ofertas Restantes Hoje</p>
                                    <p className="text-lg font-black text-slate-700">{config.plan === 'free' ? 20 - (config.offersToday || 0) : config.plan === 'pro' ? 100 - (config.offersToday || 0) : 'Ilimitadas'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mb-10">
                            <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Mudar de Plano</h4>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <PricingCard
                                name="Plano Start"
                                price="R$ 49,90"
                                period="/mês"
                                features={[
                                    "🔥 7 Dias Grátis para Testar",
                                    "1 Grupo de WhatsApp",
                                    "20 Ofertas por dia",
                                    "Busca por Keywords",
                                    "Template Padrão"
                                ]}
                                onSelect={() => handleUpgradePlan('Plano Start')}
                                current={config.plan === 'free'}
                            />
                            <PricingCard
                                name="Plano Pro"
                                price="R$ 97,00"
                                period="/mês"
                                popular
                                features={[
                                    "3 Grupos do WhatsApp",
                                    "100 Ofertas por dia",
                                    "Template Personalizado",
                                    "Frequência de 1 Minuto",
                                    "Suporte VIP"
                                ]}
                                onSelect={() => handleUpgradePlan('Plano Pro')}
                                current={config.plan === 'pro'}
                            />
                            <PricingCard
                                name="Plano Max"
                                price="R$ 197,00"
                                period="/mês"
                                features={[
                                    "Grupos Ilimitados",
                                    "Ofertas Ilimitadas",
                                    "Frequência em Segundos",
                                    "Dashboard de Vendas",
                                    "Full Personalização"
                                ]}
                                onSelect={() => handleUpgradePlan('Plano Max')}
                                current={config.plan === 'enterprise'}
                            />
                        </div>
                    </div>
                )}

                {/* ABA 5: ADMIN (NOVO) */}
                {activeTab === 'admin' && user.isAdmin && (
                    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                        <Header title="Painel do Fundador" desc="Visão geral do crescimento da plataforma ShopeeFlow." />

                        {adminStats && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                <StatCard icon={<Users />} label="Usuários Totais" value={adminStats.totalUsers} />
                                <StatCard icon={<Activity />} label="Bots Ativos" value={adminStats.activeUsers} color="text-green-500" />
                                <StatCard icon={<Zap />} label="Ofertas Totais (Hoje)" value={adminStats.totalOffers || 0} color="text-orange-500" />
                            </div>
                        )}

                        <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                                <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase text-xs tracking-widest">
                                    <List size={18} /> Gestão de Clientes
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            <th className="px-8 py-5">E-mail</th>
                                            <th className="px-8 py-5">Plano</th>
                                            <th className="px-8 py-5">Uso Hoje</th>
                                            <th className="px-8 py-5">Status</th>
                                            <th className="px-8 py-5">Cadastro</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {adminUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-8 py-5 font-bold text-slate-700 text-sm">{u.email}</td>
                                                <td className="px-8 py-5 uppercase text-[10px] font-black">
                                                    <span className={`px-2 py-1 rounded ${u.plan === 'enterprise' ? 'bg-purple-100 text-purple-600' : u.plan === 'pro' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                                                        {u.plan}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-sm font-medium text-slate-500">{u.offersToday} ofertas</td>
                                                <td className="px-8 py-5">
                                                    <span className={`w-2 h-2 rounded-full inline-block mr-2 ${u.isPaused ? 'bg-amber-400' : 'bg-green-500'}`}></span>
                                                    <span className="text-xs font-bold text-slate-400 uppercase">{u.isPaused ? 'Pausado' : 'Ativo'}</span>
                                                </td>
                                                <td className="px-8 py-5 text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}

// --- SUB-COMPONENTES UI (CLEAN CODE) ---

const SidebarItem = ({ active, onClick, icon, label, badge, highlight }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl mb-2 transition-all duration-300 ${active
            ? 'bg-[#ee4d2d] text-white shadow-lg shadow-orange-100 font-bold scale-[1.02]'
            : `text-slate-500 hover:bg-slate-50 font-semibold ${highlight ? 'text-orange-500' : ''}`
            }`}
    >
        <div className="flex items-center gap-4">{icon}<span className="text-sm">{label}</span></div>
        {badge && <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
)

const Header = ({ title, desc, center }) => (
    <div className={`mb-12 ${center ? 'text-center' : ''}`}>
        <h2 className="text-4xl font-black text-slate-800 tracking-tight">{title}</h2>
        <p className="text-slate-400 text-lg mt-2 font-medium">{desc}</p>
    </div>
)

const ConfigSection = ({ icon, title, children }) => (
    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3 mb-6">
            <span className="p-2 bg-slate-50 rounded-lg text-slate-400">{icon}</span> {title}
        </h3>
        {children}
    </div>
)

const FormInput = ({ label, type = "text", value, onChange, placeholder }) => (
    <div className="flex-1">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">{label}</label>
        <input
            type={type}
            className="w-full border-2 border-slate-50 rounded-2xl px-5 py-4 text-slate-700 focus:border-[#ee4d2d] focus:bg-white outline-none transition bg-slate-50 font-bold"
            placeholder={placeholder}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
        />
    </div>
)

const TagLabel = ({ label }) => (
    <span className="px-3 py-1.5 bg-orange-50 text-[#ee4d2d] rounded-lg text-[11px] font-bold border border-orange-100">{label}</span>
)

const StatCard = ({ icon, label, value, color = "text-slate-800" }) => (
    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-6 hover:shadow-md transition-shadow">
        <div className="p-5 bg-slate-50 rounded-2xl text-slate-400">{icon}</div>
        <div>
            <p className="text-xs text-slate-400 uppercase font-black tracking-widest mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
        </div>
    </div>
)

const Step = ({ number, title, desc }) => (
    <div className="flex gap-4 p-6 rounded-[24px] bg-white border border-slate-100 hover:border-orange-200 transition-all group">
        <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 font-black text-xl flex items-center justify-center shrink-0 group-hover:bg-[#ee4d2d] group-hover:text-white transition-all duration-300">
            {number}
        </div>
        <div>
            <h4 className="font-bold text-slate-800 text-lg group-hover:text-[#ee4d2d] transition-colors">{title}</h4>
            <p className="text-slate-400 font-medium text-sm leading-relaxed">{desc}</p>
        </div>
    </div>
)

const StatCard = ({ icon, label, value, color }) => (
    <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 bg-slate-50 rounded-2xl ${color || 'text-slate-400'}`}>
                {icon}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
        </div>
        <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
)

const PricingCard = ({ name, price, period, features, popular, current, onSelect }) => (
    <div className={`bg-white border-2 rounded-[40px] p-10 flex flex-col relative transition-all duration-500 overflow-hidden ${popular ? 'border-[#ee4d2d] shadow-2xl shadow-orange-100 scale-105 z-10' : 'border-slate-100 hover:border-slate-200'}`}>
        {popular && <div className="absolute top-0 right-0 bg-[#ee4d2d] text-white px-5 py-2 text-[10px] font-black uppercase rounded-bl-3xl tracking-widest">Mais Popular</div>}

        <h3 className="text-xl font-black text-slate-800 mb-2">{name}</h3>
        <div className="flex items-baseline gap-1 mb-8">
            <span className="text-4xl font-black text-slate-900">{price}</span>
            <span className="text-slate-400 font-bold">{period}</span>
        </div>

        <ul className="space-y-4 mb-10 flex-1">
            {features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-semibold text-slate-600">
                    <div className="p-1 bg-green-50 text-green-500 rounded-md"><Check size={12} strokeWidth={4} /></div> {f}
                </li>
            ))}
        </ul>

        {current ? (
            <div className="w-full py-4 rounded-2xl bg-slate-100 text-slate-400 font-black uppercase text-xs tracking-widest text-center">Plano Atual</div>
        ) : (
            <button onClick={onSelect} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${popular ? 'bg-[#ee4d2d] text-white shadow-lg shadow-orange-200 hover:scale-[1.03]' : 'bg-slate-800 text-white hover:bg-slate-900'}`}>
                Assinar Agora
            </button>
        )}
    </div>
)
