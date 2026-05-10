importScripts('https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js');

// ==========================================
// Dynamic Opening Book
// ==========================================
const OPENING_BOOK = {
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1": [
        { move: "e2e4", weight: 60 }, { move: "d2d4", weight: 30 }, { move: "c2c4", weight: 10 }
    ],
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1": [
        { move: "e7e5", weight: 45 }, { move: "c7c5", weight: 45 }, { move: "e7e6", weight: 10 }
    ],
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2": [
        { move: "g1f3", weight: 90 }, { move: "f1c4", weight: 10 }
    ],
    "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2": [
        { move: "b8c6", weight: 80 }, { move: "g8f6", weight: 20 }
    ],
    "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1": [
        { move: "d7d5", weight: 50 }, { move: "g8f6", weight: 50 }
    ]
};

const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
    p: [0,0,0,0,0,0,0,0,50,50,50,50,50,50,50,50,10,10,20,30,30,20,10,10,5,5,10,25,25,10,5,5,0,0,0,20,20,0,0,0,5,-5,-10,0,0,-10,-5,5,5,10,10,-20,-20,10,10,5,0,0,0,0,0,0,0,0],
    n: [-50,-40,-30,-30,-30,-30,-40,-50,-40,-20,0,0,0,0,-20,-40,-30,0,10,15,15,10,0,-30,-30,5,15,20,20,15,5,-30,-30,0,15,20,20,15,0,-30,-30,5,10,15,15,10,5,-30,-40,-20,0,5,5,0,-20,-40,-50,-40,-30,-30,-30,-30,-40,-50],
    b: [-20,-10,-10,-10,-10,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,10,10,10,10,0,-10,-10,5,5,10,10,5,5,-10,-10,0,10,10,10,10,0,-10,-10,10,10,10,10,10,10,-10,-10,5,0,0,0,0,5,-10,-20,-10,-10,-10,-10,-10,-10,-20],
    r: [0,0,0,0,0,0,0,0,5,10,10,10,10,10,10,5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,-5,0,0,0,0,0,0,-5,0,0,0,5,5,0,0,0],
    q: [-20,-10,-10,-5,-5,-10,-10,-20,-10,0,0,0,0,0,0,-10,-10,0,5,5,5,5,0,-10,-5,0,5,5,5,5,0,-5,0,0,5,5,5,5,0,-5,-10,5,5,5,5,5,0,-10,-10,0,5,0,0,0,0,-10,-20,-10,-10,-5,-5,-10,-10,-20],
    k: [-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-30,-40,-40,-50,-50,-40,-40,-30,-20,-30,-30,-40,-40,-30,-30,-20,-10,-20,-20,-20,-20,-20,-20,-10,20,20,0,0,0,0,20,20,20,30,10,0,0,10,30,20]
};

// ==========================================
// Zobrist Hashing
// ==========================================
const ZOBRIST_TABLE = [];
let ZOBRIST_BLACK_TO_MOVE;
const TTable = new Map();

function initZobrist() {
    for (let i = 0; i < 64 * 12; i++) {
        ZOBRIST_TABLE.push((Math.random() * 0x100000000) | 0);
    }
    ZOBRIST_BLACK_TO_MOVE = (Math.random() * 0x100000000) | 0;
}

const pieceMap = { 'p': 0, 'n': 1, 'b': 2, 'r': 3, 'q': 4, 'k': 5 };

function sqToIndex(sq) {
    const file = sq.charCodeAt(0) - 97;
    const rank = 8 - parseInt(sq[1]);
    return rank * 8 + file;
}

function computeHash(game) {
    let hash = 0;
    const board = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece) {
                const isBlack = piece.color === 'b' ? 1 : 0;
                const pType = pieceMap[piece.type];
                const pieceIndex = pType + (isBlack * 6);
                const squareIndex = r * 8 + c;
                hash ^= ZOBRIST_TABLE[squareIndex * 12 + pieceIndex];
            }
        }
    }
    if (game.turn() === 'b') {
        hash ^= ZOBRIST_BLACK_TO_MOVE;
    }
    return hash;
}

// ==========================================
// Incremental Evaluation
// ==========================================

