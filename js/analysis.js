/**
 * Chess Master Pro - Sistema de Análisis (OPTIMIZADO - Sin bloqueo de UI)
 */

class ChessAnalysis {
    constructor() {
        this.moveClassifications = {
            excellent: 0,
            good: 0,
            inaccuracy: 0,
            mistake: 0,
            blunder: 0
        };
        this.evaluationHistory = [];
        this.moveDetails = [];
        this.historyFens = [];
        this.currentViewIndex = 0;
        this.evalBeforePlayerMove = 0; // Guardar la eval antes de que el jugador mueva
        
        // Setup UI controls once
        setTimeout(() => this.setupControls(), 100);
    }

    setupControls() {
        document.getElementById('btnPrevMove').addEventListener('click', () => {
            if (this.currentViewIndex > 0) {
                this.currentViewIndex--;
                this.renderBoardState(this.historyFens[this.currentViewIndex]);
                this.updateControls();
            }
        });
        document.getElementById('btnNextMove').addEventListener('click', () => {
            if (this.currentViewIndex < this.historyFens.length - 1) {
                this.currentViewIndex++;
                this.renderBoardState(this.historyFens[this.currentViewIndex]);
                this.updateControls();
            }
        });
    }

    /**
     * Registra la evaluación ANTES del movimiento del jugador
     * Se debe llamar justo antes de que el jugador haga su move
     */
    async setEvalBeforeMove(game) {
        this.evalBeforePlayerMove = await AI.evaluateAsync(game);
    }

    /**
     * Evalúa y clasifica el movimiento del jugador de forma INSTANTÁNEA
     * Ya NO usa findBestMove durante la partida, evitando congelar la UI
     */
    async evaluatePlayerMove(game, movePlayed) {
        try {
            // La evaluación después del movimiento del jugador
            const evalAfter = await AI.evaluateAsync(game);

            // Calcular la pérdida real desde la perspectiva del jugador
            const isPlayerWhite = Game.playerColor === 'w';
            const evalBeforePerspective = isPlayerWhite ? this.evalBeforePlayerMove : -this.evalBeforePlayerMove;
            const evalAfterPerspective = isPlayerWhite ? evalAfter : -evalAfter;
            
            const cpLoss = Math.max(0, evalBeforePerspective - evalAfterPerspective);

            // Guardar evaluación normalizada para el gráfico
            const normalizedEval = Math.max(-100, Math.min(100, evalAfter / 10));
            this.evaluationHistory.push(normalizedEval);

            // Clasificar el movimiento basado en la caída de evaluación (cpLoss)
            let classification;
            if (cpLoss <= 10) {
                classification = 'excellent';
            } else if (cpLoss <= 50) {
                classification = 'good';
            } else if (cpLoss <= 100) {
                classification = 'inaccuracy';
            } else if (cpLoss <= 200) {
                classification = 'mistake';
            } else {
                classification = 'blunder';
            }

            this.moveClassifications[classification]++;

            this.moveDetails.push({
                san: movePlayed.san || `${movePlayed.from}-${movePlayed.to}`,
                cpLoss: Math.round(cpLoss),
                classification,
                evalAfter: Math.round(evalAfter)
            });

        } catch (error) {
            console.warn('Error al evaluar movimiento:', error);
            this.moveClassifications.good++;
            const evalNow = await AI.evaluateAsync(game);
            this.evaluationHistory.push(Math.max(-100, Math.min(100, evalNow / 10)));
        }
    }

    /**
     * Registra la evaluación después del movimiento de la IA (para el gráfico)
     */
    async recordAIEval(game) {
        try {
            const eval_ = await AI.evaluateAsync(game);
            const normalized = Math.max(-100, Math.min(100, eval_ / 10));
            this.evaluationHistory.push(normalized);
            // Actualizar la eval antes del próximo movimiento del jugador
            this.evalBeforePlayerMove = eval_;
        } catch {
            this.evaluationHistory.push(0);
        }
    }

    /**
     * Calcula la precisión general del jugador (0-100%)
     */
    calculateAccuracy() {
        const c = this.moveClassifications;
        const total = c.excellent + c.good + c.inaccuracy + c.mistake + c.blunder;

        if (total === 0) return 50;

        const weights = { excellent: 100, good: 80, inaccuracy: 55, mistake: 25, blunder: 0 };

        const weighted =
            c.excellent * weights.excellent +
            c.good * weights.good +
            c.inaccuracy * weights.inaccuracy +
            c.mistake * weights.mistake +
            c.blunder * weights.blunder;

        return Math.round(weighted / total);
    }

