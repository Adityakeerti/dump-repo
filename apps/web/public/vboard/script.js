import * as THREE from 'three';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const video = document.getElementById('webcam');
const canvas = document.getElementById('output_canvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status-text');
const gestureIndicator = document.getElementById('gesture-indicator');

// State
let handLandmarker = undefined;
let webcamRunning = false;
let drawingMode = false;
let lastPoint = null;
let currentColor = '#3b82f6';
let currentSize = 5;
let isEraser = false;
let currentGesture = 'none'; // 'point', 'pinch', 'open'

// 3D State
let scene, camera, renderer;
let activeModelGroup = new THREE.Group();
let isDragging3D = false;
let draggedObject = null;
let hand3DPos = new THREE.Vector3(); // Hand position mapped to 3D world

// Drawing History (for persistence)
let drawingCanvas = document.createElement('canvas');
let dCtx = drawingCanvas.getContext('2d');

// Initialize
async function init() {
    // Global Error Handling
    window.onerror = function (msg, source, lineno, colno, error) {
        document.getElementById('loading').innerHTML = `
            <div style="color:red; text-align:left; padding:20px;">
                <b>Runtime Error:</b><br>
                ${msg}<br>
                <small>${source}:${lineno}</small>
            </div>`;
    };
    window.addEventListener('unhandledrejection', function (event) {
        document.getElementById('loading').innerHTML = `
            <div style="color:red; text-align:left; padding:20px;">
                <b>Promise Rejection:</b><br>
                ${event.reason}
            </div>`;
    });

    // Setup 3D Scene
    initThreeJS();

    // Setup MediaPipe
    try {
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "VIDEO",
            numHands: 1
        });
        document.getElementById('loading').innerText = "Requesting Camera Access...";
        startWebcam();
    } catch (error) {
        console.error(error);
        document.getElementById('loading').innerHTML = `
            <div style="color:red">
                Error: ${error.message}<br>
                <span style="font-size:0.8rem; color:white">Check camera permissions in browser settings.</span>
            </div>`;
    }
}

function initThreeJS() {
    scene = new THREE.Scene();

    // Camera covers the screen
    const aspect = window.innerWidth / window.innerHeight;
    // Use Orthographic for easier 2D overlay alignment or Perspective?
    // Perspective looks better for models.
    camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100);
    camera.position.z = 10;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); // Alpha true is key!
    renderer.setSize(window.innerWidth, window.innerHeight);
    // We don't append renderer.domElement because we will draw it manually to the main canvas
    // to composite it with the video.

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    scene.add(activeModelGroup);
    loadModel('solar'); // Default
}

function startWebcam() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        document.getElementById('loading').innerHTML = "Browser API not supported.<br>Try Chrome or Edge.";
        return;
    }

    const constraints = {
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
        }
    };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        document.getElementById('loading').innerText = "Camera Started. Initializing AI...";
        video.addEventListener("loadeddata", () => {
            document.getElementById('loading').style.display = 'none';
            predictWebcam();
        });
    }).catch((err) => {
        console.error("Camera Error: ", err);
        document.getElementById('loading').innerHTML = `
            <div style="color:#ef4444; font-weight:bold;">
                Camera Access Denied<br>
                <span style="font-size:0.8rem; color:white; font-weight:normal;">
                    ${err.name}: ${err.message}<br>
                    Please allow camera access in the address bar.
                </span>
            </div>
        `;
    });
}

let lastVideoTime = -1;
async function predictWebcam() {
    // Resize logic
    if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        drawingCanvas.width = video.videoWidth;
        drawingCanvas.height = video.videoHeight;
        renderer.setSize(canvas.width, canvas.height);
        camera.aspect = canvas.width / canvas.height;
        camera.updateProjectionMatrix();
    }

    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        const startTimeMs = performance.now();

        // 1. Detect Hands
        if (handLandmarker) {
            const results = handLandmarker.detectForVideo(video, startTimeMs);

            // Clear main canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Video
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Process Hand
            if (results.landmarks && results.landmarks.length > 0) {
                const landmarks = results.landmarks[0];
                processHand(landmarks);
            } else {
                currentGesture = 'none';
                lastPoint = null;
                isDragging3D = false;
                updateStatus("No Hand Detected", "bg-gray-500");
            }
        }
    }

    // 2. Composite Drawing Layer
    ctx.drawImage(drawingCanvas, 0, 0);

    // 3. Render 3D Scene
    renderer.render(scene, camera);
    // Copy 3D canvas to Main Canvas
    ctx.drawImage(renderer.domElement, 0, 0);

    // Animate Models
    animateModels();

    window.requestAnimationFrame(predictWebcam);
}

