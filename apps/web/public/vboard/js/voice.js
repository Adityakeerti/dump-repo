/**
 * Voice Assistant Module
 * Uses Web Speech API for voice commands and text-to-speech
 */

class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isActive = false; // "Hey Board" activation state
        this.activationTimeout = null;
        this.isSupported = false;

        // Callbacks
        this.onCommand = null;
        this.onStatusChange = null;

        // AI Configuration (Hugging Face)
        this.hfKey = window.HF_KEY || ""; // Should be provided in index.html or global scope
        this.hfModel = "facebook/bart-large-mnli"; // Zero-shot classification model
        this.aiThreshold = 0.6; // Minimum confidence score for AI matching

        // Command patterns
        this.commands = {
            'explain solar': { action: 'explain', model: 'solar', status: 'Explaining Solar System...' },
            'explain heart': { action: 'explain', model: 'heart', status: 'Explaining Heart...' },
            'explain eye': { action: 'explain', model: 'eye', status: 'Explaining Eye...' },
            'explain reflection': { action: 'explain', model: 'reflection', status: 'Explaining Physics...' },
            'explain model': { action: 'explain', model: 'current', status: 'Explaining Model...' },
            'rotate': { action: 'rotate', status: 'Rotating Model...' },
            'rotate model': { action: 'rotate', status: 'Rotating Model...' },
            'clear board': { action: 'clear', status: 'Clearing Board...' },
            'clear canvas': { action: 'clear', status: 'Clearing Canvas...' },
            'clear': { action: 'clear', status: 'Clearing...' },
            'zoom in': { action: 'zoom', direction: 'in', status: 'Zooming In...' },
            'zoom out': { action: 'zoom', direction: 'out', status: 'Zooming Out...' },
            'stop': { action: 'stop', status: 'Stopping...' },
            'stop listening': { action: 'stopListening', status: 'Goodbye...' },
            'undo': { action: 'undo', status: 'Undoing...' },
            'redo': { action: 'redo', status: 'Redoing...' },
            'save': { action: 'save', status: 'Saving Image...' },
            'save image': { action: 'save', status: 'Saving Image...' },
            'solar system': { action: 'loadModel', model: 'solar', status: 'Loading Solar System...' },
            'show heart': { action: 'loadModel', model: 'heart', status: 'Loading Heart Model...' },
            'show eye': { action: 'loadModel', model: 'eye', status: 'Loading Eye Model...' },
            'hide model': { action: 'loadModel', model: 'none', status: 'Hiding Model...' },
            'no model': { action: 'loadModel', model: 'none', status: 'Hiding Model...' },
            // Color commands
            'red': { action: 'color', color: '#ef4444', status: 'Color: Red' },
            'color red': { action: 'color', color: '#ef4444', status: 'Color: Red' },
            'change to red': { action: 'color', color: '#ef4444', status: 'Color: Red' },
            'green': { action: 'color', color: '#22c55e', status: 'Color: Green' },
            'color green': { action: 'color', color: '#22c55e', status: 'Color: Green' },
            'change to green': { action: 'color', color: '#22c55e', status: 'Color: Green' },
            'blue': { action: 'color', color: '#3b82f6', status: 'Color: Blue' },
            'color blue': { action: 'color', color: '#3b82f6', status: 'Color: Blue' },
            'change to blue': { action: 'color', color: '#3b82f6', status: 'Color: Blue' },
            'yellow': { action: 'color', color: '#facc15', status: 'Color: Yellow' },
            'color yellow': { action: 'color', color: '#facc15', status: 'Color: Yellow' },
            'change to yellow': { action: 'color', color: '#facc15', status: 'Color: Yellow' },
            'black': { action: 'color', color: '#000000', status: 'Color: Black' },
            'color black': { action: 'color', color: '#000000', status: 'Color: Black' },
            'change to black': { action: 'color', color: '#000000', status: 'Color: Black' },
            'white': { action: 'color', color: '#ffffff', status: 'Color: White' },
            'color white': { action: 'color', color: '#ffffff', status: 'Color: White' },
            'change to white': { action: 'color', color: '#ffffff', status: 'Color: White' },
            'pink': { action: 'color', color: '#ff00aa', status: 'Color: Pink' },
            'color pink': { action: 'color', color: '#ff00aa', status: 'Color: Pink' },
            'change to pink': { action: 'color', color: '#ff00aa', status: 'Color: Pink' },
            'orange': { action: 'color', color: '#f97316', status: 'Color: Orange' },
            'color orange': { action: 'color', color: '#f97316', status: 'Color: Orange' },
            'change to orange': { action: 'color', color: '#f97316', status: 'Color: Orange' },
            // Tool commands
            'pen': { action: 'tool', tool: 'pen', status: 'Tool: Pen' },
            'use pen': { action: 'tool', tool: 'pen', status: 'Tool: Pen' },
            'eraser': { action: 'tool', tool: 'eraser', status: 'Tool: Eraser' },
            'use eraser': { action: 'tool', tool: 'eraser', status: 'Tool: Eraser' },
            // Mode commands
            'light mode': { action: 'mode', theme: 'light', status: 'Light Mode' },
            'dark mode': { action: 'mode', theme: 'dark', status: 'Dark Mode' },
            'white background': { action: 'mode', theme: 'light', status: 'Light Mode' },
            'black background': { action: 'mode', theme: 'dark', status: 'Dark Mode' },
            // Shape commands
            'circle': { action: 'shape', shape: 'circle', status: 'Shape: Circle' },
            'draw circle': { action: 'shape', shape: 'circle', status: 'Shape: Circle' },
            'rectangle': { action: 'shape', shape: 'rectangle', status: 'Shape: Rectangle' },
            'draw rectangle': { action: 'shape', shape: 'rectangle', status: 'Shape: Rectangle' },
            'square': { action: 'shape', shape: 'square', status: 'Shape: Square' },
            'draw square': { action: 'shape', shape: 'square', status: 'Shape: Square' },
            'oval': { action: 'shape', shape: 'oval', status: 'Shape: Oval' },
            'draw oval': { action: 'shape', shape: 'oval', status: 'Shape: Oval' },
            'star': { action: 'shape', shape: 'star', status: 'Shape: Star' },
            'draw star': { action: 'shape', shape: 'star', status: 'Shape: Star' },
            'triangle': { action: 'shape', shape: 'triangle', status: 'Shape: Triangle' },
            'draw triangle': { action: 'shape', shape: 'triangle', status: 'Shape: Triangle' }
        };

        this.initialize();
    }

    initialize() {
        // Check for Web Speech API support
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech Recognition not supported');
            this.isSupported = false;
            return;
        }

        this.isSupported = true;
        this.recognition = new SpeechRecognition();

        // Configure recognition
        this.recognition.continuous = true;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 3;

        // Event handlers
        this.recognition.onresult = (event) => this.handleResult(event);
        this.recognition.onerror = (event) => this.handleError(event);
        this.recognition.onend = () => this.handleEnd();
        this.recognition.onstart = () => {
            this.isListening = true;
            if (this.isActive) {
                this.onStatusChange?.('Listening...');
            } else {
                this.onStatusChange?.("Say 'Hey Board'");
            }
        };
    }

    start() {
        if (!this.isSupported) {
            this.onStatusChange?.('Voice not supported');
            return false;
        }

        try {
            this.recognition.start();
            return true;
        } catch (error) {
            console.warn('Recognition start error:', error);
            return false;
        }
    }

    stop() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
            this.isActive = false;
            if (this.activationTimeout) clearTimeout(this.activationTimeout);
            this.onStatusChange?.('Voice Off');
        }
    }

    toggle() {
        if (this.isListening) {
            this.stop();
        } else {
            this.start();
        }
        return this.isListening;
    }

    async handleResult(event) {
        const results = event.results;
        const lastResult = results[results.length - 1];

        if (lastResult.isFinal) {
            let transcript = lastResult[0].transcript.toLowerCase().trim();
            console.log('Voice input:', transcript);

            // Wake Word Detection
            const wakeWordRegex = /^(hey|hello)\s+board/i;
            const hasWakeWord = wakeWordRegex.test(transcript);

            if (!this.isActive) {
                if (hasWakeWord) {
                    this.activateVoice();
                    // Strip wake word and process remainder if any
                    transcript = transcript.replace(wakeWordRegex, '').trim();
                    if (transcript.length === 0) return; // Just woke up
                } else {
                    // Ignore valid speech if not active
                    return;
                }
            } else {
                // Already active, just strip wake word if user says it again
                transcript = transcript.replace(wakeWordRegex, '').trim();
                // If empty after strip, just keep listening
                if (transcript.length === 0) return;
            }

            // --- Process Command ---

            // extend active time since we got input
            this.refreshActiveTimer();

            // 1. Try Simple Match first (fast)
            let command = this.matchCommand(transcript);

            // 2. If no simple match and HF Key available, try AI
            if (!command && this.hfKey) {
                this.onStatusChange?.('Processing...');
                command = await this.recognizeIntentAI(transcript);
            }

            if (command) {
                this.onCommand?.(command);
                const statusMsg = command.status || `"${transcript}"`;
                this.onStatusChange?.(statusMsg);

                // Show status then revert to listening
                setTimeout(() => {
                    if (this.isListening && this.isActive) {
                        this.onStatusChange?.('Listening...');
                    }
                }, 2000);
            } else {
                this.onStatusChange?.(`Unknown: "${transcript}"`);
                setTimeout(() => {
                    if (this.isListening && this.isActive) {
                        this.onStatusChange?.('Listening...');
                    }
                }, 2000);
            }
        }
    }

    activateVoice() {
        this.isActive = true;

        // Play activation sound if possible (optional)
        // const audio = new Audio('/sounds/activate.mp3'); audio.play().catch(e => {});

        this.onStatusChange?.('Listening...');
        this.refreshActiveTimer();
    }

    refreshActiveTimer() {
        if (this.activationTimeout) clearTimeout(this.activationTimeout);

        // Go back to sleep after 8 seconds of silence/inactivity
        this.activationTimeout = setTimeout(() => {
            this.isActive = false;
            if (this.isListening) {
                this.onStatusChange?.("Say 'Hey Board'");
            }
        }, 8000);
    }

    async recognizeIntentAI(transcript) {
        if (!this.hfKey) return null;

        const API_URL = `https://api-inference.huggingface.co/models/${this.hfModel}`;
        // Map common synonyms to our command keys for better classification
        const candidateLabels = [
            "explain solar system", "explain human heart", "explain human eye", "explain light reflection",
            "rotate the model", "clear the whiteboard", "zoom in", "zoom out", "stop everything",
            "undo last action", "redo action", "save drawing as image",
            "show solar system", "show human heart", "show human eye", "hide 3d model",
            "change color to red", "change color to green", "change color to blue",
            "change color to yellow", "change color to black", "change color to white",
            "change color to pink", "change color to orange",
            "use pen tool", "use eraser tool",
            "switch to light mode", "switch to dark mode",
            "draw a circle", "draw a rectangle", "draw a square", "draw an oval", "draw a star", "draw a triangle"
        ];

        // Mapping labels back to command keys
        const labelMap = {
            "explain solar system": "explain solar",
            "explain human heart": "explain heart",
            "explain human eye": "explain eye",
            "explain light reflection": "explain reflection",
            "rotate the model": "rotate",
            "clear the whiteboard": "clear",
            "zoom in": "zoom in",
            "zoom out": "zoom out",
            "stop everything": "stop",
            "undo last action": "undo",
            "redo action": "redo",
            "save drawing as image": "save",
            "show solar system": "solar system",
            "show human heart": "show heart",
            "show human eye": "show eye",
            "hide 3d model": "hide model",
            "change color to red": "red",
            "change color to green": "green",
            "change color to blue": "blue",
            "change color to yellow": "yellow",
            "change color to black": "black",
            "change color to white": "white",
            "change color to pink": "pink",
            "change color to orange": "orange",
            "use pen tool": "pen",
            "use pen tool": "pen",
            "use eraser tool": "eraser",
            "switch to light mode": "light mode",
            "switch to dark mode": "dark mode",
            "draw a circle": "circle",
            "draw a rectangle": "rectangle",
            "draw a square": "square",
            "draw an oval": "oval",
            "draw a star": "star",
            "draw a triangle": "triangle"
        };

        try {
            const response = await fetch(API_URL, {
                headers: { Authorization: `Bearer ${this.hfKey}` },
                method: "POST",
                body: JSON.stringify({
                    inputs: transcript,
                    parameters: { candidate_labels: candidateLabels }
                }),
            });

            const result = await response.json();

            if (result.labels && result.scores && result.scores[0] > this.aiThreshold) {
                const bestLabel = result.labels[0];
                const commandKey = labelMap[bestLabel];
                console.log(`AI Intent: "${bestLabel}" (Score: ${result.scores[0].toFixed(2)})`);
                return this.commands[commandKey];
            }
        } catch (error) {
            console.error("AI Recognition Error:", error);
        }
        return null;
    }

    matchCommand(transcript) {
        // Direct match
        if (this.commands[transcript]) {
            return this.commands[transcript];
        }

        // Partial match
        for (const [phrase, command] of Object.entries(this.commands)) {
            if (transcript.includes(phrase)) {
                return command;
            }
        }

        return null;
    }

    handleError(event) {
        console.warn('Recognition error:', event.error);

        switch (event.error) {
            case 'no-speech':
                // Ignore, continue listening
                break;
            case 'audio-capture':
                this.onStatusChange?.('No microphone');
                break;
            case 'not-allowed':
                this.onStatusChange?.('Mic blocked');
                this.isListening = false;
                break;
            default:
                this.onStatusChange?.('Voice error');
        }
    }

    handleEnd() {
        // Restart if still supposed to be listening
        if (this.isListening) {
            try {
                this.recognition.start();
            } catch (e) {
                this.isListening = false;
                this.onStatusChange?.('Voice Off');
            }
        } else {
            this.onStatusChange?.('Voice Off');
        }
    }

    speak(text, onEnd = null) {
        if (!this.synthesis) return;

        // Cancel any current speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Use a good voice if available
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(v =>
            v.lang.startsWith('en') && v.name.includes('Google')
        ) || voices.find(v => v.lang.startsWith('en'));

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        if (onEnd) {
            utterance.onend = onEnd;
        }

        this.synthesis.speak(utterance);
    }

    explainModel(modelData) {
        if (!modelData) return;

        let text = `${modelData.name}. ${modelData.description}`;

        // Add part descriptions
        if (modelData.parts) {
            const partNames = Object.keys(modelData.parts).slice(0, 3);
            if (partNames.length > 0) {
                text += ` Key parts include: `;
                partNames.forEach((part, i) => {
                    text += `${part}: ${modelData.parts[part]}`;
                    if (i < partNames.length - 1) text += '. ';
                });
            }
        }

        this.speak(text);
    }

    getIsListening() {
        return this.isListening;
    }

    getIsSupported() {
        return this.isSupported;
    }
}

export default VoiceAssistant;
