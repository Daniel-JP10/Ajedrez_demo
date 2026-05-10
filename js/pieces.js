/**
 * Chess Master Pro - Mapeo de rutas de piezas
 * Referencia archivos SVG externos para renderizado limpio
 */

const PIECE_PATHS = {
  w: {
    p: 'assets/pieces/wP.svg',
    r: 'assets/pieces/wR.svg',
    n: 'assets/pieces/wN.svg',
    b: 'assets/pieces/wB.svg',
    q: 'assets/pieces/wQ.svg',
    k: 'assets/pieces/wK.svg'
  },
  b: {
    p: 'assets/pieces/bP.svg',
    r: 'assets/pieces/bR.svg',
    n: 'assets/pieces/bN.svg',
    b: 'assets/pieces/bB.svg',
    q: 'assets/pieces/bQ.svg',
    k: 'assets/pieces/bK.svg'
  }
};

// Precarga todas las piezas en caché del navegador
function preloadPieces() {
  Object.values(PIECE_PATHS).forEach(color => {
    Object.values(color).forEach(src => {
      const img = new Image();
      img.src = src;
    });
  });
}

// Ejecutar precarga al iniciar
document.addEventListener('DOMContentLoaded', preloadPieces);