# Chess Master Pro (En Desarrollo)

Juego de ajedrez web moderno con IA competitiva y análisis post-partida. Actualmente en fase de optimización y mejora continua.

---

## Estado Actual
El proyecto es funcional y jugable, pero se encuentra en fase activa de desarrollo.

### Funcional: Tablero, reglas, movimientos, IA básica y estructura modular.

### En Mejora: Ajuste fino de niveles de ELO, optimización de tiempos de respuesta de la IA y refinamiento de la interfaz móvil.

### Objetivo: Lograr una experiencia fluida que simule niveles reales de 800 a 2000+ ELO sin necesidad de backend propio.

---
# Características Principales

IA Híbrida: Usa Stockfish Cloud para análisis profundo y un Web Worker local (ai.worker.js) para mantener la interfaz fluida.

Análisis Post-Partida: Calcula precisión, clasifica movimientos (buenos, errores, etc.) y estima tu ELO basado en tu rendimiento.

Diseño Modular: Código separado en módulos lógicos (game, ui, ai, analysis) para facilitar mantenimiento.

Assets Externos: Piezas SVG vectoriales en assets/pieces/ para máxima calidad visual.

Audio Nativo: Sonidos generados por código (sounds.js) usando Web Audio API (sin archivos MP3 externos).

Responsive: Se adapta a PC y móviles, aunque aún se están ajustando algunos márgenes en pantallas pequeñas.

---

chess-master-pro/

├── index.html              # Archivo principal

├── README.md               # Este archivo

│

├── assets/

│   └── pieces/             # Imágenes SVG de las piezas (wP.svg, bK.svg, etc.)

│

├── css/                    # Estilos divididos por función

│   ├── styles.css          # Variables y estilos generales

│   ├── board.css           # Diseño del tablero

│   ├── pieces.css          # Estilo de las piezas

│   └── responsive.css      # Adaptaciones para móvil/tablet

│

└── js/ # Lógica del juego modular

    ├── config.js           # Configuración global (niveles, tiempos)
    
    ├── game.js             # Reglas del ajedrez y estado del tablero
    
    ├── ai.js               # Controlador de la Inteligencia Artificial
    
    ├── ai.worker.js        # Hilo secundario para que la IA no congele la pantalla
    
    ├── ui.js               # Interacción con el usuario (clics, modales)
    
    ├── analysis.js         # Cálculos de estadísticas al final de la partida
    
    ├── pieces.js           # Carga de las imágenes SVG
    
    └── sounds.js           # Generador de sonidos (movimiento, jaque, etc.)

---
## Cómo Probarlo Localmente

Debido a que usamos módulos JS y carga de archivos locales (SVG), no basta con abrir el HTML directamente. Necesitas un servidor local simple:
Abre la carpeta del proyecto en VS Code.

Instala la extensión "Live Server" (si no la tienes).

Haz clic derecho en index.html y elige "Open with Live Server".

El juego se abrirá en tu navegador automáticamente.

## Puntos Clave de Configuración
Si quieres ajustar la dificultad o los tiempos, edita el archivo js/config.js:

AI.DEPTHS: Profundidad de pensamiento de la IA (mayor número = más fuerte pero más lento).

AI.MOVE_TIMES: Tiempo máximo que la IA tarda en responder.

ANALYSIS.THRESHOLDS: Qué tan estricto es el análisis al juzgar tus movimientos.

---
## Notas para Desarrolladores
Sonidos: No hay archivos .mp3. Los sonidos se crean matemáticamente en js/sounds.js. Si no suenan, asegúrate de hacer clic en la página primero (los navegadores bloquean el audio automático).

Piezas: Las imágenes están en assets/pieces/. Si cambias los nombres de los archivos, debes actualizar js/pieces.js.

IA: La IA intenta conectarse a internet para ser más fuerte. Si no hay conexión, usa un modo local más básico.
