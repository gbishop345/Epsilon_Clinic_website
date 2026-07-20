const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function createRuntime(THREE, canvas, setupScene) {
  const host = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  const runtime = setupScene({ THREE, scene, camera, renderer, host });
  const clock = new THREE.Clock();
  let active = true;
  let frame = 0;

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    const pixelRatio = renderer.getPixelRatio();
    const targetWidth = Math.floor(width * pixelRatio);
    const targetHeight = Math.floor(height * pixelRatio);

    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
  }

  function render() {
    resize();
    runtime.update(reducedMotion ? 0 : clock.getElapsedTime());
    renderer.render(scene, camera);
  }

  function loop() {
    if (!active) return;
    render();
    frame = requestAnimationFrame(loop);
  }

  const resizeObserver = new ResizeObserver(render);
  resizeObserver.observe(host);

  const visibilityObserver = new IntersectionObserver((entries) => {
    const visible = entries[0] && entries[0].isIntersecting;
    if (reducedMotion) {
      if (visible) render();
      return;
    }
    active = visible;
    cancelAnimationFrame(frame);
    if (active) {
      clock.getDelta();
      loop();
    }
  }, { rootMargin: '150px' });

  visibilityObserver.observe(host);

  if (reducedMotion) {
    render();
  } else {
    loop();
  }

  return { render };
}

function addStudioLights(THREE, scene, options = {}) {
  const warm = new THREE.PointLight(0xe5c89f, options.warmPower || 34, 14, 1.7);
  warm.position.set(-3.6, 3.2, 4.5);
  scene.add(warm);

  const blue = new THREE.PointLight(0x7ea9c2, options.bluePower || 30, 13, 1.8);
  blue.position.set(3.5, -1.5, 4);
  scene.add(blue);

  const rim = new THREE.PointLight(0xf8f5ef, options.rimPower || 24, 12, 1.6);
  rim.position.set(0, 3.8, -3);
  scene.add(rim);

  scene.add(new THREE.HemisphereLight(0xe8f1f5, 0x171c1c, 1.45));
}

function setupHero({ THREE, scene, camera, host }) {
  camera.position.set(0, 0.1, 6.4);
  addStudioLights(THREE, scene, { warmPower: 38, bluePower: 34 });

  const sculpture = new THREE.Group();
  sculpture.rotation.set(0.25, -0.35, -0.08);
  scene.add(sculpture);

  const ceramic = new THREE.MeshPhysicalMaterial({
    color: 0xbda47f,
    roughness: 0.22,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    transmission: 0.08,
    thickness: 1.2,
    iridescence: 0.22,
    iridescenceIOR: 1.3
  });

  const knot = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.28, 0.34, 240, 32, 2, 3),
    ceramic
  );
  knot.castShadow = true;
  sculpture.add(knot);

  const dataMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x7ea9c2,
    emissive: 0x244657,
    emissiveIntensity: 0.3,
    roughness: 0.16,
    metalness: 0.1,
    clearcoat: 1,
    transparent: true,
    opacity: 0.86
  });

  const dataRibbon = new THREE.Mesh(
    new THREE.TorusKnotGeometry(1.58, 0.018, 280, 10, 2, 3),
    dataMaterial
  );
  sculpture.add(dataRibbon);

  const orbitMaterial = new THREE.MeshBasicMaterial({
    color: 0xc7dbe6,
    transparent: true,
    opacity: 0.34
  });

  const orbitA = new THREE.Mesh(new THREE.TorusGeometry(2.04, 0.008, 8, 190), orbitMaterial);
  orbitA.rotation.set(1.18, 0.35, 0.18);
  sculpture.add(orbitA);

  const orbitB = new THREE.Mesh(new THREE.TorusGeometry(2.32, 0.006, 8, 190), orbitMaterial.clone());
  orbitB.material.opacity = 0.18;
  orbitB.rotation.set(0.72, -0.5, -0.35);
  sculpture.add(orbitB);

  const satelliteMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe7d8c1,
    roughness: 0.18,
    clearcoat: 1,
    emissive: 0x5d4c37,
    emissiveIntensity: 0.08
  });

  const satellites = [
    [2.0, 0.65, 0.2, 0.09],
    [-1.75, -1.1, 0.5, 0.075],
    [0.55, 2.02, -0.4, 0.06]
  ].map(([x, y, z, radius]) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 18),
      satelliteMaterial
    );
    mesh.position.set(x, y, z);
    sculpture.add(mesh);
    return mesh;
  });

  const particleCount = 130;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const radius = 2.2 + Math.random() * 1.4;
    const angle = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 4.8;
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.38;
  }

  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(
    particlesGeometry,
    new THREE.PointsMaterial({
      color: 0xb6d1df,
      size: 0.018,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    })
  );
  scene.add(particles);

  const pointer = { x: 0, y: 0 };
  const target = { x: 0, y: 0 };
  let scrollFactor = 0;

  host.addEventListener('pointermove', (event) => {
    const rect = host.getBoundingClientRect();
    target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.5;
    target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.35;
  }, { passive: true });

  host.addEventListener('pointerleave', () => {
    target.x = 0;
    target.y = 0;
  });

  window.addEventListener('scroll', () => {
    const rect = host.getBoundingClientRect();
    scrollFactor = Math.max(-1, Math.min(1, -rect.top / Math.max(rect.height, 1)));
  }, { passive: true });

  return {
    update(time) {
      pointer.x += (target.x - pointer.x) * 0.035;
      pointer.y += (target.y - pointer.y) * 0.035;
      sculpture.rotation.y = -0.35 + time * 0.095 + pointer.x + scrollFactor * 0.34;
      sculpture.rotation.x = 0.25 + Math.sin(time * 0.38) * 0.08 + pointer.y;
      sculpture.rotation.z = -0.08 + Math.cos(time * 0.24) * 0.035;
      dataRibbon.rotation.y = -time * 0.035;
      orbitA.rotation.z = 0.18 + time * 0.055;
      orbitB.rotation.z = -0.35 - time * 0.038;
      particles.rotation.y = time * 0.025;
      particles.rotation.z = Math.sin(time * 0.15) * 0.05;

      satellites.forEach((satellite, index) => {
        satellite.scale.setScalar(1 + Math.sin(time * 1.2 + index * 2) * 0.12);
      });
    }
  };
}

