/**
 * Whiteboard Module
 * Handles canvas drawing with gesture-based input
 */

class Whiteboard {
    constructor(overlayCanvas) {
        this.overlayCanvas = overlayCanvas;
        this.overlayCtx = overlayCanvas.getContext('2d');

        // Create persistent drawing canvas
        this.drawingCanvas = document.createElement('canvas');
        this.drawingCtx = this.drawingCanvas.getContext('2d');

        // Drawing state
        this.isDrawing = false;
        this.lastPoint = null;
        this.currentColor = '#3b82f6';
        this.currentSize = 5;
        this.isEraser = false;

        // Shape mode
        this.currentMode = 'pen'; // 'pen', 'circle', 'rectangle', 'square', 'oval', 'star', 'triangle'
        this.fillShape = false;
        this.shapeStartPoint = null;

        // History for undo/redo
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.currentStroke = [];

        // Smooth drawing
        this.points = [];
    }

    resize(width, height) {
        // Save current drawing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.drawingCanvas.width;
        tempCanvas.height = this.drawingCanvas.height;
        tempCanvas.getContext('2d').drawImage(this.drawingCanvas, 0, 0);

        // Resize
        this.drawingCanvas.width = width;
        this.drawingCanvas.height = height;

        // Restore drawing
        if (tempCanvas.width > 0 && tempCanvas.height > 0) {
            this.drawingCtx.drawImage(tempCanvas, 0, 0, width, height);
        }
    }

    setColor(color) {
        this.currentColor = color;
        this.isEraser = false;
    }

    setSize(size) {
        this.currentSize = parseInt(size);
    }

    setEraser(enabled) {
        this.isEraser = enabled;
    }

    startDrawing(x, y) {
        this.isDrawing = true;
        this.lastPoint = { x, y };
        this.currentStroke = [{ x, y, color: this.currentColor, size: this.currentSize, eraser: this.isEraser }];
        this.points = [{ x, y }];
    }

    draw(x, y) {
        if (!this.isDrawing) {
            // Auto-start drawing if we receive draw calls
            this.startDrawing(x, y);
            return;
        }

        if (!this.lastPoint) {
            this.lastPoint = { x, y };
            return;
        }

        // Calculate distance from last point
        const dx = x - this.lastPoint.x;
        const dy = y - this.lastPoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Interpolate points if there's a gap (for continuous lines)
        const maxGap = this.currentSize * 2;
        if (distance > maxGap) {
            const steps = Math.ceil(distance / maxGap);
            for (let i = 1; i <= steps; i++) {
                const t = i / steps;
                const interpX = this.lastPoint.x + dx * t;
                const interpY = this.lastPoint.y + dy * t;
                this.drawSegment(this.lastPoint.x + dx * ((i - 1) / steps),
                    this.lastPoint.y + dy * ((i - 1) / steps),
                    interpX, interpY);
            }
        } else {
            this.drawSegment(this.lastPoint.x, this.lastPoint.y, x, y);
        }

        // Add point for smoothing
        this.points.push({ x, y });

        // Store for history
        this.currentStroke.push({ x, y });
        this.lastPoint = { x, y };
    }

    drawSegment(x1, y1, x2, y2) {
        this.drawingCtx.beginPath();
        this.drawingCtx.moveTo(x1, y1);
        this.drawingCtx.lineTo(x2, y2);

        if (this.isEraser) {
            this.drawingCtx.globalCompositeOperation = 'destination-out';
            this.drawingCtx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.drawingCtx.globalCompositeOperation = 'source-over';
            this.drawingCtx.strokeStyle = this.currentColor;
        }

        this.drawingCtx.lineWidth = this.currentSize;
        this.drawingCtx.lineCap = 'round';
        this.drawingCtx.lineJoin = 'round';
        this.drawingCtx.stroke();
    }

    stopDrawing() {
        if (this.isDrawing && this.currentStroke.length > 1) {
            // Save to history
            this.saveToHistory();
        }
        this.isDrawing = false;
        this.lastPoint = null;
        this.points = [];
        this.currentStroke = [];
        this.drawingCtx.globalCompositeOperation = 'source-over';
    }

