<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
  import * as math from 'mathjs';

  let container: HTMLDivElement;
  let complexPlaneScene: THREE.Scene;
  let riemannSphereScene: THREE.Scene;
  let complexPlaneCamera: THREE.OrthographicCamera;
  let riemannSphereCamera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let complexPlaneControls: OrbitControls;
  let riemannSphereControls: OrbitControls;
  let functionInput = '';
  let zoomLevel = 1;

  onMount(() => {
    init();
    animate();
    return () => {
      renderer.dispose();
    };
  });

  function init(): void {
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Complex plane scene
    complexPlaneScene = new THREE.Scene();
    complexPlaneScene.background = new THREE.Color(0xf0f0f0);
    const aspect = window.innerWidth / window.innerHeight;
    complexPlaneCamera = new THREE.OrthographicCamera(-2 * aspect, 2 * aspect, 2, -2, 0.1, 1000);
    complexPlaneCamera.position.set(0, 0, 5);
    complexPlaneCamera.lookAt(0, 0, 0);
    complexPlaneControls = new OrbitControls(complexPlaneCamera, renderer.domElement);
    complexPlaneControls.enableRotate = false;

    // Riemann sphere scene
    riemannSphereScene = new THREE.Scene();
    riemannSphereScene.background = new THREE.Color(0x1a1a1a); // Dark gray background
    riemannSphereCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    riemannSphereCamera.position.set(0, 0, 4);
    riemannSphereCamera.lookAt(0, 0, 0);
    riemannSphereControls = new OrbitControls(riemannSphereCamera, renderer.domElement);
    riemannSphereControls.enableDamping = true;
    riemannSphereControls.dampingFactor = 0.05;

    // Add elements to both scenes
    addComplexPlaneElements();
    addRiemannSphereElements();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
  }

  function addComplexPlaneElements(): void {
    // Add complex plane
    const planeGeometry = new THREE.PlaneGeometry(4, 4);
    const planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    complexPlaneScene.add(plane);

    // Add grid
    const gridHelper = new THREE.GridHelper(4, 20, 0xcccccc, 0xcccccc);
    gridHelper.rotation.x = Math.PI / 2;
    complexPlaneScene.add(gridHelper);

    // Add unit circle
    const circleGeometry = new THREE.BufferGeometry().setFromPoints(
      new THREE.Path().absarc(0, 0, 1, 0, Math.PI * 2, true).getPoints(100)
    );
    const circleMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const unitCircle = new THREE.Line(circleGeometry, circleMaterial);
    complexPlaneScene.add(unitCircle);

    // Add axes
    const axesHelper = new THREE.AxesHelper(2);
    complexPlaneScene.add(axesHelper);

    // Add 0 point marker
    const zeroPointGeometry = new THREE.SphereGeometry(0.05, 32, 32);
    const zeroPointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const zeroPoint = new THREE.Mesh(zeroPointGeometry, zeroPointMaterial);
    zeroPoint.position.set(0, 0, 0.01);
    complexPlaneScene.add(zeroPoint);
  }

  function addRiemannSphereElements(): void {
    // Add Riemann sphere
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x4b87c5, // Ocean blue color
      shininess: 30,
      specular: 0x333333
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    riemannSphereScene.add(sphere);

    // Add equator
    const equatorGeometry = new THREE.RingGeometry(1.001, 1.005, 64);
    const equatorMaterial = new THREE.MeshBasicMaterial({ color: 0xff6666, side: THREE.DoubleSide });
    const equator = new THREE.Mesh(equatorGeometry, equatorMaterial);
    equator.rotation.x = Math.PI / 2;
    riemannSphereScene.add(equator);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    riemannSphereScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    riemannSphereScene.add(directionalLight);

    const axesHelper = new THREE.AxesHelper(1.5);
    riemannSphereScene.add(axesHelper);
  }


  function addContinents(): void {
    const continentGeometry = new THREE.SphereGeometry(1.005, 32, 32);
    const continentMaterial = new THREE.MeshPhongMaterial({
      color: 0x90ee90, // Light green color
      shininess: 10,
    });
    
    // Create simplified continent shapes
    const continents = [
      { phi: 0.7, theta: 0.3, scale: 0.3 },    // North America
      { phi: 0.7, theta: 2.0, scale: 0.4 },    // Europe/Asia
      { phi: -0.5, theta: 0.5, scale: 0.25 },  // South America
      { phi: -0.2, theta: 2.5, scale: 0.3 },   // Africa
      { phi: -1.0, theta: 2.7, scale: 0.2 },   // Australia
    ];

    continents.forEach(({ phi, theta, scale }) => {
      const continent = new THREE.Mesh(continentGeometry, continentMaterial);
      continent.scale.setScalar(scale);
      continent.position.setFromSphericalCoords(1, phi, theta);
      continent.lookAt(new THREE.Vector3(0, 0, 0));
      riemannSphereScene.add(continent);
    });
  }

  function updateVisualization(): void {
    // Clear existing points
    complexPlaneScene.children = complexPlaneScene.children.filter(child => !(child instanceof THREE.Points));
    riemannSphereScene.children = riemannSphereScene.children.filter(child => !(child instanceof THREE.Points));

    // Parse and evaluate the function
    const parsedFunction = math.parse(functionInput);
    const evaluateFunction = parsedFunction.compile();

    // Generate points on the complex plane
    const points = [];
    const colors = [];
    const step = 0.05;
    for (let re = -2; re <= 2; re += step) {
      for (let im = -2; im <= 2; im += step) {
        const z = math.complex(re, im);
        const result = evaluateFunction.evaluate({ z });
        points.push(new THREE.Vector3(re, im, 0));
        const hue = (Math.atan2(result.im, result.re) + Math.PI) / (2 * Math.PI);
        const lightness = Math.min(1, 1 - Math.exp(-Math.abs(result) / 2)) / 2 + 0.5;
        colors.push(new THREE.Color().setHSL(hue, 1, lightness));
      }
    }

    // Add points to the complex plane
    const complexPlaneGeometry = new THREE.BufferGeometry().setFromPoints(points);
    complexPlaneGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors.flatMap(c => c.toArray()), 3));
    const complexPlaneMaterial = new THREE.PointsMaterial({ size: 0.03, vertexColors: true });
    const complexPlanePoints = new THREE.Points(complexPlaneGeometry, complexPlaneMaterial);
    complexPlaneScene.add(complexPlanePoints);

    // Project points onto the Riemann sphere
    const spherePoints = points.map(point => {
      const re = point.x;
      const im = point.y;
      const r = Math.sqrt(re*re + im*im);
      const theta = Math.atan2(im, re);
      const phi = Math.PI/2 - 2 * Math.atan(r);
      return new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      );
    });

    // Add projected points to the Riemann sphere
    const riemannSphereGeometry = new THREE.BufferGeometry().setFromPoints(spherePoints);
    riemannSphereGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors.flatMap(c => c.toArray()), 3));
    const riemannSphereMaterial = new THREE.PointsMaterial({ size: 0.03, vertexColors: true });
    const riemannSpherePoints = new THREE.Points(riemannSphereGeometry, riemannSphereMaterial);
    riemannSphereScene.add(riemannSpherePoints);
  }

  function onWindowResize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    complexPlaneCamera.left = -2 * aspect;
    complexPlaneCamera.right = 2 * aspect;
    complexPlaneCamera.top = 2;
    complexPlaneCamera.bottom = -2;
    complexPlaneCamera.updateProjectionMatrix();

    riemannSphereCamera.aspect = aspect;
    riemannSphereCamera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function animate(): void {
    requestAnimationFrame(animate);
    complexPlaneControls.update();
    riemannSphereControls.update();
    renderer.setScissorTest(true);

    // Render complex plane view
    renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.render(complexPlaneScene, complexPlaneCamera);

    // Render Riemann sphere view
    renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.render(riemannSphereScene, riemannSphereCamera);
  }

  function handleFunctionInput(): void {
    updateVisualization();
  }

  function handleZoom(delta: number): void {
    zoomLevel = Math.max(0.1, Math.min(5, zoomLevel + delta));
    complexPlaneCamera.zoom = zoomLevel;
    complexPlaneCamera.updateProjectionMatrix();
    riemannSphereCamera.position.z = 2.5 / zoomLevel;
    riemannSphereCamera.updateProjectionMatrix();
  }
</script>

<div class="container" bind:this={container}>
  <div class="controls">
    <input bind:value={functionInput} on:input={handleFunctionInput} placeholder="Enter function (e.g., z^2)" />
    <button on:click={() => handleZoom(0.1)}>Zoom In</button>
    <button on:click={() => handleZoom(-0.1)}>Zoom Out</button>
  </div>
</div>

<style>
  .container {
    width: 100%;
    height: 100vh;
    position: relative;
  }
  .controls {
    position: absolute;
    top: 10px;
    left: 10px;
    z-index: 1;
    display: flex;
    gap: 10px;
  }
  input, button {
    padding: 5px 10px;
    font-size: 16px;
  }

  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>
