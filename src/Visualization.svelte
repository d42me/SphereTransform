<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';

  let container: HTMLDivElement;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let renderer: THREE.WebGLRenderer;
  let sphere: THREE.Mesh;
  let plane: THREE.Mesh;

  onMount(() => {
    init();
    return () => {
      // Cleanup
      renderer.dispose();
    };
  });

  function init(): void {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // Create sphere (Riemann sphere)
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true});
    sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sphere);

    // Create plane (complex plane)
    const planeGeometry = new THREE.PlaneGeometry(4, 4);
    const planeMaterial = new THREE.MeshBasicMaterial({color: 0xffff00, side: THREE.DoubleSide, transparent: true, opacity: 0.5});
    plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = Math.PI / 2;
    plane.position.y = -1;
    scene.add(plane);

    addPoint(0.5, 0.5);

    animate();
  }

  function addPoint(x: number, y: number): void {
    const pointGeometry = new THREE.SphereGeometry(0.05, 32, 32);
    const pointMaterial = new THREE.MeshBasicMaterial({color: 0xff0000});
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    
    // Position on the plane
    point.position.set(x, -1, y);
    scene.add(point);

    // Calculate stereographic projection
    const r = Math.sqrt(x*x + y*y);
    const theta = Math.atan2(y, x);
    const phi = 2 * Math.atan(1 / r);

    const projectedPoint = new THREE.Mesh(pointGeometry, pointMaterial);
    projectedPoint.position.set(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );
    scene.add(projectedPoint);
  }

  function animate(): void {
    requestAnimationFrame(animate);
    sphere.rotation.y += 0.01;
    renderer.render(scene, camera);
  }
</script>

<div bind:this={container}></div>

<style>
  div {
    width: 100%;
    height: 100vh;
  }
</style>
