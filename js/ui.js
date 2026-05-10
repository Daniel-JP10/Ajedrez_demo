/**
 * Chess Master Pro - Interfaz de Usuario (Optimizado)
 */

class ChessUI {
    constructor() {
        this.soundEnabled = true;
        this.boardFlipped = false;
        this.selectedDifficulty = null;
        this.selectedTime = CONFIG.GAME.DEFAULT_TIME;
        this.selectedColor = 'w';
    }

    init() {
        this.setupEventListeners();
        this.loadPreferences();
        this.showScreen('setup');
    }

    setupEventListeners() {
        document.querySelectorAll('.difficulty-card').forEach(card => {
            card.addEventListener('click', () => this.selectDifficulty(card));
        });
        
        document.querySelectorAll('.time-option').forEach(opt => {
            opt.addEventListener('click', () => this.selectTime(opt));
        });
        
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.addEventListener('click', () => this.selectColor(opt));
        });
        
        document.getElementById('startGameBtn').addEventListener('click', () => this.startGame());
        document.getElementById('tutorialBtn').addEventListener('click', () => this.toggleTutorial());
        document.querySelector('.modal-close').addEventListener('click', () => this.toggleTutorial());
        
        document.getElementById('undoBtn').addEventListener('click', () => Game.undo());
        document.getElementById('flipBtn').addEventListener('click', () => this.flipBoard());
        document.getElementById('soundBtn').addEventListener('click', () => this.toggleSound());
        document.getElementById('drawBtn').addEventListener('click', () => this.offerDraw());
        document.getElementById('hintBtn').addEventListener('click', () => this.showHint());
        document.getElementById('resignBtn').addEventListener('click', () => this.confirmResign());
        
        document.getElementById('playAgainBtn').addEventListener('click', () => this.playAgain());
        document.getElementById('confirmCancel').addEventListener('click', () => this.hideConfirm());

        // DRAG AND DROP
        const board = document.getElementById('chessBoard');
        board.addEventListener('pointerdown', (e) => this.handleDragStart(e));
        document.addEventListener('pointermove', (e) => this.handleDragMove(e));
        document.addEventListener('pointerup', (e) => this.handleDragEnd(e));
        
        this.dragState = null;
    }

    handleDragStart(e) {
        if (!Game.gameActive || AI.isThinking) return;

        const pieceEl = e.target.closest('.piece');
        if (!pieceEl) return;

        const squareEl = pieceEl.closest('.square');
        if (!squareEl) return;

        const squareId = squareEl.dataset.square;
        const piece = Game.game.get(squareId);

        if (!piece || piece.color !== Game.playerColor) return;

        // Si ya está seleccionado, permitir click normal
        if (Game.selectedSquare === squareId && e.pointerType === 'mouse') {
            // El click nativo se encargará de deseleccionar
        }

        e.preventDefault();

        const rect = pieceEl.getBoundingClientRect();
        
        this.dragState = {
            element: pieceEl,
            sourceSquare: squareId,
            startX: e.clientX,
            startY: e.clientY,
            offsetX: e.clientX - rect.left,
            offsetY: e.clientY - rect.top,
            width: rect.width,
            height: rect.height
        };

        pieceEl.style.width = `${this.dragState.width}px`;
        pieceEl.style.height = `${this.dragState.height}px`;
        pieceEl.classList.add('dragging');
        document.body.classList.add('is-dragging');

        // Mostrar movimientos legales sin resetear todo el DOM
        if (Game.selectedSquare !== squareId) {
            Game.selectedSquare = squareId;
            Game.legalMoves = Game.game.moves({ square: squareId, verbose: true });
            
            document.querySelectorAll('.square').forEach(sq => {
                sq.classList.remove('selected', 'legal-move', 'capture');
            });
            squareEl.classList.add('selected');
            Game.showLegalMoves();
        }

        this.movePieceElement(e.clientX, e.clientY);
    }

    handleDragMove(e) {
        if (!this.dragState) return;
        e.preventDefault();
        this.movePieceElement(e.clientX, e.clientY);
    }

    movePieceElement(clientX, clientY) {
        requestAnimationFrame(() => {
            if (!this.dragState) return;
            const el = this.dragState.element;
            el.style.left = `${clientX - this.dragState.offsetX}px`;
            el.style.top = `${clientY - this.dragState.offsetY}px`;
        });
    }

    async handleDragEnd(e) {
        if (!this.dragState) return;

        const { element, sourceSquare, startX, startY } = this.dragState;
        this.dragState = null;

        element.classList.remove('dragging');
        document.body.classList.remove('is-dragging');
        element.style.left = '';
        element.style.top = '';
        element.style.width = '';
        element.style.height = '';

        const dragDist = Math.hypot(e.clientX - startX, e.clientY - startY);
        
        // Si el arrastre es minúsculo, lo tratamos como un click normal
        if (dragDist < 5) {
            return;
        }

        const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
        const squareEl = dropTarget ? dropTarget.closest('.square') : null;
        
        if (squareEl) {
            const targetSquare = squareEl.dataset.square;
            if (sourceSquare !== targetSquare) {
                // Verificar si es legal
                const isLegal = Game.legalMoves.some(m => m.to === targetSquare);
                if (isLegal) {
                    await Game.handleMove(sourceSquare, targetSquare);
                    return;
                }
            }
        }
        
        // Si cae fuera o es ilegal, vuelve a su posición
        Game.updateBoard();
    }

    animateMove(fromSq, toSq) {
        return new Promise(resolve => {
            if (!fromSq || !toSq) return resolve();
            
            const board = document.getElementById('chessBoard');
            const fromEl = board.querySelector(`[data-square="${fromSq}"] .piece`);
            const toEl = board.querySelector(`[data-square="${toSq}"]`);
            
            if (!fromEl || !toEl) {
                resolve();
                return;
            }
            
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();
            
            const deltaX = toRect.left - fromRect.left;
            const deltaY = toRect.top - fromRect.top;
            
            // Apply translation immediately
            fromEl.style.transition = 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)';
            fromEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            fromEl.style.zIndex = '100';
            
            const cleanup = () => {
                fromEl.style.transition = '';
                fromEl.style.transform = '';
                fromEl.style.zIndex = '';
                resolve();
            };
            
            fromEl.addEventListener('transitionend', cleanup, { once: true });
            
            // Fallback just in case
            setTimeout(cleanup, 250);
        });
    }

    selectDifficulty(card) {
        document.querySelectorAll('.difficulty-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedDifficulty = card.dataset.level;
        this.checkReady();
    }

    selectTime(opt) {
        document.querySelectorAll('.time-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        this.selectedTime = parseInt(opt.dataset.time);
        this.checkReady();
    }

    selectColor(opt) {
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        
        const color = opt.dataset.color;
        if (color === 'random') {
            this.selectedColor = Math.random() < 0.5 ? 'w' : 'b';
        } else {
            this.selectedColor = color === 'white' ? 'w' : 'b';
        }
        this.checkReady();
    }

    checkReady() {
        const btn = document.getElementById('startGameBtn');
        btn.disabled = !this.selectedDifficulty;
    }

    startGame() {
        if (!this.selectedDifficulty) return;
        
        AI.difficulty = this.selectedDifficulty;
        
        this.showScreen('game');
        Game.init(this.selectedColor, this.selectedTime);
        this.updateAPIStatus(true);
        
        const levelNames = {
            beginner: 'Principiante',
            intermediate: 'Intermedio',
            advanced: 'Avanzado'
        };
        document.getElementById('aiLevelDisplay').textContent = levelNames[this.selectedDifficulty];
        
        if (this.selectedColor === 'b' && !this.boardFlipped) {
            this.flipBoard();
        }
    }

    toggleTutorial() {
        const modal = document.getElementById('tutorialModal');
        modal.classList.toggle('hidden');
    }

    flipBoard() {
        this.boardFlipped = !this.boardFlipped;
        document.getElementById('chessBoard').classList.toggle('board-flipped');
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        Sound.setEnabled(this.soundEnabled);
        document.getElementById('soundBtn').textContent = this.soundEnabled ? '🔊' : '🔇';
    }

    offerDraw() {
        if (!Game.gameActive) return;
        
        const acceptProb = this.selectedDifficulty === 'beginner' ? 0.7 : 
                          this.selectedDifficulty === 'intermediate' ? 0.4 : 0.2;
        
        if (Math.random() < acceptProb) {
            Game.endGame('draw');
        } else {
            this.showNotification('La IA rechaza las tablas');
        }
    }

    async showHint() {
        if (!Game.gameActive || AI.isThinking) return;
        if (Game.game.turn() !== Game.playerColor) {
            this.showNotification('Espera tu turno');
            return;
        }
        
        this.showNotification('Analizando mejor jugada...');
        
        try {
            const bestMove = await AI.findBestMove(Game.game, 3);
            
            if (bestMove) {
                const from = bestMove.from;
                const to = bestMove.to;
                
                Game.highlightSquare(from, 'selected');
                Game.highlightSquare(to, 'last-move');
                
                this.showNotification(`Pista: ${from} → ${to}`);
                
                setTimeout(() => Game.updateBoard(), 3000);
            } else {
                this.showNotification('No se encontró pista');
            }
        } catch {
            this.showNotification('No se pudo obtener pista');
        }
    }

    confirmResign() {
        if (!Game.gameActive) return;
        this.showConfirm(
            '¿Rendirse?',
            'Esta acción finalizará la partida.',
            () => Game.endGame('resign')
        );
    }

    playAgain() {
        Game.reset();
        this.showScreen('setup');
        
        document.querySelectorAll('.difficulty-card, .time-option, .color-option').forEach(el => {
            el.classList.remove('selected');
        });
        document.getElementById('startGameBtn').disabled = true;
        this.selectedDifficulty = null;
    }

    updateStatus() {
        const statusBar = document.getElementById('statusText');
        let text = '';
        
        if (Game.game.in_checkmate()) {
            text = '¡Jaque Mate!';
        } else if (Game.game.in_draw()) {
            text = 'Tablas';
        } else if (Game.game.in_check()) {
            text = '<span class="status-check">¡Jaque!</span>';
        } else {
            text = Game.game.turn() === Game.playerColor ? 'Tu turno' : 'Turno de la IA';
        }
        
        statusBar.innerHTML = text;
    }

    updateTimer(id, seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        const el = document.getElementById(id);
        el.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (seconds <= CONFIG.GAME.LOW_TIME_THRESHOLD) {
            el.classList.add('low-time');
        } else {
            el.classList.remove('low-time');
        }
    }

    updateMoveHistory() {
        const el = document.getElementById('moveHistory');
        el.innerHTML = '';
        
        for (let i = 0; i < Game.moveHistory.length; i += 2) {
            const num = Math.floor(i / 2) + 1;
            const white = Game.moveHistory[i];
            const black = Game.moveHistory[i + 1];
            
            const row = document.createElement('div');
            row.className = 'move-row';
            row.innerHTML = `
                <span class="move-number">${num}.</span>
                <span class="move-white">${white.san}</span>
                <span class="move-black">${black ? black.san : ''}</span>
            `;
            el.appendChild(row);
        }
        
        el.scrollTop = el.scrollHeight;
    }

    updateCapturedPieces() {
        const el = document.getElementById('capturedPieces');
        el.innerHTML = '';
        
        const playerCaptured = Game.playerColor === 'w' ? Game.capturedPieces.black : Game.capturedPieces.white;
        
        playerCaptured.forEach(piece => {
            const pieceEl = document.createElement('div');
            pieceEl.className = 'captured-piece';
            const color = Game.playerColor === 'w' ? 'b' : 'w';
            const img = document.createElement('img');
            img.src = PIECE_PATHS[color][piece];
            img.alt = color + piece;
            pieceEl.appendChild(img);
            el.appendChild(pieceEl);
        });
    }

    showThinking(show) {
        const el = document.getElementById('thinkingIndicator');
        if (show) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }

    updateAPIStatus(available) {
        const dot = document.getElementById('apiStatusDot');
        const text = document.getElementById('apiStatusText');
        
        if (available) {
            dot.className = 'status-dot';
            text.textContent = 'Motor Local Activo';
        } else {
            dot.className = 'status-dot offline';
            text.textContent = 'Motor No Disponible';
        }
    }

    showPromotionModal(move) {
        const modal = document.getElementById('promotionModal');
        const choices = document.getElementById('promotionChoices');
        choices.innerHTML = '';
        
        ['q', 'r', 'b', 'n'].forEach(type => {
            const pieceEl = document.createElement('div');
            pieceEl.className = 'promotion-piece';
            const img = document.createElement('img');
            img.src = PIECE_PATHS[Game.playerColor][type];
            img.alt = Game.playerColor + type;
            pieceEl.appendChild(img);
            pieceEl.addEventListener('click', () => {
                move.promotion = type;
                modal.classList.add('hidden');
                Game.executeMove(move);
            });
            choices.appendChild(pieceEl);
        });
        
        modal.classList.remove('hidden');
    }

    showNotification(text) {
        const statusBar = document.getElementById('statusText');
        const original = statusBar.innerHTML;
        statusBar.innerHTML = text;
        setTimeout(() => {
            statusBar.innerHTML = original;
        }, 3000);
    }

    showConfirm(title, text, onConfirm) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmText').textContent = text;
        document.getElementById('confirmModal').classList.remove('hidden');
        
        const okBtn = document.getElementById('confirmOk');
        const newOk = okBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        newOk.addEventListener('click', () => {
            this.hideConfirm();
            onConfirm();
        });
    }

    hideConfirm() {
        document.getElementById('confirmModal').classList.add('hidden');
    }

    showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(`${name}Screen`).classList.remove('hidden');
    }

    loadPreferences() {
        try {
            const prefs = localStorage.getItem(CONFIG.STORAGE.KEYS.PREFERENCES);
            if (prefs) {
                const data = JSON.parse(prefs);
                this.soundEnabled = data.soundEnabled !== false;
                document.getElementById('soundBtn').textContent = this.soundEnabled ? '🔊' : '🔇';
            }
        } catch {
            // Ignorar errores de storage
        }
    }

    savePreferences() {
        try {
            localStorage.setItem(CONFIG.STORAGE.KEYS.PREFERENCES, JSON.stringify({
                soundEnabled: this.soundEnabled
            }));
        } catch {
            // Ignorar errores de storage
        }
    }
}

const UI = new ChessUI();

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        UI.init();
    }, 800);
});