function setupIntelligence({ THREE, scene, camera, host }) {
  camera.position.set(0, 0.2, 6.8);
  addStudioLights(THREE, scene, { warmPower: 28, bluePower: 42, rimPower: 20 });

  const atlas = new THREE.Group();
  atlas.rotation.set(-0.12, 0.25, 0.05);
  scene.add(atlas);

  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x658da4,
    roughness: 0.18,
    metalness: 0.02,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    transmission: 0.28,
    thickness: 1.5,
    transparent: true,
    opacity: 0.9,
    iridescence: 0.28
  });

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.24, 10), coreMaterial);
  atlas.add(core);

  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.72, 5),
    new THREE.MeshPhysicalMaterial({
      color: 0xc1a47c,
      roughness: 0.25,
      emissive: 0x5c4931,
      emissiveIntensity: 0.14,
      clearcoat: 0.8
    })
  );
  atlas.add(inner);

  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.72, 2),
    new THREE.MeshBasicMaterial({
      color: 0x9ec1d3,
      wireframe: true,
      transparent: true,
      opacity: 0.14
    })
  );
  atlas.add(shell);

  const rings = [];
  for (let i = 0; i < 8; i += 1) {
    const radius = 1.5 + i * 0.13;
    const material = new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? 0xc6aa82 : 0x83adc4,
      transparent: true,
      opacity: 0.18 + (i % 2) * 0.08
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.009 + (i % 2) * 0.004, 8, 180),
      material
    );
    ring.rotation.x = Math.PI * 0.5 + (i - 3.5) * 0.07;
    ring.rotation.y = (i - 3.5) * 0.11;
    ring.rotation.z = i * 0.18;
    atlas.add(ring);
    rings.push(ring);
  }

  const nodes = new THREE.Group();
  const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xc4deea });
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 2.25 + (i % 3) * 0.08;
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), nodeMaterial);
    node.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 2.2) * 0.7,
      Math.sin(angle) * radius * 0.35
    );
    nodes.add(node);
  }
  atlas.add(nodes);

  const target = { x: 0, y: 0 };
  const pointer = { x: 0, y: 0 };

  host.addEventListener('pointermove', (event) => {
    const rect = host.getBoundingClientRect();
    target.x = ((event.clientX - rect.left) / rect.width - 0.5) * 0.42;
    target.y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.28;
  }, { passive: true });

  host.addEventListener('pointerleave', () => {
    target.x = 0;
    target.y = 0;
  });

  return {
    update(time) {
      pointer.x += (target.x - pointer.x) * 0.04;
      pointer.y += (target.y - pointer.y) * 0.04;
      atlas.rotation.y = 0.25 + time * 0.07 + pointer.x;
      atlas.rotation.x = -0.12 + Math.sin(time * 0.3) * 0.07 + pointer.y;
      core.rotation.y = -time * 0.045;
      inner.rotation.y = time * 0.085;
      inner.rotation.x = -time * 0.04;
      shell.rotation.y = time * 0.035;
      shell.rotation.z = -time * 0.025;
      nodes.rotation.z = time * 0.04;

      rings.forEach((ring, index) => {
        ring.rotation.z += (index % 2 === 0 ? 1 : -1) * 0.0008;
        ring.position.y = Math.sin(time * 0.5 + index * 0.45) * 0.025;
      });
    }
  };
}

async function initializeSculptures() {
  try {
    const THREE = await import(THREE_URL);
    const heroCanvas = document.getElementById('hero-sculpture');
    const intelligenceCanvas = document.getElementById('intelligence-sculpture');

    if (!heroCanvas || !intelligenceCanvas) {
      throw new Error('Sculpture canvas missing');
    }

    createRuntime(THREE, heroCanvas, setupHero);
    createRuntime(THREE, intelligenceCanvas, setupIntelligence);
    document.documentElement.classList.add('webgl-ready');
  } catch (error) {
    document.documentElement.classList.add('webgl-failed');
    console.warn('WebGL sculptures unavailable; using visual fallback.', error);
  }
}

initializeSculptures();
