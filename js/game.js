/**
 * Chess Master Pro - Lógica del Juego (Optimizado)
 */

class ChessGame {
    constructor() {
        this.game = null;
        this.board = [];
        this.selectedSquare = null;
        this.legalMoves = [];
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.playerColor = 'w';
        this.gameActive = false;
        this.playerTime = CONFIG.GAME.DEFAULT_TIME;
        this.aiTime = CONFIG.GAME.DEFAULT_TIME;
        this.timerInterval = null;
        this.undoCount = 0;
    }

    init(playerColor, timeControl) {
        this.game = new Chess();
        this.playerColor = playerColor;
        this.playerTime = timeControl;
        this.aiTime = timeControl;
        this.gameActive = true;
        this.moveHistory = [];
        this.capturedPieces = { white: [], black: [] };
        this.selectedSquare = null;
        this.legalMoves = [];
        this.undoCount = 0;
        Analysis.reset();
        
        // Actualizar UI timers iniciales
        UI.updateTimer('playerTimer', this.playerTime);
        UI.updateTimer('aiTimer', this.aiTime);
        
        this.createBoard();
        this.updateBoard();
        this.startTimer();
        
        if (this.playerColor === 'b') {
            setTimeout(() => AI.makeMove(), 500);
        }
    }

    createBoard() {
        const boardEl = document.getElementById('chessBoard');
        boardEl.innerHTML = '';
        this.board = [];
        
        const files = 'abcdefgh'.split('');
        const ranks = '87654321'.split('');
        
        for (let rank = 0; rank < 8; rank++) {
            this.board[rank] = [];
            for (let file = 0; file < 8; file++) {
                const square = files[file] + ranks[rank];
                const isLight = (rank + file) % 2 === 0;
                
                const squareEl = document.createElement('div');
                squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
                squareEl.dataset.square = square;
                squareEl.addEventListener('click', () => this.handleSquareClick(square));
                
                if (file === 0) {
                    const coord = document.createElement('span');
                    coord.className = 'coordinates coord-rank';
                    coord.textContent = ranks[rank];
                    squareEl.appendChild(coord);
                }
                if (rank === 7) {
                    const coord = document.createElement('span');
                    coord.className = 'coordinates coord-file';
                    coord.textContent = files[file];
                    squareEl.appendChild(coord);
                }
                
                boardEl.appendChild(squareEl);
                this.board[rank][file] = { element: squareEl, piece: null };
            }
        }
    }

