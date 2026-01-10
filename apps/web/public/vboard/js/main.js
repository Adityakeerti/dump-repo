/**
 * Main Application Entry Point
 * Gesture-Controlled Virtual Whiteboard with 3D Educational Models
 */

import GestureRecognizer, { GESTURES } from './gesture.js';
import Whiteboard from './whiteboard.js';
// import ModelManager from './models.js';
import VoiceAssistant from './voice.js';

class Application {
    constructor() {
        // DOM Elements
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('output_canvas');
        this.ctx = this.canvas.getContext('2d');
        this.loadingEl = document.getElementById('loading');
        this.loadingStatus = document.getElementById('loading-status');

        // Status elements
        this.handIndicator = document.getElementById('hand-indicator');
        this.handStatus = document.getElementById('hand-status');
        this.gestureStatus = document.getElementById('gesture-status');
        this.voiceStatus = document.getElementById('voice-status');
        this.infoPopup = document.getElementById('info-popup');
        this.infoTitle = document.getElementById('info-title');
        this.infoDescription = document.getElementById('info-description');

        // Modules
        this.gestureRecognizer = new GestureRecognizer();
        this.whiteboard = new Whiteboard(this.canvas);
        // this.modelManager = new ModelManager();
        this.voiceAssistant = new VoiceAssistant();

        // State
        this.isRunning = false;
        this.lastVideoTime = -1;
        this.lastGesture = GESTURES.NONE;

        // Auto-rotation state
        this.autoRotate = false;

        // Zoom state for voice commands
        this.voiceZoomTarget = 1;

        // Theme state (false = light/white, true = dark/black)
        this.isDarkMode = false;

        // Bind event handlers
        this.bindEvents();
    }

    async initialize() {
        try {
            this.updateLoadingStatus('Initializing AI Vision...');

            // Initialize gesture recognizer
            const gestureReady = await this.gestureRecognizer.initialize(
                (status) => this.updateLoadingStatus(status)
            );

            if (!gestureReady) {
                throw new Error('Failed to initialize hand tracking');
            }

            // Start webcam
            this.updateLoadingStatus('Requesting camera access...');
            await this.startWebcam();

            // Initialize 3D
            // this.updateLoadingStatus('Loading 3D models...');
            // await this.modelManager.initialize(this.canvas.width, this.canvas.height);

            // Setup voice assistant
            this.voiceAssistant.onCommand = (cmd) => this.handleVoiceCommand(cmd);
            this.voiceAssistant.onStatusChange = (status) => {
                if (this.voiceStatus) this.voiceStatus.textContent = status;
            };

            // Hide loading
            this.loadingEl.style.display = 'none';

            // Start render loop
            this.isRunning = true;
            this.render();

        } catch (error) {
            console.error('Initialization error:', error);
            this.showError(error.message);
        }
    }

