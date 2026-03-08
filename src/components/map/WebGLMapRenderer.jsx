import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function WebGLMapRenderer({ 
  positions = [], 
  overlays = [], 
  broadcasts = [],
  containerStyle = {},
  mapWidth = 100,
  mapHeight = 100
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const markersRef = useRef([]);
  const overlayMeshesRef = useRef([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0806);
    sceneRef.current = scene;

    // Camera (orthographic for 2D map)
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    const camera = new THREE.OrthographicCamera(0, mapWidth, 0, mapHeight, 0.1, 1000);
    camera.position.z = 50;
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Grid background
    const gridGeometry = new THREE.BufferGeometry();
    const gridPoints = [];
    const gridSpacing = 10;
    for (let i = 0; i <= mapWidth; i += gridSpacing) {
      gridPoints.push(i, 0, 0, i, mapHeight, 0);
    }
    for (let i = 0; i <= mapHeight; i += gridSpacing) {
      gridPoints.push(0, i, 0, mapWidth, i, 0);
    }
    gridGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gridPoints), 3));
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x2a1e10, linewidth: 1 });
    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    scene.add(grid);

    // Handle resize
    const handleResize = () => {
      const newW = containerRef.current?.clientWidth || w;
      const newH = containerRef.current?.clientHeight || h;
      camera.left = 0;
      camera.right = mapWidth;
      camera.top = mapHeight;
      camera.bottom = 0;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    const cleanup = () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return cleanup;
  }, [mapWidth, mapHeight]);

  // Update positions
  useEffect(() => {
    if (!sceneRef.current) return;

    markersRef.current.forEach(m => sceneRef.current.remove(m));
    markersRef.current = [];

    positions.forEach(pos => {
      const geometry = new THREE.CircleGeometry(0.6, 16);
      const color = pos.in_vehicle ? 0x00e8ff : 0x39ff14;
      const material = new THREE.MeshBasicMaterial({ color });
      const marker = new THREE.Mesh(geometry, material);
      marker.position.x = pos.x;
      marker.position.y = pos.y;
      marker.position.z = 1;
      sceneRef.current.add(marker);
      markersRef.current.push(marker);
    });
  }, [positions]);

  // Update overlays
  useEffect(() => {
    if (!sceneRef.current) return;

    overlayMeshesRef.current.forEach(m => sceneRef.current.remove(m));
    overlayMeshesRef.current = [];

    overlays.forEach(overlay => {
      if (overlay.geometry === 'circle' && overlay.radius) {
        const geometry = new THREE.CircleGeometry(overlay.radius, 32);
        const color = new THREE.Color(overlay.color || '#ff2020');
        const material = new THREE.MeshBasicMaterial({ 
          color,
          opacity: overlay.opacity || 0.4,
          transparent: true
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = overlay.center_x;
        mesh.position.y = overlay.center_y;
        mesh.position.z = 0;
        sceneRef.current.add(mesh);
        overlayMeshesRef.current.push(mesh);
      } else if (overlay.geometry === 'polygon' && overlay.points?.length > 2) {
        const shape = new THREE.Shape();
        const firstPoint = overlay.points[0];
        shape.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < overlay.points.length; i++) {
          shape.lineTo(overlay.points[i].x, overlay.points[i].y);
        }
        shape.lineTo(firstPoint.x, firstPoint.y);
        const geometry = new THREE.ShapeGeometry(shape);
        const color = new THREE.Color(overlay.color || '#ffaa00');
        const material = new THREE.MeshBasicMaterial({ 
          color,
          opacity: overlay.opacity || 0.3,
          transparent: true
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = 0;
        sceneRef.current.add(mesh);
        overlayMeshesRef.current.push(mesh);
      }
    });
  }, [overlays]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        border: '1px solid #2a1e10',
        background: '#0a0806',
        ...containerStyle,
      }}
    />
  );
}