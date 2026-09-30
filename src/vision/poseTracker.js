/* =========================================================
   POSE RUNNER - MediaPipe Pose Tracker & Webcam Controller
   ========================================================= */

export class PoseTracker {
  constructor() {
    this.videoElement = document.getElementById('webcam-raw');
    this.pose = null;
    this.camera = null;
    this.isTracking = false;
    this.listeners = [];
    this.errorListeners = [];
    this.fps = 0;
    this.frameCount = 0;
    this.lastFpsUpdateTime = performance.now();
    this.isInitialized = false;
  }

  onLandmarks(callback) {
    this.listeners.push(callback);
  }

  onError(callback) {
    this.errorListeners.push(callback);
  }

  notifyError(err) {
    console.error('PoseTracker Error:', err);
    this.errorListeners.forEach(cb => cb(err));
  }

  async init() {
    if (this.isInitialized) return true;

    // 1. Check MediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.notifyError(new Error('Browser does not support camera access (MediaDevices API missing).'));
      return false;
    }

    // 2. Ensure Pose constructor is loaded
    await this.ensureMediaPipeLoaded();

    try {
      // 3. Initialize MediaPipe Pose
      const PoseClass = window.Pose || (window.MediaPipe && window.MediaPipe.Pose);
      if (!PoseClass) {
        throw new Error('MediaPipe Pose library could not be loaded.');
      }

      this.pose = new PoseClass({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      this.pose.setOptions({
        modelComplexity: 1, // 1 is standard/accurate for desktop webcams
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.pose.onResults((results) => {
        this.computeFps();
        const landmarks = results.poseLandmarks || null;
        this.listeners.forEach(cb => cb(landmarks, results));
      });

      this.isInitialized = true;
      return true;
    } catch (err) {
      this.notifyError(err);
      return false;
    }
  }

  async ensureMediaPipeLoaded() {
    if (window.Pose) return;

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        attempts++;
        if (window.Pose) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts > 30) { // 3 seconds timeout
          clearInterval(checkInterval);
          // Try dynamic fallback script injection
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js';
          script.crossOrigin = 'anonymous';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load MediaPipe Pose script.'));
          document.head.appendChild(script);
        }
      }, 100);
    });
  }

  async start() {
    if (!this.isInitialized) {
      const ok = await this.init();
      if (!ok) return false;
    }

    try {
      // Request webcam stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false
      });

      this.videoElement.srcObject = stream;
      await new Promise((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      this.isTracking = true;

      // Start inference processing loop
      if (window.Camera) {
        this.camera = new window.Camera(this.videoElement, {
          onFrame: async () => {
            if (this.isTracking && this.pose) {
              await this.pose.send({ image: this.videoElement });
            }
          },
          width: 640,
          height: 480
        });
        await this.camera.start();
      } else {
        // Fallback custom animation frame loop
        const processFrame = async () => {
          if (!this.isTracking) return;
          if (this.videoElement.readyState >= 2 && this.pose) {
            try {
              await this.pose.send({ image: this.videoElement });
            } catch (e) {
              // Frame dropped, proceed
            }
          }
          requestAnimationFrame(processFrame);
        };
        requestAnimationFrame(processFrame);
      }

      return true;
    } catch (err) {
      this.notifyError(err);
      return false;
    }
  }

  stop() {
    this.isTracking = false;
    if (this.camera) {
      try { this.camera.stop(); } catch (e) {}
    }
    if (this.videoElement && this.videoElement.srcObject) {
      const tracks = this.videoElement.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.videoElement.srcObject = null;
    }
  }

  computeFps() {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsUpdateTime;
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsUpdateTime = now;
      const fpsEl = document.getElementById('cv-fps');
      if (fpsEl) fpsEl.textContent = this.fps;
    }
  }
}
