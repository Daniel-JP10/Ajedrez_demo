/**
 * Chess Master Pro - Motor de IA Local
 * Minimax con poda alfa-beta, tablas de posición, evaluación material y Opening Book
 * Funciona 100% offline - ideal para GitHub Pages
 */

class ChessAI {
    constructor() {
        this.isThinking = false;
        this.difficulty = 'intermediate';
        this.nodesSearched = 0;
        
        // El libro de aperturas ahora vive en ai.worker.js para selección aleatoria ponderada

        this.worker = new Worker('js/ai.worker.js');
        
        this.worker.onmessage = (e) => {
            const data = e.data;
            if (data.type === 'bestMove') {
                this.handleWorkerMove(data.move, data.nodes);
            } else if (data.type === 'evaluation') {
                this._resolveEvaluation(data.eval);
            }
        };
    }

    async checkAPI() {
        UI.updateAPIStatus(true);
        return true;
    }

    async makeMove() {
        if (!Game.gameActive) return;

        this.isThinking = true;
        UI.showThinking(true);

        const currentFen = Game.game.fen();

        // --- PASO 1: ENVIAR AL WORKER ---
        let depth;
        switch (this.difficulty) {
            case 'beginner':     depth = 2; break;
            case 'intermediate': depth = 3; break;
            case 'advanced':     depth = 4; break;
            default:             depth = 3;
        }

        this.workerStartTime = Date.now();
        this.worker.postMessage({
            type: 'search',
            fen: currentFen,
            depth: depth,
            isBeginner: this.difficulty === 'beginner'
        });
    }

    async handleWorkerMove(move, nodes) {
        try {
            this.nodesSearched = nodes;
            
            // Asegurar un tiempo mínimo natural de "pensamiento"
            const elapsed = Date.now() - (this.workerStartTime || Date.now());
            const minTime = this.difficulty === 'beginner' ? 300 : this.difficulty === 'intermediate' ? 500 : 800;
            if (elapsed < minTime) {
                await this.delay(minTime - elapsed);
            }

            if (move) {
                Game.executeAIMove(move.from + move.to + (move.promotion || ''));
            } else {
                // Fallback si no hay movimiento
                const moves = Game.game.moves({ verbose: true });
                if (moves.length > 0) {
                    const m = moves[0];
                    Game.executeAIMove(m.from + m.to + (m.promotion || ''));
                }
            }
        } finally {
            this.isThinking = false;
            UI.showThinking(false);
        }
    }

    /**
     * Muestra pista usando el Worker de forma asíncrona
     */
    findBestMove(game, depth) {
        return new Promise((resolve) => {
            const tempWorker = new Worker('js/ai.worker.js');
            tempWorker.onmessage = (e) => {
                if (e.data.type === 'bestMove') {
                    resolve(e.data.move);
                    tempWorker.terminate();
                }
            };
            tempWorker.postMessage({
                type: 'search',
                fen: game.fen(),
                depth: depth,
                isBeginner: false
            });
        });
    }

    evaluate(game) {
        // Como Analysis llama a esto síncronamente tras mover, 
        // usaremos una aproximación o pediremos al worker síncronamente?
        // En js no hay sincronía con workers. 
        // Haremos que la función devuelva 0 y lo manejaremos asincronamente.
        // O migramos todo el análisis de juego a async.
        throw new Error("Llamada síncrona a evaluate prohibida. Usa evaluación asíncrona o mueve la lógica al Analysis.");
    }
    
    evaluateAsync(game) {
        return new Promise(resolve => {
            this._resolveEvaluation = resolve;
            this.worker.postMessage({
                type: 'evaluate',
                fen: game.fen()
            });
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

const AI = new ChessAI();