function getSquareValue(type, color, sqIdx) {
    const value = PIECE_VALUES[type] || 0;
    const rank = Math.floor(sqIdx / 8);
    const file = sqIdx % 8;
    const pstIndex = color === 'w' ? sqIdx : ((7 - rank) * 8 + file);
    const pstValue = PST[type] ? PST[type][pstIndex] : 0;
    return color === 'w' ? (value + pstValue) : -(value + pstValue);
}

function computeInitialEval(game) {
    let score = 0;
    const board = game.board();
    for (let rank = 0; rank < 8; rank++) {
        for (let file = 0; file < 8; file++) {
            const piece = board[rank][file];
            if (piece) {
                const sqIdx = rank * 8 + file;
                score += getSquareValue(piece.type, piece.color, sqIdx);
            }
        }
    }
    return score;
}

function getMoveDeltas(move, isWhiteTurn) {
    let evalDelta = 0;
    let hashDelta = 0;
    
    const fromIdx = sqToIndex(move.from);
    const toIdx = sqToIndex(move.to);
    const pieceType = pieceMap[move.piece];
    const pieceColorIdx = isWhiteTurn ? 0 : 1;
    const enemyColorIdx = isWhiteTurn ? 1 : 0;
    const myColor = isWhiteTurn ? 'w' : 'b';
    const enemyColor = isWhiteTurn ? 'b' : 'w';

    // Remove moving piece from origin
    evalDelta -= getSquareValue(move.piece, myColor, fromIdx);
    hashDelta ^= ZOBRIST_TABLE[fromIdx * 12 + pieceType + pieceColorIdx * 6];
    
    // Add piece to destination (handle promotion)
    const destPiece = move.promotion ? move.promotion : move.piece;
    evalDelta += getSquareValue(destPiece, myColor, toIdx);
    hashDelta ^= ZOBRIST_TABLE[toIdx * 12 + pieceMap[destPiece] + pieceColorIdx * 6];
    
    // Remove captured piece
    if (move.captured) {
        let capIdx = toIdx;
        if (move.flags.includes('e')) { // En Passant
            capIdx = isWhiteTurn ? toIdx + 8 : toIdx - 8;
        }
        evalDelta -= getSquareValue(move.captured, enemyColor, capIdx);
        hashDelta ^= ZOBRIST_TABLE[capIdx * 12 + pieceMap[move.captured] + enemyColorIdx * 6];
    }
    
    // Handle Castling
    if (move.flags.includes('k') || move.flags.includes('q')) {
        let rookFrom, rookTo;
        if (move.flags.includes('k')) {
            rookFrom = isWhiteTurn ? sqToIndex('h1') : sqToIndex('h8');
            rookTo = isWhiteTurn ? sqToIndex('f1') : sqToIndex('f8');
        } else {
            rookFrom = isWhiteTurn ? sqToIndex('a1') : sqToIndex('a8');
            rookTo = isWhiteTurn ? sqToIndex('d1') : sqToIndex('d8');
        }
        evalDelta -= getSquareValue('r', myColor, rookFrom);
        evalDelta += getSquareValue('r', myColor, rookTo);
        
        hashDelta ^= ZOBRIST_TABLE[rookFrom * 12 + pieceMap['r'] + pieceColorIdx * 6];
        hashDelta ^= ZOBRIST_TABLE[rookTo * 12 + pieceMap['r'] + pieceColorIdx * 6];
    }
    
    // Change turn hash
    hashDelta ^= ZOBRIST_BLACK_TO_MOVE;

    return { evalDelta, hashDelta };
}

// ==========================================
// Worker Engine
// ==========================================

class WorkerEngine {
    constructor() {
        initZobrist();
        this.nodes = 0;
        this.killerMoves = new Array(100).fill(null).map(() => []);
        this.historyMoves = new Array(64).fill(null).map(() => new Array(64).fill(0));
    }