    saveToHistory() {
        // Remove future states if we're in middle of history
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Save canvas state
        const imageData = this.drawingCtx.getImageData(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.history.push(imageData);

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            const imageData = this.history[this.historyIndex];
            this.drawingCtx.putImageData(imageData, 0, 0);
            return true;
        } else if (this.historyIndex === 0) {
            // Clear to initial state
            this.historyIndex = -1;
            this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
            return true;
        }
        return false;
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const imageData = this.history[this.historyIndex];
            this.drawingCtx.putImageData(imageData, 0, 0);
            return true;
        }
        return false;
    }

    clear() {
        // Save state before clearing
        if (this.drawingCanvas.width > 0) {
            this.saveToHistory();
        }
        this.drawingCtx.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.saveToHistory();
    }

    saveAsImage() {
        // Composite video frame + drawing
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.overlayCanvas.width;
        exportCanvas.height = this.overlayCanvas.height;
        const exportCtx = exportCanvas.getContext('2d');

        // Copy main canvas content
        exportCtx.drawImage(this.overlayCanvas, 0, 0);

        // Create download link
        const link = document.createElement('a');
        link.download = `whiteboard-${Date.now()}.png`;
        link.href = exportCanvas.toDataURL('image/png');
        link.click();
    }

    getDrawingCanvas() {
        return this.drawingCanvas;
    }

    // Shape mode setters
    setMode(mode) {
        this.currentMode = mode;
        this.isEraser = false;
    }

    setFillShape(fill) {
        this.fillShape = fill;
    }

    // Shape drawing - start tracking
    startShape(x, y) {
        if (this.currentMode === 'pen') {
            this.startDrawing(x, y);
            return;
        }
        // Save canvas state before starting shape (for preview restoration)
        this.shapeStartPoint = { x, y };
        this.shapeEndPoint = { x, y };
        this.shapeCanvasBackup = this.drawingCtx.getImageData(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        this.isDrawing = true;
    }

    // Shape drawing - update endpoint only (no drawing yet)
    drawShape(x, y) {
        if (this.currentMode === 'pen') {
            this.draw(x, y);
            return;
        }

        if (!this.shapeStartPoint) return;

        // Just update the endpoint - actual drawing happens in finishShape
        this.shapeEndPoint = { x, y };
    }

    // Get preview canvas with shape overlay (for visual feedback without committing)
    getShapePreview(overlayCtx) {
        if (this.currentMode === 'pen' || !this.shapeStartPoint || !this.shapeEndPoint) {
            return;
        }

        const startX = this.shapeStartPoint.x;
        const startY = this.shapeStartPoint.y;
        const endX = this.shapeEndPoint.x;
        const endY = this.shapeEndPoint.y;
        const width = endX - startX;
        const height = endY - startY;

        overlayCtx.save();
        overlayCtx.strokeStyle = this.currentColor;
        overlayCtx.fillStyle = this.fillShape ? this.currentColor : 'transparent';
        overlayCtx.lineWidth = this.currentSize;
        overlayCtx.lineCap = 'round';
        overlayCtx.lineJoin = 'round';
        overlayCtx.setLineDash([5, 5]); // Dashed line for preview

        overlayCtx.beginPath();

        switch (this.currentMode) {
            case 'circle':
                const radius = Math.sqrt(width * width + height * height);
                overlayCtx.arc(startX, startY, Math.max(1, radius), 0, Math.PI * 2);
                break;

            case 'oval':
                overlayCtx.ellipse(startX, startY, Math.max(1, Math.abs(width)), Math.max(1, Math.abs(height)), 0, 0, Math.PI * 2);
                break;

            case 'rectangle':
                overlayCtx.rect(startX, startY, width, height);
                break;

            case 'square':
                const side = Math.max(Math.abs(width), Math.abs(height));
                const sx = width >= 0 ? startX : startX - side;
                const sy = height >= 0 ? startY : startY - side;
                overlayCtx.rect(sx, sy, side, side);
                break;

            case 'triangle':
                overlayCtx.moveTo(startX + width / 2, startY);
                overlayCtx.lineTo(startX + width, startY + height);
                overlayCtx.lineTo(startX, startY + height);
                overlayCtx.closePath();
                break;

            case 'star':
                this.drawStarPath(overlayCtx, startX, startY, 5, Math.max(10, Math.abs(width)), Math.max(5, Math.abs(width) / 2));
                break;
        }

        if (this.fillShape) {
            overlayCtx.globalAlpha = 0.5;
            overlayCtx.fill();
            overlayCtx.globalAlpha = 1;
        }
        overlayCtx.stroke();
        overlayCtx.restore();
    }

    drawStarPath(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
    }

    finishShape() {
        if (this.currentMode === 'pen') {
            this.stopDrawing();
            return;
        }

        if (!this.shapeStartPoint || !this.shapeEndPoint) {
            this.shapeStartPoint = null;
            this.shapeEndPoint = null;
            this.isDrawing = false;
            return;
        }

        // Now draw the final shape on the drawing canvas
        const ctx = this.drawingCtx;
        const startX = this.shapeStartPoint.x;
        const startY = this.shapeStartPoint.y;
        const endX = this.shapeEndPoint.x;
        const endY = this.shapeEndPoint.y;
        const width = endX - startX;
        const height = endY - startY;

        // Skip if too small (accidental tap)
        if (Math.abs(width) < 5 && Math.abs(height) < 5) {
            this.shapeStartPoint = null;
            this.shapeEndPoint = null;
            this.shapeCanvasBackup = null;
            this.isDrawing = false;
            return;
        }

        ctx.save();
        ctx.strokeStyle = this.currentColor;
        ctx.fillStyle = this.currentColor;
        ctx.lineWidth = this.currentSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        switch (this.currentMode) {
            case 'circle':
                const radius = Math.sqrt(width * width + height * height);
                ctx.arc(startX, startY, Math.max(1, radius), 0, Math.PI * 2);
                break;

            case 'oval':
                ctx.ellipse(startX, startY, Math.max(1, Math.abs(width)), Math.max(1, Math.abs(height)), 0, 0, Math.PI * 2);
                break;

            case 'rectangle':
                ctx.rect(startX, startY, width, height);
                break;

            case 'square':
                const side = Math.max(Math.abs(width), Math.abs(height));
                const sx = width >= 0 ? startX : startX - side;
                const sy = height >= 0 ? startY : startY - side;
                ctx.rect(sx, sy, side, side);
                break;

            case 'triangle':
                ctx.moveTo(startX + width / 2, startY);
                ctx.lineTo(startX + width, startY + height);
                ctx.lineTo(startX, startY + height);
                ctx.closePath();
                break;

            case 'star':
                this.drawStarPath(ctx, startX, startY, 5, Math.max(10, Math.abs(width)), Math.max(5, Math.abs(width) / 2));
                break;
        }

        if (this.fillShape) {
            ctx.fill();
        }
        ctx.stroke();
        ctx.restore();

        // Save to history
        this.saveToHistory();

        // Reset
        this.shapeStartPoint = null;
        this.shapeEndPoint = null;
        this.shapeCanvasBackup = null;
        this.isDrawing = false;
    }

    drawCursor(ctx, x, y, gesture, color) {
        ctx.save();

        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);

        switch (gesture) {
            case 'point':
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
            case 'peace':
                ctx.fillStyle = 'rgba(0, 212, 255, 0.6)';
                ctx.fill();
                ctx.strokeStyle = '#00d4ff';
                ctx.lineWidth = 2;
                ctx.stroke();
                // Rotation indicator
                ctx.beginPath();
                ctx.arc(x, y, 20, 0, Math.PI * 1.5);
                ctx.strokeStyle = '#00d4ff';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
            case 'pinch':
                ctx.strokeStyle = '#facc15';
                ctx.lineWidth = 3;
                ctx.stroke();
                // Zoom indicator
                ctx.beginPath();
                ctx.arc(x, y, 18, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(250, 204, 21, 0.5)';
                ctx.stroke();
                break;
            case 'fist':
                ctx.fillStyle = 'rgba(255, 0, 170, 0.6)';
                ctx.fill();
                ctx.strokeStyle = '#ff00aa';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
            case 'palm':
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
                break;
            default:
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
        }

        ctx.restore();
    }
}

export default Whiteboard;