function processHand(landmarks) {
    // Index Tip
    const idxTip = landmarks[8];
    const idxBase = landmarks[5]; // Knuckle
    const thumbTip = landmarks[4];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];

    // Convert normalized coordinates to pixel space
    // No longer mirrored, so we use x properly
    const x = idxTip.x * canvas.width;
    const y = idxTip.y * canvas.height;

    // Gesture Recognition
    // 1. Distance between Thumb and Index (Pinch)
    const pinchDist = Math.hypot(thumbTip.x - idxTip.x, thumbTip.y - idxTip.y);

    // 2. Are other fingers curled? (Simple check: Tip y > Base y is curled roughly, but Z axis matters. 
    // Better: Compare Tip to Wrist distance vs Base to Wrist, or just relative Y for simplicity)
    // Let's rely on basic Y comparison for open/closed palm.
    const isMiddleExtended = middleTip.y < landmarks[9].y; // Tip above knuckle
    const isRingExtended = ringTip.y < landmarks[13].y;

    // Classify
    let gesture = 'hover';

    if (pinchDist < 0.05) {
        gesture = 'pinch';
    } else if (!isMiddleExtended && !isRingExtended) {
        gesture = 'point';
    }

    currentGesture = gesture;

    // Draw Hand Cursor
    drawCursor(x, y, gesture);

    // Handle Actions
    if (gesture === 'point') {
        // Drawing
        updateStatus("Drawing", "bg-green-500");
        if (lastPoint) {
            dCtx.beginPath();
            dCtx.moveTo(lastPoint.x, lastPoint.y);
            dCtx.lineTo(x, y);
            dCtx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : currentColor;
            dCtx.lineWidth = currentSize;
            dCtx.lineCap = 'round';
            // If eraser, we use composite operation
            if (isEraser) dCtx.globalCompositeOperation = 'destination-out';
            else dCtx.globalCompositeOperation = 'source-over';

            dCtx.stroke();
        }
        lastPoint = { x, y };
        isDragging3D = false;
    } else if (gesture === 'pinch') {
        // Moving 3D
        updateStatus("Moving Object", "bg-yellow-500");
        lastPoint = null;

        // Map 2D mouse to 3D world z=0 plane or object plane
        // Simple projection: Map x/y to camera frustum
        // Without mirroring: x maps 0..1 to -1..1 directly? No, 0 is left, 1 is right.
        // NDC X: (x * 2) - 1
        const ndcX = (idxTip.x * 2) - 1; // -1 to 1
        const ndcY = -(idxTip.y * 2) + 1;      // -1 to 1

        const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
        vector.unproject(camera);
        const dir = vector.sub(camera.position).normalize();
        const distance = -camera.position.z / dir.z; // Intersection with Z=0 plane
        const pos = camera.position.clone().add(dir.multiplyScalar(distance));

        // If starting pinch, check intersection
        if (!isDragging3D) {
            // Check distance to active model
            if (activeModelGroup.children.length > 0) {
                const modelPos = activeModelGroup.position;
                const dist = pos.distanceTo(modelPos);
                if (dist < 3) { // Threshold
                    isDragging3D = true;
                }
            }
        }

        if (isDragging3D) {
            // Smooth lerp
            activeModelGroup.position.lerp(pos, 0.2);
        }

    } else {
        updateStatus("Hovering", "bg-blue-400");
        lastPoint = null;
        isDragging3D = false;
    }
}

function drawCursor(x, y, gesture) {
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, 2 * Math.PI);
    ctx.lineWidth = 3;
    if (gesture === 'point') {
        ctx.fillStyle = currentColor;
        ctx.strokeStyle = 'white';
        ctx.fill();
    } else if (gesture === 'pinch') {
        ctx.fillStyle = 'yellow';
        ctx.strokeStyle = 'white';
        ctx.fill();
    } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    }
    ctx.stroke();
}

function updateStatus(text, colorClass) {
    statusText.innerText = text;
    gestureIndicator.className = `w-3 h-3 rounded-full ${colorClass}`;
}

// --- 3D Model Logic ---
// Using Primitives to simulate diagrams since we cannot load external GLBs easily in this snippet

