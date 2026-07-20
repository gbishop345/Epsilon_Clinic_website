import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';

const canvas = document.getElementById('hero-dna');
const stage = document.getElementById('hero-dna-stage');
const hero = document.querySelector('.hero');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (canvas && stage && hero) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
    camera.position.set(0, 0, 8.4);

    const sculpture = new THREE.Group();
    sculpture.rotation.set(-0.06, -0.38, -0.24);
    scene.add(sculpture);

    const brass = new THREE.MeshPhysicalMaterial({
      color: 0xb8955a,
      roughness: 0.24,
      metalness: 0.18,
      clearcoat: 0.8,
      clearcoatRoughness: 0.2
    });

    const ivory = new THREE.MeshPhysicalMaterial({
      color: 0xf4ecdf,
      roughness: 0.3,
      metalness: 0.02,
      clearcoat: 0.65,
      clearcoatRoughness: 0.25
    });

    const warmPair = new THREE.MeshPhysicalMaterial({
      color: 0xd0b98f,
      roughness: 0.4,
      metalness: 0.04,
      transparent: true,
      opacity: 0.78
    });

    const palePair = new THREE.MeshPhysicalMaterial({
      color: 0xe7ded0,
      roughness: 0.4,
      metalness: 0.02,
      transparent: true,
      opacity: 0.72
    });

    const turns = 3.15;
    const helixHeight = 5.4;
    const helixRadius = 1.05;

    function helixPoint(progress, phase) {
      const angle = progress * Math.PI * 2 * turns + phase;
      return new THREE.Vector3(
        Math.cos(angle) * helixRadius,
        (progress - 0.5) * helixHeight,
        Math.sin(angle) * helixRadius
      );
    }

    function makeStrand(phase, material) {
      const points = [];
      for (let index = 0; index <= 180; index += 1) {
        points.push(helixPoint(index / 180, phase));
      }

      const curve = new THREE.CatmullRomCurve3(points);
      const geometry = new THREE.TubeGeometry(curve, 240, 0.075, 12, false);
      const strand = new THREE.Mesh(geometry, material);
      sculpture.add(strand);
    }

    makeStrand(0, brass);
    makeStrand(Math.PI, ivory);

    const unitY = new THREE.Vector3(0, 1, 0);
    const pairGeometry = new THREE.CylinderGeometry(0.022, 0.022, 1, 10);
    const nucleotideGeometry = new THREE.SphereGeometry(0.105, 18, 14);

    function connectPoints(start, end, material) {
      const direction = new THREE.Vector3().subVectors(end, start);
      const connector = new THREE.Mesh(pairGeometry, material);
      connector.position.copy(start).add(end).multiplyScalar(0.5);
      connector.quaternion.setFromUnitVectors(unitY, direction.clone().normalize());
      connector.scale.y = direction.length();
      sculpture.add(connector);
    }

    for (let index = 0; index < 26; index += 1) {
      const progress = 0.025 + (index / 25) * 0.95;
      const first = helixPoint(progress, 0);
      const second = helixPoint(progress, Math.PI);
      const pairMaterial = index % 2 === 0 ? warmPair : palePair;

      connectPoints(first, second, pairMaterial);

      const firstNode = new THREE.Mesh(
        nucleotideGeometry,
        index % 2 === 0 ? ivory : brass
      );
      firstNode.position.copy(first);
      sculpture.add(firstNode);

      const secondNode = new THREE.Mesh(
        nucleotideGeometry,
        index % 2 === 0 ? brass : ivory
      );
      secondNode.position.copy(second);
      sculpture.add(secondNode);
    }

    const warmLight = new THREE.PointLight(0xffe1b0, 34, 16, 1.8);
    warmLight.position.set(-3.2, 3.8, 5);
    scene.add(warmLight);

    const softLight = new THREE.PointLight(0xf8f3e9, 28, 14, 1.7);
    softLight.position.set(3.5, -2.2, 4);
    scene.add(softLight);

    const rimLight = new THREE.PointLight(0xc7b087, 24, 12, 1.8);
    rimLight.position.set(2.2, 3.6, -3);
    scene.add(rimLight);

    scene.add(new THREE.HemisphereLight(0xfffbf4, 0x6f5d47, 1.7));

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    const clock = new THREE.Clock();
    let frame = 0;
    let visible = true;

    function resize() {
      const width = Math.max(1, stage.clientWidth);
      const height = Math.max(1, stage.clientHeight);
      const pixelRatio = renderer.getPixelRatio();
      const targetWidth = Math.floor(width * pixelRatio);
      const targetHeight = Math.floor(height * pixelRatio);

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    }

    function update(time) {
      pointer.x += (target.x - pointer.x) * 0.035;
      pointer.y += (target.y - pointer.y) * 0.035;

      sculpture.rotation.y = -0.38 + time * 0.11 + pointer.x;
      sculpture.rotation.x = -0.06 + Math.sin(time * 0.32) * 0.035 + pointer.y;
      sculpture.rotation.z = -0.24 + Math.cos(time * 0.2) * 0.018;

      const breath = 1 + Math.sin(time * 0.5) * 0.012;
      sculpture.scale.setScalar(breath);
    }

    function render(time = reducedMotion ? 1.8 : clock.getElapsedTime()) {
      resize();
      update(time);
      renderer.render(scene, camera);
    }

    function loop() {
      if (!visible || document.hidden || reducedMotion) return;
      render();
      frame = requestAnimationFrame(loop);
    }

    function restartLoop() {
      cancelAnimationFrame(frame);
      if (visible && !document.hidden && !reducedMotion) {
        clock.getDelta();
        loop();
      }
    }

    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.32;
      target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.18;
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      target.x = 0;
      target.y = 0;
    });

    const resizeObserver = new ResizeObserver(() => render());
    resizeObserver.observe(stage);

    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = Boolean(entries[0] && entries[0].isIntersecting);
      if (visible) render();
      restartLoop();
    }, { rootMargin: '120px' });
    visibilityObserver.observe(hero);

    document.addEventListener('visibilitychange', restartLoop);

    render();
    stage.classList.add('is-ready');
    restartLoop();
  } catch (error) {
    console.warn('The DNA sculpture could not be initialized.', error);
  }
}