    /**
     * Calcula ELO estimado basado en la precisión, dificultad y cantidad de movimientos
     */
    estimateELO(accuracy, resultClass) {
        const c = this.moveClassifications;
        const totalMoves = c.excellent + c.good + c.inaccuracy + c.mistake + c.blunder;
        
        // Con menos de 5 movimientos, la precisión no es representativa
        // Aplicamos un factor de confianza que escala de 0.3 (1 mov) a 1.0 (15+ movs)
        const confidenceFactor = Math.min(1.0, 0.3 + (totalMoves / 20));
        
        let baseElo;
        if (accuracy >= 95) baseElo = 1800 + (accuracy - 95) * 40;
        else if (accuracy >= 90) baseElo = 1500 + (accuracy - 90) * 60;
        else if (accuracy >= 80) baseElo = 1200 + (accuracy - 80) * 30;
        else if (accuracy >= 70) baseElo = 1000 + (accuracy - 70) * 20;
        else if (accuracy >= 50) baseElo = 700 + (accuracy - 50) * 15;
        else baseElo = 400 + accuracy * 6;

        // Aplicar factor de confianza: pocas jugadas = ELO más conservador
        let elo = Math.round(baseElo * confidenceFactor + 400 * (1 - confidenceFactor));

        const difficultyBonus = { beginner: -50, intermediate: 50, advanced: 200 };
        elo += difficultyBonus[AI.difficulty] || 0;

        if (resultClass === 'result-win') elo += 50;
        if (resultClass === 'result-loss') elo -= 100;

        return Math.max(200, Math.min(3000, Math.round(elo)));
    }

    /**
     * Muestra pantalla de análisis
     */
    show(result, resultClass) {
        const accuracy = this.calculateAccuracy();
        const elo = this.estimateELO(accuracy, resultClass);

        const resultEl = document.getElementById('gameResult');
        resultEl.textContent = result;
        resultEl.className = `game-result ${resultClass}`;

        const playerAccEl = document.getElementById('playerAccuracy');
        playerAccEl.textContent = accuracy + '%';
        playerAccEl.className = 'accuracy-value ' + this.getAccuracyClass(accuracy);

        document.getElementById('playerPerformance').textContent = `Rendimiento: ~${elo} ELO`;

        let aiAcc;
        switch (AI.difficulty) {
            case 'beginner': aiAcc = 55 + Math.floor(Math.random() * 10); break;
            case 'intermediate': aiAcc = 72 + Math.floor(Math.random() * 8); break;
            case 'advanced': aiAcc = 88 + Math.floor(Math.random() * 7); break;
            default: aiAcc = 70;
        }
        document.getElementById('aiAccuracy').textContent = aiAcc + '%';

        document.getElementById('excellentCount').textContent = this.moveClassifications.excellent;
        document.getElementById('goodCount').textContent = this.moveClassifications.good;
        document.getElementById('inaccuracyCount').textContent = this.moveClassifications.inaccuracy;
        document.getElementById('mistakeCount').textContent = this.moveClassifications.mistake;
        document.getElementById('blunderCount').textContent = this.moveClassifications.blunder;

        // Interactive Board Init
        const tempChess = new Chess();
        this.historyFens = [tempChess.fen(), ...Game.moveHistory.map(m => m.fen)];
        this.currentViewIndex = this.historyFens.length - 1;
        this.renderBoardState(this.historyFens[this.currentViewIndex]);
        this.updateControls();

        this.showKeyMoments();
        this.saveStats(accuracy, elo, resultClass);

        UI.showScreen('analysis');
    }

    renderBoardState(fen) {
        const boardEl = document.getElementById('analysisBoard');
        boardEl.innerHTML = '';
        const tempGame = new Chess(fen);
        const boardState = tempGame.board();
        
        for (let rank = 0; rank < 8; rank++) {
            for (let file = 0; file < 8; file++) {
                const isLight = (rank + file) % 2 === 0;
                const squareEl = document.createElement('div');
                squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
                
                const piece = boardState[rank][file];
                if (piece) {
                    const pieceEl = document.createElement('img');
                    pieceEl.className = `piece piece-${piece.color === 'w' ? 'white' : 'black'}`;
                    pieceEl.src = PIECE_PATHS[piece.color][piece.type];
                    squareEl.appendChild(pieceEl);
                }
                boardEl.appendChild(squareEl);
            }
        }
    }