    async startWebcam() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API not supported. Please use Chrome or Edge.');
        }

        const constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = stream;

        return new Promise((resolve) => {
            this.video.onloadeddata = () => {
                this.resizeCanvas();
                resolve();
            };
        });
    }

    resizeCanvas() {
        const width = this.video.videoWidth || window.innerWidth;
        const height = this.video.videoHeight || window.innerHeight;

        this.canvas.width = width;
        this.canvas.height = height;

        this.whiteboard.resize(width, height);
        // this.modelManager.resize(width, height);
    }

    bindEvents() {
        // Window resize
        window.addEventListener('resize', () => {
            if (this.video.videoWidth) {
                this.resizeCanvas();
            }
        });

        // Color buttons
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const color = btn.dataset.color;
                if (color) {
                    this.whiteboard.setColor(color);
                    document.getElementById('eraser-btn')?.classList.remove('active');
                }
            });
        });

        // Stroke slider
        const strokeSlider = document.getElementById('stroke-slider');
        const strokeValue = document.getElementById('stroke-value');
        if (strokeSlider) {
            strokeSlider.addEventListener('input', () => {
                const size = strokeSlider.value;
                this.whiteboard.setSize(size);
                if (strokeValue) strokeValue.textContent = size;
            });
        }

        // Theme toggle buttons
        document.getElementById('light-mode-btn')?.addEventListener('click', () => {
            this.isDarkMode = false;
            document.getElementById('light-mode-btn')?.classList.add('active');
            document.getElementById('dark-mode-btn')?.classList.remove('active');
        });

        document.getElementById('dark-mode-btn')?.addEventListener('click', () => {
            this.isDarkMode = true;
            document.getElementById('dark-mode-btn')?.classList.add('active');
            document.getElementById('light-mode-btn')?.classList.remove('active');
        });

        // Tool buttons
        document.getElementById('eraser-btn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('active');
            this.whiteboard.setEraser(btn.classList.contains('active'));
            if (btn.classList.contains('active')) {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            }
        });

        document.getElementById('clear-btn')?.addEventListener('click', () => {
            this.whiteboard.clear();
        });

        document.getElementById('undo-btn')?.addEventListener('click', () => {
            this.whiteboard.undo();
        });

        document.getElementById('redo-btn')?.addEventListener('click', () => {
            this.whiteboard.redo();
        });

        document.getElementById('save-btn')?.addEventListener('click', () => {
            this.whiteboard.saveAsImage();
        });

        // Pen button
        document.getElementById('pen-btn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            this.activatePenMode();
        });

        // Shape buttons
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const shape = btn.dataset.shape;
                if (shape) {
                    // Deactivate other tools
                    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                    document.getElementById('pen-btn')?.classList.remove('active');
                    document.getElementById('eraser-btn')?.classList.remove('active');

                    btn.classList.add('active');
                    this.whiteboard.setMode(shape);
                }
            });
        });

        // Fill button
        document.getElementById('fill-btn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.toggle('active');
            this.whiteboard.setFillShape(btn.classList.contains('active'));
        });

        /*
        // Model buttons
        document.querySelectorAll('.model-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const model = btn.dataset.model;
                if (model) {
                    this.modelManager.loadModel(model);
                    this.showModelInfo(model);
                }
            });
        });
        */

        // Voice button
        document.getElementById('mic-btn')?.addEventListener('click', (e) => {
            const btn = e.currentTarget;
            const isListening = this.voiceAssistant.toggle();
            btn.classList.toggle('active', isListening);
        });
    }

    activatePenMode() {
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('eraser-btn')?.classList.remove('active');
        document.getElementById('pen-btn')?.classList.add('active');
        this.whiteboard.setMode('pen');
    }

    render() {
        if (!this.isRunning) return;

        const timestamp = performance.now();

        // Only process if video has new frame
        if (this.video.currentTime !== this.lastVideoTime) {
            this.lastVideoTime = this.video.currentTime;

            // Clear canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            // Draw background based on theme mode
            this.ctx.fillStyle = this.isDarkMode ? '#000000' : '#ffffff';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Detect hands and gestures
            const handData = this.gestureRecognizer.detectHands(this.video, timestamp);

            if (handData) {
                // Mirror the X coordinate to match the flipped video
                handData.indexTipPosition.x = 1 - handData.indexTipPosition.x;
                handData.handPosition.x = 1 - handData.handPosition.x;

                this.updateHandStatus(true, handData.gesture);
                this.processGesture(handData);
            } else {
                this.updateHandStatus(false, GESTURES.NONE);
                this.whiteboard.stopDrawing();
            }

            // Draw whiteboard layer
            this.ctx.drawImage(this.whiteboard.getDrawingCanvas(), 0, 0);

            // Draw shape preview (dashed outline while drawing shapes)
            this.whiteboard.getShapePreview(this.ctx);

            // Update and render 3D models - DISABLED
            /*
            const gesture = handData?.gesture || GESTURES.NONE;
            const gesturePos = handData?.indexTipPosition || { x: 0.5, y: 0.5 };
            const pinchDist = handData?.pinchDistance || 0;

            this.modelManager.update(16, gesture, gesturePos, pinchDist);
            const modelCanvas = this.modelManager.render();
            if (modelCanvas) {
                this.ctx.drawImage(modelCanvas, 0, 0);
            }
            */

            // Draw hand cursor
            if (handData) {
                const x = handData.indexTipPosition.x * this.canvas.width;
                const y = handData.indexTipPosition.y * this.canvas.height;
                const currentColor = this.whiteboard.currentColor;
                this.whiteboard.drawCursor(this.ctx, x, y, handData.gesture, currentColor);
            }
        }

        requestAnimationFrame(() => this.render());
    }

    processGesture(handData) {
        const { gesture, indexTipPosition } = handData;
        const x = indexTipPosition.x * this.canvas.width;
        const y = indexTipPosition.y * this.canvas.height;

        switch (gesture) {
            case GESTURES.POINT:
                // Drawing/Shape mode
                if (this.lastGesture !== GESTURES.POINT) {
                    this.whiteboard.startShape(x, y);
                } else {
                    this.whiteboard.drawShape(x, y);
                }
                break;

            case GESTURES.PEACE:
            case GESTURES.PINCH:
            case GESTURES.FIST:
                // 3D control modes - finish shape and stop drawing
                // (Disabled 3D, so these just act as non-drawing gestures now)
                if (this.lastGesture === GESTURES.POINT) {
                    this.whiteboard.finishShape();
                }
                this.whiteboard.stopDrawing();
                break;

            case GESTURES.PALM:
            case GESTURES.NONE:
            default:
                // Stop all interactions
                if (this.lastGesture === GESTURES.POINT) {
                    this.whiteboard.finishShape();
                }
                this.whiteboard.stopDrawing();
                break;
        }

        this.lastGesture = gesture;
    }

    updateHandStatus(detected, gesture) {
        if (this.handIndicator) {
            this.handIndicator.classList.toggle('active', detected);
        }

        if (this.handStatus) {
            this.handStatus.textContent = detected ? 'Hand Detected' : 'No Hand Detected';
        }

        if (this.gestureStatus) {
            this.gestureStatus.textContent = this.gestureRecognizer.getGestureLabel(gesture);
        }
    }

    handleVoiceCommand(command) {
        console.log('Voice command:', command);

        switch (command.action) {
            /*
            case 'explain':
                const modelType = command.model === 'current'
                    ? this.modelManager.getCurrentModel()
                    : command.model;
                const modelData = this.modelManager.getModelInfo(modelType);
                if (modelData) {
                    this.voiceAssistant.explainModel(modelData);
                    this.showModelInfo(modelType);
                }
                break;
            */

            case 'rotate':
                this.autoRotate = true;
                break;

            case 'clear':
                this.whiteboard.clear();
                break;

            case 'zoom':
                // Voice-controlled zoom
                this.voiceZoomTarget += command.direction === 'in' ? 0.3 : -0.3;
                this.voiceZoomTarget = Math.max(0.5, Math.min(2.5, this.voiceZoomTarget));
                break;

            /*
            case 'stop':
                this.autoRotate = false;
                break;
            */

            case 'stopListening':
                this.voiceAssistant.stop();
                document.getElementById('mic-btn')?.classList.remove('active');
                break;

            case 'undo':
                this.whiteboard.undo();
                break;

            case 'redo':
                this.whiteboard.redo();
                break;

            case 'save':
                this.whiteboard.saveAsImage();
                break;

            /*
            case 'loadModel':
                this.modelManager.loadModel(command.model);
                // Update UI
                document.querySelectorAll('.model-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.model === command.model);
                });
                this.showModelInfo(command.model);
                break;
            */

            case 'color':
                this.whiteboard.setColor(command.color);
                // Update UI
                document.querySelectorAll('.color-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.color === command.color);
                });
                document.getElementById('eraser-btn')?.classList.remove('active');
                this.activatePenMode();
                break;

            case 'tool':
                if (command.tool === 'pen') {
                    this.activatePenMode();
                } else if (command.tool === 'eraser') {
                    this.whiteboard.setEraser(true);
                    document.getElementById('pen-btn')?.classList.remove('active');
                    document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
                    document.getElementById('eraser-btn')?.classList.add('active');
                }
                break;

            case 'mode':
                this.isDarkMode = command.theme === 'dark';
                // Update UI buttons
                if (this.isDarkMode) {
                    document.getElementById('dark-mode-btn')?.classList.add('active');
                    document.getElementById('light-mode-btn')?.classList.remove('active');
                } else {
                    document.getElementById('light-mode-btn')?.classList.add('active');
                    document.getElementById('dark-mode-btn')?.classList.remove('active');
                }
                break;

            case 'shape':
                this.whiteboard.setMode(command.shape);
                // Update UI
                document.getElementById('pen-btn')?.classList.remove('active');
                document.getElementById('eraser-btn')?.classList.remove('active');
                document.querySelectorAll('.shape-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.shape === command.shape);
                });
                break;
        }
    }

    showModelInfo(modelType) {
        // Disabled
        /*
        const modelData = this.modelManager.getModelInfo(modelType);

        if (modelData && this.infoPopup) {
            this.infoTitle.textContent = modelData.name;
            this.infoDescription.textContent = modelData.description;
            this.infoPopup.classList.add('visible');

            // Auto-hide after 5 seconds
            setTimeout(() => {
                this.infoPopup.classList.remove('visible');
            }, 5000);
        } else if (this.infoPopup) {
            this.infoPopup.classList.remove('visible');
        }
        */
    }

    updateLoadingStatus(status) {
        if (this.loadingStatus) {
            this.loadingStatus.textContent = status;
        }
    }

    showError(message) {
        if (this.loadingEl) {
            this.loadingEl.innerHTML = `
                <div class="loading-content">
                    <h2 style="color: #ef4444;">Error</h2>
                    <p>${message}</p>
                    <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 10px;">
                        Please check camera permissions and try refreshing the page.
                    </p>
                </div>
            `;
        }
    }
}

// Start application
const app = new Application();
app.initialize();
