/**
 * TP04 - Algoritmos e Estruturas de Dados III
 * Ponto de entrada principal da aplicação.
 * Responsável por gerenciar a UI (tabs, formulários base) até que as funcionalidades CRUD sejam implementadas.
 */

import { FileSimulator } from './FileSimulator.js';

class App {
    constructor() {
        this.fileSimulator = new FileSimulator();
        this.initializeUI();
    }

    initializeUI() {
        // Tab Navigation
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Prevenir envio real do formulário e acionar inserção
        const formCurso = document.getElementById('form-curso');
        if (formCurso) {
            formCurso.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Coleta os dados
                const nome = document.getElementById('nome').value;
                const instrutor = document.getElementById('instrutor').value;
                const vagas = parseInt(document.getElementById('vagas').value, 10);
                const valor = parseFloat(document.getElementById('valor').value);
                
                // Insere no arquivo
                const newId = this.fileSimulator.insertRecord(nome, valor, vagas, instrutor);
                
                // Feedback visual (poderia usar um toast real, mas console log + updateUI basta)
                console.log(`Registro salvo com ID: ${newId}`);
                
                // Reseta form e foca no primeiro campo
                formCurso.reset();
                document.getElementById('nome').focus();
                
                // Atualiza UI
                this.updateStatsDisplay();
                this.renderBytes();
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
        this.renderBytes();
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

    // Método para inicializar estatísticas
    updateStatsDisplay() {
        const statSize = document.querySelector('.stat-pill .stat-value');
        const statRecords = document.querySelectorAll('.stat-pill .stat-value')[1];
        
        if (statSize) statSize.textContent = `${this.fileSimulator.getSize()} B`;
        if (statRecords) statRecords.textContent = `${this.fileSimulator.getHeader().lastId}`; // Simplificação: assume que ID = número de registros inseridos, mas o ideal seria varrer e contar.
    }

    renderBytes() {
        const grid = document.getElementById('bytes-grid');
        if (!grid) return;
        
        const byteMap = this.fileSimulator.getByteMap();
        
        // Se vazio, mantemos o empty-state? Não, porque temos o cabeçalho.
        grid.innerHTML = '';
        
        byteMap.forEach(b => {
            const hex = b.value.toString(16).padStart(2, '0').toUpperCase();
            
            const byteDiv = document.createElement('div');
            byteDiv.className = `byte-cell ${b.type}`;
            byteDiv.textContent = hex;
            byteDiv.title = `Offset: ${b.index} | Tipo: ${b.label} | Valor: ${b.value}`;
            
            byteDiv.addEventListener('mouseenter', () => {
                document.getElementById('inspector-content').textContent = 
                    `Offset: ${b.index} | Hex: 0x${hex} | Dec: ${b.value} | Char: ${b.value >= 32 && b.value <= 126 ? String.fromCharCode(b.value) : '.'} | Bloco: ${b.label}`;
            });
            byteDiv.addEventListener('mouseleave', () => {
                document.getElementById('inspector-content').textContent = 'Aguardando interação...';
            });
            
            grid.appendChild(byteDiv);
        });
    }
}

// Inicializar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('App inicializado - Estrutura base carregada.');
});