    updateControls() {
        document.getElementById('btnPrevMove').disabled = this.currentViewIndex === 0;
        document.getElementById('btnNextMove').disabled = this.currentViewIndex === this.historyFens.length - 1;
        
        if (this.currentViewIndex === 0) {
            document.getElementById('analysisMoveText').textContent = 'Inicio';
        } else {
            const moveIndex = Math.floor((this.currentViewIndex - 1) / 2) + 1;
            const isWhite = this.currentViewIndex % 2 !== 0;
            const colorName = isWhite ? 'Blancas' : 'Negras';
            document.getElementById('analysisMoveText').textContent = `Mov ${moveIndex} (${colorName})`;
        }
        
        this.drawEvalGraph();
    }

    getAccuracyClass(accuracy) {
        if (accuracy >= 90) return 'accuracy-excellent';
        if (accuracy >= 75) return 'accuracy-good';
        if (accuracy >= 50) return 'accuracy-average';
        return 'accuracy-poor';
    }

    drawEvalGraph() {
        const canvas = document.getElementById('evalGraph');
        const ctx = canvas.getContext('2d');
        const rect = canvas.parentElement.getBoundingClientRect();

        canvas.width = rect.width;
        canvas.height = Math.max(rect.height, 150);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (this.evaluationHistory.length < 2) {
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Sin datos suficientes para gráfico', canvas.width / 2, canvas.height / 2);
            return;
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        const stepX = canvas.width / (this.evaluationHistory.length - 1);
        const centerY = canvas.height / 2;

        this.evaluationHistory.forEach((score, i) => {
            const x = i * stepX;
            const y = centerY - (score / 100) * (canvas.height / 2 - 10);

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();

        ctx.lineTo(canvas.width, centerY);
        ctx.lineTo(0, centerY);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)');
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0.3)');

        ctx.fillStyle = gradient;
        ctx.fill();

        this.evaluationHistory.forEach((score, i) => {
            const x = i * stepX;
            const y = centerY - (score / 100) * (canvas.height / 2 - 10);
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fillStyle = score >= 0 ? '#60a5fa' : '#f87171';
            ctx.fill();
        });

        // Draw cursor line for current view
        if (this.currentViewIndex > 0 && this.currentViewIndex - 1 < this.evaluationHistory.length) {
            const i = this.currentViewIndex - 1;
            const x = i * stepX;
            ctx.beginPath();
            ctx.strokeStyle = '#fbbf24'; // accent-gold
            ctx.lineWidth = 2;
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
            
            // Highlight point
            const score = this.evaluationHistory[i];
            const y = centerY - (score / 100) * (canvas.height / 2 - 10);
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#fbbf24';
            ctx.fill();
        }
    }

    showKeyMoments() {
        const container = document.getElementById('keyMoments');
        container.innerHTML = '';

        if (this.moveDetails.length === 0) {
            container.innerHTML = '<p style="opacity:0.5">No hay momentos destacados</p>';
            return;
        }

        const sorted = [...this.moveDetails]
            .map((m, i) => ({ ...m, moveNum: i + 1 }))
            .sort((a, b) => b.cpLoss - a.cpLoss)
            .slice(0, 5);

        sorted.forEach(detail => {
            const el = document.createElement('div');
            el.className = 'key-moment';

            const classIcons = {
                excellent: '',
                good: '',
                inaccuracy: '',
                mistake: '',
                blunder: ''
            };

            const evalClass = detail.cpLoss <= 10 ? 'eval-positive' :
                             detail.cpLoss <= 100 ? 'eval-neutral' : 'eval-negative';

            el.innerHTML = `
                <span class="move">${classIcons[detail.classification]} ${detail.moveNum}. ${detail.san}</span>
                <span class="evaluation ${evalClass}">${detail.cpLoss > 0 ? '-' : ''}${detail.cpLoss}cp</span>
            `;
            container.appendChild(el);
        });
    }

    saveStats(accuracy, elo, resultClass) {
        try {
            const key = CONFIG.STORAGE.KEYS.STATS;
            let stats = JSON.parse(localStorage.getItem(key) || '{"games":0,"wins":0,"losses":0,"draws":0,"bestAccuracy":0,"avgAccuracy":0}');

            stats.games++;
            if (resultClass === 'result-win') stats.wins++;
            if (resultClass === 'result-loss') stats.losses++;
            if (resultClass === 'result-draw') stats.draws++;
            stats.bestAccuracy = Math.max(stats.bestAccuracy, accuracy);
            stats.avgAccuracy = Math.round(((stats.avgAccuracy * (stats.games - 1)) + accuracy) / stats.games);

            localStorage.setItem(key, JSON.stringify(stats));
        } catch {
            // Ignorar errores
        }
    }

    reset() {
        this.moveClassifications = { excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
        this.evaluationHistory = [];
        this.moveDetails = [];
        this.historyFens = [];
        this.currentViewIndex = 0;
        this.evalBeforePlayerMove = 0;
    }
}

const Analysis = new ChessAnalysis();