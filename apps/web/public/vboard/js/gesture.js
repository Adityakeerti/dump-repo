/**
 * Gesture Recognition Module
 * Uses MediaPipe Hands to detect hand landmarks and classify gestures
 */

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Gesture types
export const GESTURES = {
    NONE: 'none',
    POINT: 'point',      // Index finger up - Draw
    PEACE: 'peace',      // Index + Middle up - Rotate
    PINCH: 'pinch',      // Thumb + Index close - Zoom
    FIST: 'fist',        // All fingers closed - Move
    PALM: 'palm'         // All fingers open - Stop
};

// Landmark indices
const LANDMARKS = {
    WRIST: 0,
    THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
    INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
    MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
    RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
    PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20
};

class GestureRecognizer {
    constructor() {
        this.handLandmarker = null;
        this.isInitialized = false;
        this.currentGesture = GESTURES.NONE;
        this.previousGesture = GESTURES.NONE;
        this.gestureStability = 0;
        this.stabilityThreshold = 2; // Reduced for faster response
        this.drawingStabilityThreshold = 5; // Higher threshold to exit drawing

        // Smoothing - increased for smoother tracking
        this.smoothedLandmarks = null;
        this.smoothingFactor = 0.6; // More smoothing = less jitter

        // Pinch tracking
        this.pinchStartDistance = 0;
        this.lastPinchDistance = 0;

        // Position tracking
        this.handPosition = { x: 0.5, y: 0.5 };
        this.indexTipPosition = { x: 0.5, y: 0.5 };
    }

    async initialize(onStatusUpdate) {
        try {
            onStatusUpdate?.('Loading AI model...');

            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
            );

            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                    delegate: 'GPU'
                },
                runningMode: 'VIDEO',
                numHands: 1,
                minHandDetectionConfidence: 0.5,
                minHandPresenceConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.isInitialized = true;
            onStatusUpdate?.('AI Vision ready');
            return true;
        } catch (error) {
            console.error('Gesture init error:', error);
            onStatusUpdate?.(`Error: ${error.message}`);
            return false;
        }
    }

    detectHands(video, timestamp) {
        if (!this.isInitialized || !this.handLandmarker) {
            return null;
        }

        try {
            const results = this.handLandmarker.detectForVideo(video, timestamp);

            if (results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];
                this.smoothLandmarks(landmarks);
                this.recognizeGesture(this.smoothedLandmarks);
                this.updatePositions(this.smoothedLandmarks);

                return {
                    landmarks: this.smoothedLandmarks,
                    gesture: this.currentGesture,
                    handPosition: this.handPosition,
                    indexTipPosition: this.indexTipPosition,
                    pinchDistance: this.lastPinchDistance
                };
            }
        } catch (error) {
            console.warn('Detection error:', error);
        }

        this.currentGesture = GESTURES.NONE;
        return null;
    }

    smoothLandmarks(landmarks) {
        if (!this.smoothedLandmarks) {
            this.smoothedLandmarks = landmarks.map(l => ({ ...l }));
            return;
        }

        for (let i = 0; i < landmarks.length; i++) {
            this.smoothedLandmarks[i].x += (landmarks[i].x - this.smoothedLandmarks[i].x) * this.smoothingFactor;
            this.smoothedLandmarks[i].y += (landmarks[i].y - this.smoothedLandmarks[i].y) * this.smoothingFactor;
            this.smoothedLandmarks[i].z += (landmarks[i].z - this.smoothedLandmarks[i].z) * this.smoothingFactor;
        }
    }

    updatePositions(landmarks) {
        // Hand center (wrist)
        this.handPosition = {
            x: landmarks[LANDMARKS.WRIST].x,
            y: landmarks[LANDMARKS.WRIST].y
        };

        // Index finger tip
        this.indexTipPosition = {
            x: landmarks[LANDMARKS.INDEX_TIP].x,
            y: landmarks[LANDMARKS.INDEX_TIP].y
        };
    }

    recognizeGesture(landmarks) {
        const gesture = this.classifyGesture(landmarks);

        // Stability check for gesture transitions
        if (gesture === this.previousGesture) {
            this.gestureStability++;
        } else {
            this.gestureStability = 0;
            this.previousGesture = gesture;
        }

        // Use higher threshold when currently drawing to avoid breaking strokes
        const threshold = (this.currentGesture === GESTURES.POINT && gesture !== GESTURES.POINT)
            ? this.drawingStabilityThreshold
            : this.stabilityThreshold;

        if (this.gestureStability >= threshold) {
            this.currentGesture = gesture;
        }
    }

    classifyGesture(landmarks) {
        const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
        const indexTip = landmarks[LANDMARKS.INDEX_TIP];
        const middleTip = landmarks[LANDMARKS.MIDDLE_TIP];
        const ringTip = landmarks[LANDMARKS.RING_TIP];
        const pinkyTip = landmarks[LANDMARKS.PINKY_TIP];

        const indexPIP = landmarks[LANDMARKS.INDEX_PIP];
        const middlePIP = landmarks[LANDMARKS.MIDDLE_PIP];
        const ringPIP = landmarks[LANDMARKS.RING_PIP];
        const pinkyPIP = landmarks[LANDMARKS.PINKY_PIP];

        const indexMCP = landmarks[LANDMARKS.INDEX_MCP];
        const wrist = landmarks[LANDMARKS.WRIST];

        // Calculate finger states
        const isIndexExtended = indexTip.y < indexPIP.y;
        const isMiddleExtended = middleTip.y < middlePIP.y;
        const isRingExtended = ringTip.y < ringPIP.y;
        const isPinkyExtended = pinkyTip.y < pinkyPIP.y;

        // Thumb extension (horizontal check)
        const isThumbExtended = Math.abs(thumbTip.x - indexMCP.x) > 0.08;

        // Pinch detection
        const pinchDistance = this.distance(thumbTip, indexTip);
        this.lastPinchDistance = pinchDistance;

        // Count extended fingers
        const extendedCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended]
            .filter(Boolean).length;

        // Gesture classification

        // PINCH: Thumb and index close together
        if (pinchDistance < 0.05) {
            return GESTURES.PINCH;
        }

        // PALM: All fingers extended
        if (extendedCount >= 4 && isThumbExtended) {
            return GESTURES.PALM;
        }

        // FIST: All fingers curled
        if (extendedCount === 0) {
            return GESTURES.FIST;
        }

        // PEACE: Index and middle extended, others curled
        if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
            return GESTURES.PEACE;
        }

        // POINT: Only index extended
        if (isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
            return GESTURES.POINT;
        }

        return GESTURES.PALM; // Default to stop
    }

    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p1.x - p2.x, 2) +
            Math.pow(p1.y - p2.y, 2) +
            Math.pow(p1.z - p2.z, 2)
        );
    }

    getGestureLabel(gesture) {
        const labels = {
            [GESTURES.NONE]: 'No Hand',
            [GESTURES.POINT]: '☝️ Drawing',
            [GESTURES.PEACE]: '✌️ Rotating',
            [GESTURES.PINCH]: '🤏 Zooming',
            [GESTURES.FIST]: '✊ Moving',
            [GESTURES.PALM]: '🖐️ Stopped'
        };
        return labels[gesture] || 'Unknown';
    }
}

export default GestureRecognizer;