    orderMoves(moves, ply) {
        moves.sort((a, b) => {
            let scoreA = 0, scoreB = 0;
            
            if (a.captured) scoreA += (PIECE_VALUES[a.captured] || 0) * 10 - (PIECE_VALUES[a.piece] || 0) + 10000;
            if (b.captured) scoreB += (PIECE_VALUES[b.captured] || 0) * 10 - (PIECE_VALUES[b.piece] || 0) + 10000;
            
            if (a.promotion) scoreA += PIECE_VALUES[a.promotion] || 0;
            if (b.promotion) scoreB += PIECE_VALUES[b.promotion] || 0;

            if (!a.captured && !a.promotion) {
                if (this.killerMoves[ply]) {
                    if (this.killerMoves[ply][0] && a.from === this.killerMoves[ply][0].from && a.to === this.killerMoves[ply][0].to) scoreA += 9000;
                    else if (this.killerMoves[ply][1] && a.from === this.killerMoves[ply][1].from && a.to === this.killerMoves[ply][1].to) scoreA += 8000;
                }
                const fIdxA = sqToIndex(a.from);
                const tIdxA = sqToIndex(a.to);
                scoreA += this.historyMoves[fIdxA][tIdxA];
            }

            if (!b.captured && !b.promotion) {
                if (this.killerMoves[ply]) {
                    if (this.killerMoves[ply][0] && b.from === this.killerMoves[ply][0].from && b.to === this.killerMoves[ply][0].to) scoreB += 9000;
                    else if (this.killerMoves[ply][1] && b.from === this.killerMoves[ply][1].from && b.to === this.killerMoves[ply][1].to) scoreB += 8000;
                }
                const fIdxB = sqToIndex(b.from);
                const tIdxB = sqToIndex(b.to);
                scoreB += this.historyMoves[fIdxB][tIdxB];
            }

            return scoreB - scoreA;
        });
    }

    evaluateStatic(game, baseEval) {
        if (game.in_checkmate()) {
            return game.turn() === 'w' ? -99999 : 99999;
        }
        if (game.in_draw() || game.in_stalemate() || game.in_threefold_repetition()) {
            return 0;
        }
        
        let score = baseEval;
        if (game.in_check()) {
            score += game.turn() === 'w' ? -30 : 30;
        }
        return score;
    }

