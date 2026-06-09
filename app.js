/**
 * TP04 - Algoritmos e Estruturas de Dados III
 * Ponto de entrada principal da aplicação.
 * Responsável por gerenciar a UI (tabs, formulários base) até que as funcionalidades CRUD sejam implementadas.
 */

class App {
    constructor() {
        this.initializeUI();
    }

    initializeUI() {
        // Tab Navigation
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Prevenir envio real do formulário (enquanto não implementamos o CRUD)
        const formCurso = document.getElementById('form-curso');
        if (formCurso) {
            formCurso.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Formulário submetido - Funcionalidade CRUD pendente');
            });
        }

        const formBusca = document.getElementById('form-busca');
        if (formBusca) {
            formBusca.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('Busca submetida - Funcionalidade READ pendente (Issue #4)');
            });
        }
        
        // Setup initial UI states
        this.updateStatsDisplay();
    }

    switchTab(tabId) {
        // Atualizar botões
        document.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Atualizar conteúdo
        document.querySelectorAll('.tab-content').forEach(content => {
            if (content.id === `tab-${tabId}`) {
                content.classList.add('active');
            } else {
                content.classList.remove('active');
            }
        });
    }

    // Método temporário para inicializar estatísticas
    updateStatsDisplay() {
        // Isso será conectado ao FileSimulator na Issue #2
        const statSize = document.getElementById('stat-size');
        const statRecords = document.getElementById('stat-records');
        
        if (statSize) statSize.textContent = `Tamanho: 0 bytes`;
        if (statRecords) statRecords.textContent = `Registros: 0`;
    }
}

// Inicializar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('App inicializado - Estrutura base carregada.');
});
