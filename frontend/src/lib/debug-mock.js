
// Versão Mockada do Debug para Browser para evitar erro no Vite
export default function debug(namespace) {
    // Retorna uma função vazia (noop) em produção, ou console.log se quiser debugar
    return (...args) => {
        // console.log(`[${namespace}]`, ...args); 
    };
}
