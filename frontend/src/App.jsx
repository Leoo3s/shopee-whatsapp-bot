import { useState, Suspense, lazy } from 'react';
import axios from 'axios';
import { LayoutDashboard, Lock, Mail, ArrowRight, Loader2, ShoppingBag, CheckCircle2, Activity } from 'lucide-react';

// URL do Backend
const KOYEB_URL = 'https://innocent-rici-1leo3s-0914f4ce.koyeb.app';
const API_URL = import.meta.env.VITE_API_URL || `${KOYEB_URL}/api`;

// Carregamento Preguiçoso do Dashboard
const Dashboard = lazy(() => import('./pages/Dashboard'));

export default function App() {
    // Inicializa o estado buscando do localStorage para manter a sessão ao atualizar
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('shopee_bot_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [isRegister, setIsRegister] = useState(false);

    const handleLogin = (userData) => {
        localStorage.setItem('shopee_bot_user', JSON.stringify(userData));
        setUser(userData);
    };

    const handleLogout = () => {
        localStorage.removeItem('shopee_bot_user');
        setUser(null);
    };

    // Se logado, mostra Dashboard com Loading State
    if (user) {
        return (
            <Suspense fallback={
                <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-orange-500">
                    <Loader2 size={48} className="animate-spin" />
                    <span className="ml-3 text-xl font-bold">Carregando Painel...</span>
                </div>
            }>
                <Dashboard user={user} onLogout={handleLogout} />
            </Suspense>
        );
    }

    // Se não, mostra Login
    return <LoginScreen onLogin={handleLogin} isRegister={isRegister} setIsRegister={setIsRegister} />;
}

// --- TELA DE LOGIN REFEITA (DESIGN PREMIUM) ---
function LoginScreen({ onLogin, isRegister, setIsRegister }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(''); // Novo estado para aviso no site

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Validação de confirmação de senha
        if (isRegister && password !== confirmPassword) {
            setError('As senhas não coincidem. Tente novamente.');
            setLoading(false);
            return;
        }

        try {
            const endpoint = isRegister ? '/register' : '/login';
            const res = await axios.post(`${API_URL}${endpoint}`, { email, password });

            if (res.data.success) {
                if (isRegister) {
                    setSuccess('🎉 Conta criada com sucesso! Faça login abaixo.');
                    setEmail('');
                    setPassword('');
                    setConfirmPassword('');

                    // Aguarda 5 segundos para o usuário ler e depois volta pro login
                    setTimeout(() => {
                        setSuccess('');
                        setIsRegister(false);
                    }, 5000);
                } else {
                    onLogin({ id: res.data.clientId, email });
                }
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Falha ao conectar ao servidor. Verifique se o Backend está rodando.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">

            {/* Background Decorativo */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-orange-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[10%] right-[5%] w-[30%] h-[30%] bg-blue-600/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="glass-panel w-full max-w-md p-8 rounded-2xl shadow-2xl z-10 relative border-t border-white/10">
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 rounded-xl bg-orange-500 text-white shadow-lg mb-4 transform hover:scale-110 transition-transform">
                        <ShoppingBag size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Shopee<span className="text-orange-500">Flow</span></h1>
                    <p className="text-slate-400 font-light text-sm">
                        {isRegister ? 'Comece a lucrar no piloto automático.' : 'Bem-vindo de volta, afiliado.'}
                    </p>
                </div>

                {success && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 text-sm animate-in fade-in zoom-in-95">
                        <CheckCircle2 size={20} />
                        <span className="font-bold">{success}</span>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-sm animate-in fade-in zoom-in-95">
                        <Activity size={20} />
                        <span className="font-bold">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="relative group">
                        <Mail className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                        <input
                            type="email"
                            required
                            placeholder="Seu E-mail"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 pl-12 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-600"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="relative group">
                        <Lock className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                        <input
                            type="password"
                            required
                            placeholder="Sua Senha Secreta"
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 pl-12 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-600"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    {isRegister && (
                        <div className="relative group animate-in slide-in-from-top-2">
                            <Lock className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={20} />
                            <input
                                type="password"
                                required
                                placeholder="Confirme sua Senha"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 pl-12 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder:text-slate-600"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                            />
                        </div>
                    )}

                    <button
                        disabled={loading}
                        className="w-full btn-primary text-white font-bold p-4 rounded-xl mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (isRegister ? 'Criar Minha Conta Grátis' : 'Acessar Painel')}
                        {!loading && <ArrowRight size={18} />}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                    <p className="text-slate-500 text-sm">
                        {isRegister ? 'Já possui cadastro? ' : 'Novo por aqui? '}
                        <button onClick={() => setIsRegister(!isRegister)} className="text-orange-500 font-semibold hover:text-orange-400 transition ml-1">
                            {isRegister ? 'Fazer Login' : 'Criar Conta'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
