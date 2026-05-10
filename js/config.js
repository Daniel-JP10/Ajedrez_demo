/**
 * Chess Master Pro - Configuración Global
 * Centraliza todas las constantes y configuraciones del juego
 */

const CONFIG = {
    // Configuración del Juego
    GAME: {
        DEFAULT_TIME: 600, // 10 minutos en segundos
        TIME_OPTIONS: {
            blitz: 180,    // 3 minutos
            rapid: 300,    // 5 minutos
            classic: 600   // 10 minutos
        },
        LOW_TIME_THRESHOLD: 60, // Alerta cuando quedan 60 segundos
        UNDO_LIMIT: 2 // Máximo de jugadas que se pueden deshacer
    },

    // Configuración de la IA (Motor local Minimax)
    AI: {
        // Profundidades de búsqueda por nivel
        DEPTHS: {
            beginner: 2,
            intermediate: 3,
            advanced: 4
        },
        // Tiempos máximos de respuesta (ms)
        MOVE_TIMES: {
            beginner: 500,
            intermediate: 1000,
            advanced: 2000
        }
    },

    // Configuración de UI
    UI: {
        ANIMATION_DURATION: 250,
        BOARD_MAX_SIZE: 600,
        PIECE_SIZE_PERCENT: 88,
        COORDINATE_FONT_SIZE: '0.6875rem'
    },

    // Configuración de Sonido
    SOUND: {
        ENABLED: true,
        VOLUME: 0.3,
        SOUNDS: {
            move: { note: 'C5', duration: '32n', type: 'triangle' },
            capture: { note: 'G4', duration: '32n', type: 'square' },
            check: { note: 'E5', duration: '16n', type: 'sine' },
            gameEnd: { note: 'A4', duration: '8n', type: 'triangle' }
        }
    },

    // Configuración de Análisis
    ANALYSIS: {
        // Pesos para cálculo de precisión
        WEIGHTS: {
            excellent: 100,
            good: 85,
            inaccuracy: 60,
            mistake: 30,
            blunder: 0
        },
        // Rangos de ELO estimado por nivel
        ELO_RANGES: {
            beginner: { base: 1100, min: 800, max: 1400 },
            intermediate: { base: 1500, min: 1200, max: 1700 },
            advanced: { base: 1900, min: 1600, max: 2200 }
        },
        // Umbral para clasificación de movimientos
        THRESHOLDS: {
            excellent: 0.1,  // Dentro de 0.1 del mejor
            good: 0.5,       // Dentro de 0.5 del mejor
            inaccuracy: 1.0, // Pérdida de 0.5-1.0
            mistake: 2.0     // Pérdida de 1.0-2.0
            // > 2.0 = blunder
        }
    },

    // Configuración de Almacenamiento
    STORAGE: {
        ENABLED: true,
        KEYS: {
            STATS: 'chess_master_stats',
            PREFERENCES: 'chess_master_prefs',
            GAMES: 'chess_master_games'
        },
        MAX_GAMES_STORED: 50
    }
};

// Congelar configuración para evitar modificaciones
Object.freeze(CONFIG);