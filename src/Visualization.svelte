<script lang="ts">
  import { onMount } from "svelte";
  import * as THREE from "three";
  import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
  import { parseFunction, createEvaluator } from "./complexMath";

  interface Complex {
    re: number;
    im: number;
  }

  let container: HTMLDivElement;
  let complexPlaneScene: THREE.Scene;
  let riemannSphereScene: THREE.Scene;
  let complexPlaneCamera: THREE.OrthographicCamera;
  let riemannSphereCamera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let complexPlaneControls: OrbitControls;
  let riemannSphereControls: OrbitControls;
  let functionInput = "";
  let explanation = "";
  let currentFunction: (z: Complex) => Complex = (z) => z;

  function handleFunctionInput(): void {
    if (functionInput.trim() === "") {
      // Reset visualization and explanation when input is empty
      resetVisualization();
      currentFunction = (z) => z; // Reset to identity function
      explanation = "Enter a complex function to visualize its transformation.";
      return;
    }

    const parsedFunction = parseFunction(functionInput);
    if (parsedFunction) {
      currentFunction = createEvaluator(parsedFunction);
      updateVisualization();
      updateExplanation();
    } else {
      // Handle invalid input
      console.error("Invalid function input");
      explanation = "Invalid function input. Please try again.";
    }
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
    complexPlaneScene.background = new THREE.Color(0xffffff);
    const aspect = 1;
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
    riemannSphereScene.background = new THREE.Color(0xffffff);
    const aspect = 1;
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
    const gridHelper = new THREE.GridHelper(4, 20, 0xcccccc, 0xcccccc);
    gridHelper.rotation.x = Math.PI / 2;
    complexPlaneScene.add(gridHelper);

    const axesHelper = new THREE.AxesHelper(2);
    complexPlaneScene.add(axesHelper);

    const unitCircle = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, 1, 0, Math.PI * 2, true).getPoints(100)
      ),
      new THREE.LineBasicMaterial({ color: 0x000000 })
    );
    complexPlaneScene.add(unitCircle);
  }

  function addRiemannSphereElements(): void {
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    riemannSphereScene.add(sphere);

    const equator = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, 1, 0, Math.PI * 2, true).getPoints(100)
      ),
      new THREE.LineBasicMaterial({ color: 0x000000 })
    );
    equator.rotation.x = Math.PI / 2;
    riemannSphereScene.add(equator);

    const axesHelper = new THREE.AxesHelper(1.5);
    riemannSphereScene.add(axesHelper);
  }

  function updateVisualization(): void {
    clearVisualization();

    const points = generatePoints(currentFunction);
    drawComplexPlane(points);
    drawRiemannSphere(points);
  }

  function resetVisualization(): void {
    clearVisualization();
    addComplexPlaneElements();
    addRiemannSphereElements();
  }

  function generatePoints(
    func: (z: Complex) => Complex
  ): { input: THREE.Vector3; output: THREE.Vector3 }[] {
    const points: { input: THREE.Vector3; output: THREE.Vector3 }[] = [];
    const resolution = 20;

    for (let i = -resolution; i <= resolution; i++) {
      for (let j = -resolution; j <= resolution; j++) {
        const x = (i / resolution) * 2;
        const y = (j / resolution) * 2;
        const input = { re: x, im: y };
        const output = func(input);

        points.push({
          input: new THREE.Vector3(x, y, 0),
          output: new THREE.Vector3(output.re, output.im, 0),
        });
      }
    }

    return points;
  }

  function drawComplexPlane(
    points: { input: THREE.Vector3; output: THREE.Vector3 }[]
  ): void {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    points.forEach(({ input, output }) => {
      positions.push(input.x, input.y, input.z);
      positions.push(output.x, output.y, output.z);
    });

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    const material = new THREE.LineBasicMaterial({
      color: 0x0000ff,
      linewidth: 1,
    });
    const lineSegments = new THREE.LineSegments(geometry, material);
    complexPlaneScene.add(lineSegments);
  }

  function drawRiemannSphere(
    points: { input: THREE.Vector3; output: THREE.Vector3 }[]
  ): void {
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    points.forEach(({ input, output }) => {
      const spherePoint = stereographicProjection(output);
      positions.push(input.x, input.y, input.z);
      positions.push(spherePoint.x, spherePoint.y, spherePoint.z);
    });

    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 1,
    });
    const lineSegments = new THREE.LineSegments(geometry, material);
    riemannSphereScene.add(lineSegments);
  }

  function stereographicProjection(point: THREE.Vector3): THREE.Vector3 {
    const x = point.x;
    const y = point.y;
    const r2 = x * x + y * y;
    return new THREE.Vector3(
      (2 * x) / (1 + r2),
      (2 * y) / (1 + r2),
      (r2 - 1) / (r2 + 1)
    );
  }

  function clearVisualization(): void {
    complexPlaneScene.clear();
    riemannSphereScene.clear();
  }

  function updateExplanation(): void {
    if (functionInput.trim() === "") {
      explanation = "Enter a complex function to visualize its transformation.";
      return;
    }

    switch (functionInput.toLowerCase()) {
      case "1/z":
        explanation =
          "The function f(z) = 1/z inverts the complex plane, turning the unit circle into itself and swapping the interior with the exterior.";
        break;
      case "2z":
        explanation =
          "The function f(z) = 2z doubles the magnitude of each point, expanding the plane outward from the origin.";
        break;
      case "1/3z":
        explanation =
          "The function f(z) = 1/(3z) inverts the plane and then scales it down by a factor of 3.";
        break;
      case "z^2":
        explanation =
          "The function f(z) = z^2 squares each complex number, doubling angles and squaring magnitudes.";
        break;
      default:
        if (functionInput.match(/\(az\+b\)\/\(cz\+d\)/i)) {
          explanation =
            "This is a general Möbius transformation. It can rotate, translate, dilate, and invert the complex plane.";
        } else {
          explanation =
            "Explore how this function transforms the complex plane and maps onto the Riemann sphere.";
        }
    }
  }

  onMount(() => {
    init();
    animate();
    resetVisualization();
    updateExplanation();
    return () => {
      renderer.dispose();
    };
  });

  function onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    complexPlaneCamera.left = -2;
    complexPlaneCamera.right = 2;
    complexPlaneCamera.top = 2;
    complexPlaneCamera.bottom = -2;
    complexPlaneCamera.updateProjectionMatrix();

    riemannSphereCamera.aspect = 1;
    riemannSphereCamera.updateProjectionMatrix();

    renderer.setSize(width, height);
  }

  function animate(): void {
    requestAnimationFrame(animate);
    complexPlaneControls.update();
    riemannSphereControls.update();
    renderer.setScissorTest(true);

    const width = window.innerWidth;
    const height = window.innerHeight;
    const size = Math.min(width / 2, height);

    renderer.setScissor(0, height - size, size, size);
    renderer.setViewport(0, height - size, size, size);
    renderer.render(complexPlaneScene, complexPlaneCamera);

    renderer.setScissor(width - size, height - size, size, size);
    renderer.setViewport(width - size, height - size, size, size);
    renderer.render(riemannSphereScene, riemannSphereCamera);
  }
</script>

<div class="container" bind:this={container}>
  <div class="input-container">
    <input
      class="function-input"
      bind:value={functionInput}
      on:input={handleFunctionInput}
      placeholder="Enter complex function (e.g., 1/z, 2z, 1/3z, z^2)"
    />
  </div>
  <div class="visualization-container">
    <!-- Visualization will be rendered here by Three.js -->
  </div>
  <div class="explanation">
    <p>{explanation}</p>
  </div>
</div>

<style>
  .container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: #ffffff;
  }

  .input-container {
    background-color: #f8f9fa;
  }

  .function-input {
    width: 100%;
    font-size: 0.9rem;
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    background-color: #ffffff;
  }

  .visualization-container {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }

  .explanation {
    background-color: #f8f9fa;
    font-size: 0.8rem;
    text-align: center;
  }

  @media (max-width: 480px) {
    .container {
      flex-direction: row;
      flex-wrap: wrap;
    }

    .input-container,
    .visualization-container,
    .explanation {
      width: 100%;
    }

    .function-input {
      font-size: 0.8rem;
    }

    .explanation {
      font-size: 0.7rem;
    }
  }

  :global(body) {
    margin: 0;
    overflow: hidden;
  }
</style>
