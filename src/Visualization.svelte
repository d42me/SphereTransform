<script lang="ts">
  import { onMount } from "svelte";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { parseFunction, evaluateFunction } from "./complexMath";

  let container: HTMLDivElement;
  let complexPlaneScene: THREE.Scene;
  let riemannSphereScene: THREE.Scene;
  let complexPlaneCamera: THREE.OrthographicCamera;
  let riemannSphereCamera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let complexPlaneControls: OrbitControls;
  let riemannSphereControls: OrbitControls;
  let functionInput = "1/z";
  let zoomLevel = 1;
  let viewMode: "complex" | "riemann" = "complex";
  let visualizationMode: "domainColoring" | "phasePortrait" = "domainColoring";

  function handleFunctionInput(): void {
    console.log("Function input changed:", functionInput);
    updateVisualization();
  }

  function init(): void {
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    initComplexPlaneScene();
    initRiemannSphereScene();

    window.addEventListener("resize", onWindowResize);
  }

  function initComplexPlaneScene(): void {
    complexPlaneScene = new THREE.Scene();
    complexPlaneScene.background = new THREE.Color(0xf8f9fa);
    const aspect = window.innerWidth / window.innerHeight;
    complexPlaneCamera = new THREE.OrthographicCamera(
      -2 * aspect,
      2 * aspect,
      2,
      -2,
      0.1,
      1000
    );
    complexPlaneCamera.position.set(0, 0, 5);
    complexPlaneCamera.lookAt(0, 0, 0);
    complexPlaneControls = new OrbitControls(
      complexPlaneCamera,
      renderer.domElement
    );
    complexPlaneControls.enableRotate = false;

    addComplexPlaneElements();
  }

  function initRiemannSphereScene(): void {
    riemannSphereScene = new THREE.Scene();
    riemannSphereScene.background = new THREE.Color(0xf8f9fa);
    const aspect = window.innerWidth / window.innerHeight;
    riemannSphereCamera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    riemannSphereCamera.position.set(0, 0, 4);
    riemannSphereCamera.lookAt(0, 0, 0);
    riemannSphereControls = new OrbitControls(
      riemannSphereCamera,
      renderer.domElement
    );
    riemannSphereControls.enableDamping = true;
    riemannSphereControls.dampingFactor = 0.05;

    addRiemannSphereElements();
  }

  function addComplexPlaneElements(): void {
    const planeGeometry = new THREE.PlaneGeometry(4, 4);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    complexPlaneScene.add(plane);

    const gridHelper = new THREE.GridHelper(4, 20, 0xcccccc, 0xcccccc);
    gridHelper.rotation.x = Math.PI / 2;
    complexPlaneScene.add(gridHelper);

    const circleGeometry = new THREE.BufferGeometry().setFromPoints(
      new THREE.Path().absarc(0, 0, 1, 0, Math.PI * 2, true).getPoints(100)
    );
    const circleMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const unitCircle = new THREE.Line(circleGeometry, circleMaterial);
    complexPlaneScene.add(unitCircle);

    const axesHelper = new THREE.AxesHelper(2);
    complexPlaneScene.add(axesHelper);

    const zeroPointGeometry = new THREE.SphereGeometry(0.05, 32, 32);
    const zeroPointMaterial = new THREE.MeshBasicMaterial({ color: 0xff3e00 });
    const zeroPoint = new THREE.Mesh(zeroPointGeometry, zeroPointMaterial);
    zeroPoint.position.set(0, 0, 0.01);
    complexPlaneScene.add(zeroPoint);
  }

  function addRiemannSphereElements(): void {
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x4b87c5,
      shininess: 30,
      specular: 0x333333,
      transparent: true,
      opacity: 0.8,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    riemannSphereScene.add(sphere);

    const equatorGeometry = new THREE.RingGeometry(1.001, 1.005, 64);
    const equatorMaterial = new THREE.MeshBasicMaterial({
      color: 0xff3e00,
      side: THREE.DoubleSide,
    });
    const equator = new THREE.Mesh(equatorGeometry, equatorMaterial);
    equator.rotation.x = Math.PI / 2;
    riemannSphereScene.add(equator);

    const ambientLight = new THREE.AmbientLight(0x404040);
    riemannSphereScene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    riemannSphereScene.add(directionalLight);

    const axesHelper = new THREE.AxesHelper(1.5);
    riemannSphereScene.add(axesHelper);

    const poleGeometry = new THREE.SphereGeometry(0.03, 32, 32);
    const poleMaterial = new THREE.MeshBasicMaterial({ color: 0xff3e00 });
    const northPole = new THREE.Mesh(poleGeometry, poleMaterial);
    northPole.position.set(0, 1, 0);
    riemannSphereScene.add(northPole);
    const southPole = new THREE.Mesh(poleGeometry, poleMaterial);
    southPole.position.set(0, -1, 0);
    riemannSphereScene.add(southPole);
  }

  function updateVisualization(): void {
    clearVisualization();

    console.log("Updating visualization with function:", functionInput);

    const parsedFunction = parseFunction(functionInput);

    const size = 512;
    const data = new Float32Array(4 * size * size);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = (i / size) * 4 - 2;
        const y = (j / size) * 4 - 2;
        const z = { re: x, im: y };
        let result;
        try {
          result = evaluateFunction(parsedFunction, z);
        } catch (error) {
          console.error("Error evaluating function:", error);
          continue;
        }

        const index = 4 * (i + j * size);
        data[index] = result.re;
        data[index + 1] = result.im;
        data[index + 2] = 0;
        data[index + 3] = 1;
      }
    }

    const texture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_texture: { value: texture },
        u_mode: { value: visualizationMode === "domainColoring" ? 0 : 1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D u_texture;
        uniform int u_mode;
        varying vec2 vUv;

        vec3 hsl2rgb(vec3 c) {
          vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
        }

        void main() {
          vec4 texColor = texture2D(u_texture, vUv);
          float re = texColor.r;
          float im = texColor.g;

          if (u_mode == 0) { // Domain coloring
            float hue = atan(im, re) / (2.0 * 3.14159265359) + 0.5;
            float saturation = 1.0;
            float lightness = 1.0 - 1.0 / (1.0 + length(vec2(re, im)));
            gl_FragColor = vec4(hsl2rgb(vec3(hue, saturation, lightness)), 1.0);
          } else { // Phase portrait
            float phase = atan(im, re) / (2.0 * 3.14159265359) + 0.5;
            gl_FragColor = vec4(hsl2rgb(vec3(phase, 1.0, 0.5)), 1.0);
          }
        }
      `,
    });

    const complexPlaneGeometry = new THREE.PlaneGeometry(4, 4);
    const complexPlane = new THREE.Mesh(complexPlaneGeometry, material);
    complexPlane.position.z = 0.01; // Slightly above the grid
    complexPlaneScene.add(complexPlane);

    const riemannSphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    const riemannSphereMaterial = material.clone();
    riemannSphereMaterial.side = THREE.DoubleSide;
    const riemannSphere = new THREE.Mesh(
      riemannSphereGeometry,
      riemannSphereMaterial
    );
    riemannSphereScene.add(riemannSphere);
  }

  function clearVisualization(): void {
    complexPlaneScene.children = complexPlaneScene.children.filter(
      (child) =>
        !(
          child instanceof THREE.Mesh &&
          child.geometry instanceof THREE.PlaneGeometry
        )
    );
    riemannSphereScene.children = riemannSphereScene.children.filter(
      (child) =>
        !(
          child instanceof THREE.Mesh &&
          child.geometry instanceof THREE.SphereGeometry
        )
    );
  }

  // Make sure to call updateVisualization when the component mounts
  onMount(() => {
    init();
    animate();
    updateVisualization();
    return () => {
      renderer.dispose();
    };
  });

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

    const width = window.innerWidth;
    const height = window.innerHeight;

    if (viewMode === "complex") {
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      renderer.render(complexPlaneScene, complexPlaneCamera);
    } else if (viewMode === "riemann") {
      renderer.setScissor(0, 0, width, height);
      renderer.setViewport(0, 0, width, height);
      renderer.render(riemannSphereScene, riemannSphereCamera);
    }
  }

  function handleZoom(delta: number): void {
    zoomLevel = Math.max(0.1, Math.min(5, zoomLevel + delta));
    complexPlaneCamera.zoom = zoomLevel;
    complexPlaneCamera.updateProjectionMatrix();
    riemannSphereCamera.position.z = 2.5 / zoomLevel;
    riemannSphereCamera.updateProjectionMatrix();
  }

  function handleViewModeChange(mode: typeof viewMode): void {
    viewMode = mode;
  }

  function handleVisualizationModeChange(mode: typeof visualizationMode): void {
    visualizationMode = mode;
    updateVisualization();
  }
</script>

<div class="container" bind:this={container}>
  <div class="input-container">
    <input
      class="function-input"
      bind:value={functionInput}
      on:input={handleFunctionInput}
      placeholder="Enter complex function (e.g., 1/z)"
    />
  </div>
  <div class="visualization-container">
    <!-- Visualization will be rendered here by Three.js -->
  </div>
  <div class="controls">
    <button class="control-button" on:click={() => handleZoom(0.1)}
      >Zoom In</button
    >
    <button class="control-button" on:click={() => handleZoom(-0.1)}
      >Zoom Out</button
    >
    <div class="view-mode-toggle">
      <button
        class="toggle-button {viewMode === 'complex' ? 'active' : ''}"
        on:click={() => handleViewModeChange("complex")}
      >
        Complex Plane
      </button>
      <button
        class="toggle-button {viewMode === 'riemann' ? 'active' : ''}"
        on:click={() => handleViewModeChange("riemann")}
      >
        Riemann Sphere
      </button>
    </div>
    <div class="visualization-mode-toggle">
      <button
        class="toggle-button {visualizationMode === 'domainColoring'
          ? 'active'
          : ''}"
        on:click={() => handleVisualizationModeChange("domainColoring")}
      >
        Domain Coloring
      </button>
      <button
        class="toggle-button {visualizationMode === 'phasePortrait'
          ? 'active'
          : ''}"
        on:click={() => handleVisualizationModeChange("phasePortrait")}
      >
        Phase Portrait
      </button>
    </div>
  </div>
</div>

<style>
  .container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #f8f9fa;
  }

  .input-container {
    padding: 1rem;
    background-color: #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .function-input {
    width: 100%;
    padding: 0.75rem 1rem;
    font-size: 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background-color: #ffffff;
    color: #1f2937;
    transition: border-color 0.2s ease-in-out;
  }

  .function-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
  }

  .visualization-container {
    flex-grow: 1;
    position: relative;
  }

  .controls {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    background-color: #ffffff;
    box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  }

  .control-button,
  .toggle-button {
    padding: 0.5rem 1rem;
    margin: 0 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: #ffffff;
    background-color: #3b82f6;
    border: none;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
  }

  .control-button:hover,
  .toggle-button:hover {
    background-color: #2563eb;
  }

  .toggle-button.active {
    background-color: #1d4ed8;
  }

  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>