    updateBoard() {
        // OPTIMIZACIÓN: Usar getElementsByClassName es mucho más rápido que querySelectorAll para eliminar
        const pieces = document.getElementsByClassName('piece');
        while(pieces.length > 0) pieces[0].remove();
        
        // Limpiar highlights de forma eficiente
        const highlights = document.querySelectorAll('.selected, .legal-move, .last-move, .check, .capture');
        highlights.forEach(s => s.classList.remove('selected', 'legal-move', 'last-move', 'check', 'capture'));
        
        const boardState = this.game.board();
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const piece = boardState[rank][file];
                if (piece) {
                    const squareEl = this.board[rank][file].element;
                    const pieceEl = document.createElement('img');
                    pieceEl.className = `piece piece-${piece.color === 'w' ? 'white' : 'black'}`;
                    pieceEl.src = PIECE_PATHS[piece.color][piece.type];
                    pieceEl.alt = `${piece.color}${piece.type}`;
                    pieceEl.draggable = false;
                    squareEl.appendChild(pieceEl);
                }
            }
        }
        
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory[this.moveHistory.length - 1];
            this.highlightSquare(lastMove.from);
            this.highlightSquare(lastMove.to, 'last-move');
        }
        
        if (this.game.in_check()) {
            const kingColor = this.game.turn();
            for (let rank = 0; rank < 8; rank++) {
                for (let file = 0; file < 8; file++) {
                    const piece = boardState[rank][file];
                    if (piece && piece.type === 'k' && piece.color === kingColor) {
                        this.board[rank][file].element.classList.add('check');
                    }
                }
            }
        }
        
        UI.updateMoveHistory();
        UI.updateCapturedPieces();
    }

    highlightSquare(square, type = 'selected') {
        const file = square.charCodeAt(0) - 97;
        const rank = 8 - parseInt(square[1]);
        if (this.board[rank] && this.board[rank][file]) {
            this.board[rank][file].element.classList.add(type);
        }
    }

    async handleSquareClick(square) {
        if (!this.gameActive || AI.isThinking) return;
        if (this.game.turn() !== this.playerColor) return;
        
        const piece = this.game.get(square);
        
        if (this.selectedSquare) {
            const move = this.legalMoves.find(m => m.to === square);
            
            if (move) {
                const movingPiece = this.game.get(this.selectedSquare);
                const isPawn = movingPiece && movingPiece.type === 'p';
                const isPromotionRank = (this.playerColor === 'w' && square[1] === '8') || 
                                        (this.playerColor === 'b' && square[1] === '1');
                
                if (isPawn && isPromotionRank) {
                    UI.showPromotionModal(move);
                } else {
                    await this.executeMove(move, false);
                }
                this.selectedSquare = null;
                this.legalMoves = [];
            } else if (piece && piece.color === this.playerColor) {
                this.selectedSquare = square;
                this.legalMoves = this.game.moves({ square: square, verbose: true });
                this.updateBoard();
                this.showLegalMoves();
            } else {
                this.selectedSquare = null;
                this.legalMoves = [];
                this.updateBoard();
            }
        } else if (piece && piece.color === this.playerColor) {
            this.selectedSquare = square;
            this.legalMoves = this.game.moves({ square: square, verbose: true });
            this.updateBoard();
            this.showLegalMoves();
        }
    }

    async handleMove(source, target, wasDragged = false) {
        if (!this.gameActive || AI.isThinking) return;
        
        this.selectedSquare = source;
        this.legalMoves = this.game.moves({ square: source, verbose: true });
        
        const move = this.legalMoves.find(m => m.to === target);
        if (move) {
            const movingPiece = this.game.get(source);
            const isPawn = movingPiece && movingPiece.type === 'p';
            const isPromotionRank = (this.playerColor === 'w' && target[1] === '8') || 
                                    (this.playerColor === 'b' && target[1] === '1');
            
            if (isPawn && isPromotionRank) {
                UI.showPromotionModal(move);
            } else {
                await this.executeMove(move, wasDragged);
            }
            this.selectedSquare = null;
            this.legalMoves = [];
        }
    }

    showLegalMoves() {
        this.legalMoves.forEach(move => {
            const file = move.to.charCodeAt(0) - 97;
            const rank = 8 - parseInt(move.to[1]);
            const isCapture = move.flags && (move.flags.includes('c') || move.flags.includes('e'));
            this.board[rank][file].element.classList.add(isCapture ? 'legal-move capture' : 'legal-move');
        });
    }

    async executeMove(move, wasDragged = false) {
        // Guardar la evaluación antes de que el tablero cambie (para el Analysis)
        await Analysis.setEvalBeforeMove(this.game);

        if (!wasDragged) {
            await UI.animateMove(move.from, move.to);
        }

        const result = this.game.move(move);
        if (result) {
            // Clasificar movimiento (Ahora asíncrono con Worker)
            await Analysis.evaluatePlayerMove(this.game, result);

            if (result.captured) {
                const capturedColor = result.color === 'w' ? 'black' : 'white';
                this.capturedPieces[capturedColor].push(result.captured);
            }
            
            this.moveHistory.push({
                from: move.from,
                to: move.to,
                san: result.san,
                color: this.playerColor,
                fen: this.game.fen()
            });
            
            Sound.play(result.captured ? 'capture' : 'move');
            this.updateBoard();
            UI.updateStatus();
            
            if (this.game.game_over()) {
                this.endGame();
            } else {
                setTimeout(() => AI.makeMove(), 400);
            }
        }
    }

    async executeAIMove(moveStr) {
        if (!this.gameActive) return;
        
        let move = null;
        
        if (moveStr && moveStr.length >= 4 && moveStr.match(/^[a-h][1-8][a-h][1-8]/)) {
            move = {
                from: moveStr.substring(0, 2),
                to: moveStr.substring(2, 4),
                promotion: moveStr.length > 4 ? moveStr[4] : undefined
            };
        }
        
        if (!move) {
            const legalMoves = this.game.moves({ verbose: true });
            if (legalMoves.length > 0) {
                const random = legalMoves[Math.floor(Math.random() * legalMoves.length)];
                move = { from: random.from, to: random.to, promotion: random.promotion };
            } else {
                this.endGame();
                return;
            }
        }
        
        const result = this.game.move(move);
        if (result) {
            await UI.animateMove(move.from, move.to);
            await Analysis.recordAIEval(this.game);

            if (result.captured) {
                this.capturedPieces[result.color === 'w' ? 'black' : 'white'].push(result.captured);
            }
            
            const aiColor = this.playerColor === 'w' ? 'b' : 'w';
            this.moveHistory.push({
                from: move.from,
                to: move.to,
                san: result.san,
                color: aiColor,
                fen: this.game.fen()
            });
            
            Sound.play(result.captured ? 'capture' : 'move');
            this.updateBoard();
            UI.updateStatus();
            
            if (this.game.in_check()) {
                setTimeout(() => Sound.play('check'), 70);
            }
            
            if (this.game.game_over()) {
                this.endGame();
            }
        }
    }

    undo() {
        if (!this.gameActive || AI.isThinking) return;
        if (this.undoCount >= CONFIG.GAME.UNDO_LIMIT) {
            UI.showNotification('Límite de deshacer alcanzado');
            return;
        }
        
        this.game.undo();
        this.game.undo();
        this.moveHistory.pop();
        this.moveHistory.pop();
        this.undoCount++;
        
        this.updateBoard();
        UI.updateStatus();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            if (!this.gameActive) return;
            
            if (this.game.turn() === this.playerColor) {
                this.playerTime--;
                UI.updateTimer('playerTimer', this.playerTime);
            } else {
                this.aiTime--;
                UI.updateTimer('aiTimer', this.aiTime);
            }
            
            if (this.playerTime <= 0 || this.aiTime <= 0) {
                this.endGame(this.playerTime <= 0 ? 'timeout' : 'ai_timeout');
            }
        }, 1000);
    }

    endGame(reason) {
        this.gameActive = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        let result = '';
        let resultClass = '';
        
        if (reason === 'timeout') {
            result = 'Derrota por tiempo';
            resultClass = 'result-loss';
        } else if (reason === 'ai_timeout') {
            result = 'Victoria por tiempo';
            resultClass = 'result-win';
        } else if (reason === 'resign') {
            result = 'Rendición';
            resultClass = 'result-loss';
        } else if (reason === 'draw') {
            result = 'Tablas';
            resultClass = 'result-draw';
        } else if (this.game.in_checkmate()) {
            if (this.game.turn() === 'w') {
                result = this.playerColor === 'w' ? 'Derrota - Jaque Mate' : '¡Victoria! Jaque Mate';
                resultClass = this.playerColor === 'w' ? 'result-loss' : 'result-win';
            } else {
                result = this.playerColor === 'b' ? 'Derrota - Jaque Mate' : '¡Victoria! Jaque Mate';
                resultClass = this.playerColor === 'b' ? 'result-loss' : 'result-win';
            }
        } else if (this.game.in_stalemate()) {
            result = 'Tablas por ahogado';
            resultClass = 'result-draw';
        } else if (this.game.in_threefold_repetition()) {
            result = 'Tablas por repetición';
            resultClass = 'result-draw';
        } else if (this.game.insufficient_material()) {
            result = 'Tablas por material insuficiente';
            resultClass = 'result-draw';
        }
        
        Sound.play('gameEnd');
        Analysis.show(result, resultClass);
    }

    reset() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.gameActive = false;
        this.game = null;
    }
}

const Game = new ChessGame();