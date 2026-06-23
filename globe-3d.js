/**
 * 3D Interactive Globe Component
 * Vanilla JavaScript implementation using Three.js
 */

class Globe3D {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      radius: 2,
      textureUrl: 'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
      bumpMapUrl: 'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png',
      showAtmosphere: true,
      atmosphereColor: '#4da6ff',
      atmosphereIntensity: 0.8,
      atmosphereBlur: 3,
      bumpScale: 5,
      autoRotateSpeed: 0.3,
      enableZoom: false,
      enablePan: false,
      minDistance: 5,
      maxDistance: 15,
      ambientIntensity: 0.6,
      pointLightIntensity: 1.5,
      backgroundColor: 'transparent',
      width: container.clientWidth || 800,
      height: container.clientHeight || 500,
      markers: [],
      ...options
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.globeGroup = null;
    this.markers = [];
    this.textureLoader = new THREE.TextureLoader();

    // Mouse controls
    this.isDragging = false;
    this.previousMousePosition = { x: 0, y: 0 };
    this.rotation = { x: 0, y: 0 };

    this.init();
  }

  init() {
    // Scene setup
    this.scene = new THREE.Scene();

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.options.width / this.options.height,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, this.options.radius * 3.5);
    this.camera.lookAt(0, 0, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.options.width, this.options.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, this.options.backgroundColor === 'transparent' ? 0 : 1);
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, this.options.ambientIntensity);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, this.options.pointLightIntensity);
    directionalLight1.position.set(
      this.options.radius * 5,
      this.options.radius * 2,
      this.options.radius * 5
    );
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x88ccff, this.options.pointLightIntensity * 0.3);
    directionalLight2.position.set(
      -this.options.radius * 3,
      this.options.radius,
      -this.options.radius * 2
    );
    this.scene.add(directionalLight2);

    // Create globe group
    this.globeGroup = new THREE.Group();
    this.scene.add(this.globeGroup);

    // Load and create globe
    this.createGlobe();

    // Add atmosphere
    if (this.options.showAtmosphere) {
      this.createAtmosphere();
    }

    // Create markers after a short delay to ensure textures are loaded
    if (this.options.markers && this.options.markers.length > 0) {
      setTimeout(() => {
        this.options.markers.forEach(marker => {
          this.createMarker(marker);
        });
      }, 500);
    }

    // Basic orbit controls (simplified version)
    this.setupControls();

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Start animation loop
    this.animate();
  }

  createGlobe() {
    // Load textures
    Promise.all([
      this.textureLoader.loadAsync(this.options.textureUrl),
      this.textureLoader.loadAsync(this.options.bumpMapUrl)
    ]).then(([earthTexture, bumpTexture]) => {
      earthTexture.colorSpace = THREE.SRGBColorSpace;
      earthTexture.anisotropy = 16;
      bumpTexture.anisotropy = 8;

      // Create sphere geometry
      const geometry = new THREE.SphereGeometry(this.options.radius, 64, 64);
      const material = new THREE.MeshStandardMaterial({
        map: earthTexture,
        bumpMap: bumpTexture,
        bumpScale: this.options.bumpScale * 0.05,
        roughness: 0.7,
        metalness: 0
      });

      const globeMesh = new THREE.Mesh(geometry, material);
      this.globeGroup.add(globeMesh);
    });
  }

  createAtmosphere() {
    const radius = this.options.radius;
    const atmosphereGeometry = new THREE.SphereGeometry(radius * 1.12, 64, 32);

    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        atmosphereColor: { value: new THREE.Color(this.options.atmosphereColor) },
        intensity: { value: this.options.atmosphereIntensity },
        fresnelPower: { value: Math.max(0.5, 5 - this.options.atmosphereBlur) }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 atmosphereColor;
        uniform float intensity;
        uniform float fresnelPower;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, normalize(-vPosition))), fresnelPower);
          gl_FragColor = vec4(atmosphereColor, fresnel * intensity);
        }
      `,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false
    });

    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    this.scene.add(atmosphereMesh);
  }

  setupControls() {
    const canvas = this.renderer.domElement;

    // Mouse down
    canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Mouse move
    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      // Update rotation based on mouse movement
      this.rotation.y += deltaX * 0.01;
      this.rotation.x += deltaY * 0.01;

      // Clamp X rotation to prevent over-rotation
      this.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation.x));

      // Apply rotation to globe group
      if (this.globeGroup) {
        this.globeGroup.rotation.order = 'YXZ';
        this.globeGroup.rotation.y = this.rotation.y;
        this.globeGroup.rotation.x = this.rotation.x;
      }

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    // Mouse up
    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Mouse leave canvas
    canvas.addEventListener('mouseleave', () => {
      this.isDragging = false;
    });

    // Wheel zoom
    if (this.options.enableZoom) {
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        const direction = e.deltaY > 0 ? 1 : -1;
        this.camera.position.z += direction * zoomSpeed * this.camera.position.z;
      });
    }
  }

  animate = () => {
    requestAnimationFrame(this.animate);

    // Auto-rotate when not dragging
    if (!this.isDragging && this.options.autoRotateSpeed > 0 && this.globeGroup) {
      this.rotation.y += this.options.autoRotateSpeed * 0.001;
      this.globeGroup.rotation.y = this.rotation.y;
    }

    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  addMarker(lat, lng, imageUrl, label) {
    const marker = {
      lat,
      lng,
      src: imageUrl,
      label
    };
    this.options.markers.push(marker);
    this.createMarker(marker);
  }

  createMarker(marker) {
    // Convert lat/lng to 3D position
    const phi = (90 - marker.lat) * (Math.PI / 180);
    const theta = (marker.lng + 180) * (Math.PI / 180);
    const radius = this.options.radius;

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    const surfacePosition = new THREE.Vector3(x, y, z).normalize().multiplyScalar(radius * 1.001);
    const topPosition = new THREE.Vector3(x, y, z).normalize().multiplyScalar(radius * 1.18);

    // Create marker group
    const markerGroup = new THREE.Group();

    // Create pin line
    const lineHeight = surfacePosition.distanceTo(topPosition);
    const lineCenter = surfacePosition.clone().lerp(topPosition, 0.5);

    const cylinderGeometry = new THREE.CylinderGeometry(0.003, 0.003, lineHeight, 8);
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 });
    const line = new THREE.Mesh(cylinderGeometry, lineMaterial);

    // Orient cylinder
    const direction = topPosition.clone().sub(surfacePosition).normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    line.position.copy(lineCenter);
    line.quaternion.copy(quaternion);
    markerGroup.add(line);

    // Create surface cone
    const coneGeometry = new THREE.ConeGeometry(0.015, 0.04, 8);
    const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
    cone.position.copy(surfacePosition);
    cone.quaternion.copy(quaternion);
    markerGroup.add(cone);

    // Create marker sprite (circle with image)
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Create circular canvas with border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();

    // Add subtle border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Load and draw image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, 4, 4, size - 8, size - 8);
      ctx.restore();

      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        sizeAttenuation: true
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(0.2, 0.2, 1);
      sprite.position.copy(topPosition);
      markerGroup.add(sprite);
    };
    img.src = marker.src;

    this.globeGroup.add(markerGroup);
    this.markers.push({ mesh: markerGroup, data: marker });
  }

  dispose() {
    if (this.renderer && this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
    this.renderer?.dispose();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Globe3D;
}