window.loadModel = function (type) {
    // Cleanup
    while (activeModelGroup.children.length > 0) {
        activeModelGroup.remove(activeModelGroup.children[0]);
    }
    activeModelGroup.rotation.set(0, 0, 0);
    activeModelGroup.position.set(0, 0, 0); // Reset position

    // Update UI
    document.querySelectorAll('.model-btn').forEach(b => b.classList.remove('active'));
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }

    if (type === 'solar') createSolarSystem();
    if (type === 'heart') createHeart();
    if (type === 'eye') createEye();
    if (type === 'physics') createReflection();
}

function createSolarSystem() {
    // Sun
    const sunGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const sunMat = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffaa00 });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    activeModelGroup.add(sun);

    // Earth
    const earthGroup = new THREE.Group();
    const earthGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({ color: 0x2233ff });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    earth.position.x = 3.5;
    earthGroup.add(earth);

    // Moon
    const moonGeo = new THREE.SphereGeometry(0.15, 16, 16);
    const moonMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const moon = new THREE.Mesh(moonGeo, moonMat);
    moon.position.x = 0.8;
    earth.add(moon); // Moon child of Earth

    activeModelGroup.add(earthGroup);
    activeModelGroup.userData = { type: 'solar', earthGroup: earthGroup, earth: earth };
}

function createHeart() {
    const x = 0, y = 0;
    const heartShape = new THREE.Shape();
    heartShape.moveTo(x + 5, y + 5);
    heartShape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
    heartShape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
    heartShape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
    heartShape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
    heartShape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
    heartShape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);

    const geometry = new THREE.ExtrudeGeometry(heartShape, { depth: 2, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 });
    const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(0.15, -0.15, 0.15); // Flip and scale
    mesh.position.y = 1;
    activeModelGroup.add(mesh);

    // Arteries (simple tubes)
    const tubeGeo = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
    const tubeMat = new THREE.MeshPhongMaterial({ color: 0x0000ff });
    const aorta = new THREE.Mesh(tubeGeo, tubeMat);
    aorta.position.set(0.5, 1.5, 0);
    activeModelGroup.add(aorta);

    activeModelGroup.userData = { type: 'heart' };
}

function createEye() {
    // Sclera
    const eyeGeo = new THREE.SphereGeometry(1.5, 32, 32);
    const eyeMat = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);

    // Iris
    const irisGeo = new THREE.CircleGeometry(0.6, 32);
    const irisMat = new THREE.MeshBasicMaterial({ color: 0x4B3621 }); // Brown
    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.z = 1.45;

    // Pupil
    const pupilGeo = new THREE.CircleGeometry(0.25, 32);
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.z = 1.46;

    eye.add(iris);
    eye.add(pupil);
    activeModelGroup.add(eye);
    activeModelGroup.userData = { type: 'eye' };
}

function createReflection() {
    // Mirror
    const mirrorGeo = new THREE.BoxGeometry(4, 3, 0.1);
    const mirrorMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, shininess: 100, opacity: 0.8, transparent: true });
    const mirror = new THREE.Mesh(mirrorGeo, mirrorMat);
    activeModelGroup.add(mirror);

    // Incident Ray
    const points = [];
    points.push(new THREE.Vector3(-3, 3, 2));
    points.push(new THREE.Vector3(0, 0, 0));
    points.push(new THREE.Vector3(3, 3, 2));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 3 });
    const rays = new THREE.Line(lineGeo, lineMat);
    activeModelGroup.add(rays);

    activeModelGroup.userData = { type: 'physics' };
}

function animateModels() {
    const time = Date.now() * 0.001;

    // Always rotate the whole group slightly if not dragging
    if (!isDragging3D && activeModelGroup.userData.type !== 'physics') {
        activeModelGroup.rotation.y += 0.005;
    }

    if (activeModelGroup.userData.type === 'solar') {
        activeModelGroup.userData.earthGroup.rotation.y = time; // Orbit
        activeModelGroup.userData.earth.rotation.y = time * 2;  // Rotate
    }

    if (activeModelGroup.userData.type === 'heart') {
        // Beat
        const scale = 0.15 + Math.sin(time * 8) * 0.005;
        activeModelGroup.children[0].scale.set(scale, -scale, scale);
    }
}

// --- Tools ---
window.setTool = function (type, val) {
    if (type === 'color') {
        isEraser = false;
        currentColor = val;
        // UI update
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        if (window.event && window.event.target) {
            window.event.target.classList.add('active');
        }
    } else if (type === 'size') {
        currentSize = val;
    } else if (type === 'eraser') {
        isEraser = true;
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        if (window.event && window.event.currentTarget) {
            window.event.currentTarget.classList.add('active');
        }
    }
}

window.clearCanvas = function () {
    dCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
}

// Start
init();