    quiesce(game, alpha, beta, isMaximizing, maxDepth, currentEval) {
        const standPat = this.evaluateStatic(game, currentEval);

        if (maxDepth <= 0) return standPat;

        if (isMaximizing) {
            if (standPat >= beta) return beta;
            if (standPat > alpha) alpha = standPat;
        } else {
            if (standPat <= alpha) return alpha;
            if (standPat < beta) beta = standPat;
        }

        const moves = game.moves({ verbose: true }).filter(m =>
            m.flags.includes('c') || m.flags.includes('e') || m.flags.includes('p')
        );

        if (moves.length === 0) return standPat;

        this.orderMoves(moves, 0);

        if (isMaximizing) {
            let maxEval = standPat;
            for (const move of moves) {
                const deltas = getMoveDeltas(move, true);
                game.move(move);
                const eval_ = this.quiesce(game, alpha, beta, false, maxDepth - 1, currentEval + deltas.evalDelta);
                game.undo();
                maxEval = Math.max(maxEval, eval_);
                alpha = Math.max(alpha, eval_);
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = standPat;
            for (const move of moves) {
                const deltas = getMoveDeltas(move, false);
                game.move(move);
                const eval_ = this.quiesce(game, alpha, beta, true, maxDepth - 1, currentEval + deltas.evalDelta);
                game.undo();
                minEval = Math.min(minEval, eval_);
                beta = Math.min(beta, eval_);
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    minimax(game, depth, alpha, beta, isMaximizing, hash, currentEval, ply) {
        if ((this.nodes & 2047) === 0 && Date.now() - this.startTime > this.timeLimit) {
            this.timeUp = true;
            return 0;
        }
        if (this.timeUp) return 0;
        
        this.nodes++;

        // Zobrist Lookup
        const ttEntry = TTable.get(hash);
        if (ttEntry && ttEntry.depth >= depth) {
            if (ttEntry.flag === 'EXACT') return ttEntry.score;
            if (ttEntry.flag === 'ALPHA' && ttEntry.score <= alpha) return alpha;
            if (ttEntry.flag === 'BETA' && ttEntry.score >= beta) return beta;
        }

        if (depth === 0) return this.quiesce(game, alpha, beta, isMaximizing, 3, currentEval);
        
        if (game.game_over()) {
            return this.evaluateStatic(game, currentEval);
        }

        const moves = game.moves({ verbose: true });
        this.orderMoves(moves, ply);

        let bestScore = isMaximizing ? -Infinity : Infinity;
        let originalAlpha = alpha;

        for (const move of moves) {
            const deltas = getMoveDeltas(move, isMaximizing);
            game.move(move);
            const childHash = hash ^ deltas.hashDelta;
            const childEval = currentEval + deltas.evalDelta;

            let score;
            if (isMaximizing) {
                score = this.minimax(game, depth - 1, alpha, beta, false, childHash, childEval, ply + 1);
                bestScore = Math.max(bestScore, score);
                alpha = Math.max(alpha, score);
            } else {
                score = this.minimax(game, depth - 1, alpha, beta, true, childHash, childEval, ply + 1);
                bestScore = Math.min(bestScore, score);
                beta = Math.min(beta, score);
            }

            game.undo();
            
            if (this.timeUp) return 0;
            
            if (beta <= alpha) {
                if (!move.captured && !move.promotion) {
                    if (!this.killerMoves[ply]) this.killerMoves[ply] = [];
                    if (this.killerMoves[ply][0] !== move) {
                        this.killerMoves[ply].unshift(move);
                        if (this.killerMoves[ply].length > 2) this.killerMoves[ply].pop();
                    }
                    const fIdx = sqToIndex(move.from);
                    const tIdx = sqToIndex(move.to);
                    this.historyMoves[fIdx][tIdx] += depth * depth;
                }
                break;
            }
        }

        // Zobrist Store
        let flag = 'EXACT';
        if (bestScore <= originalAlpha) flag = 'ALPHA';
        else if (bestScore >= beta) flag = 'BETA';
        
        TTable.set(hash, { depth, score: bestScore, flag });

        return bestScore;
    }

    findBestMove(fen, maxDepth, isBeginner) {
        if (OPENING_BOOK[fen]) {
            const choices = OPENING_BOOK[fen];
            const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
            let rand = Math.random() * totalWeight;
            for (let c of choices) {
                rand -= c.weight;
                if (rand <= 0) return { from: c.move.substring(0,2), to: c.move.substring(2,4) };
            }
        }

        const game = new Chess(fen);
        this.nodes = 0;
        TTable.clear();
        this.historyMoves = new Array(64).fill(null).map(() => new Array(64).fill(0));
        this.killerMoves = new Array(100).fill(null).map(() => []);

        const moves = game.moves({ verbose: true });
        if (moves.length === 0) return null;

        if (isBeginner && Math.random() < 0.25 && moves.length > 1) {
             return moves[Math.floor(Math.random() * moves.length)];
        }

        let currentHash = computeHash(game);
        let currentEval = computeInitialEval(game);

        this.timeLimit = isBeginner ? 300 : (maxDepth >= 4 ? 3000 : 1000); 
        this.startTime = Date.now();
        this.timeUp = false;

        let globalBestMove = null;

        for (let d = 1; d <= maxDepth; d++) {
            let bestMove = null;
            let bestScore = -Infinity;
            const isMaximizing = game.turn() === 'w';

            this.orderMoves(moves, 0);

            for (const move of moves) {
                const deltas = getMoveDeltas(move, isMaximizing);
                game.move(move);
                const childHash = currentHash ^ deltas.hashDelta;
                const childEval = currentEval + deltas.evalDelta;

                let score;
                if (isMaximizing) {
                    score = this.minimax(game, d - 1, -Infinity, Infinity, false, childHash, childEval, 1);
                } else {
                    score = -this.minimax(game, d - 1, -Infinity, Infinity, true, childHash, childEval, 1);
                }

                game.undo();

                if (this.timeUp) break;

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                }
            }

            if (this.timeUp) break;
            if (bestMove) globalBestMove = bestMove;
            
            // Si encuentra mate forzado, se detiene
            if (Math.abs(bestScore) > 90000) break;
        }

        return globalBestMove || moves[0];
    }
}

const engine = new WorkerEngine();

// Message Handler
onmessage = function(e) {
    const { type, fen, depth, isBeginner } = e.data;
    
    if (type === 'search') {
        const bestMove = engine.findBestMove(fen, depth, isBeginner);
        postMessage({ 
            type: 'bestMove', 
            move: bestMove,
            nodes: engine.nodes 
        });
    } else if (type === 'evaluate') {
        const game = new Chess(fen);
        const evalScore = computeInitialEval(game);
        postMessage({ type: 'evaluation', eval: evalScore });
    }
};
