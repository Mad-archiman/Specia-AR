import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface ThreeSceneOptions {
  onXRFrame?: (frame: XRFrame) => void;
}

export interface ThreeSceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  animate: () => void;
  resize: (width: number, height: number) => void;
  resetView: () => void;
  dispose: () => void;
}

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function addLights(scene: THREE.Scene, mobile: boolean): void {
  const hemisphere = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  scene.add(hemisphere);

  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(5, 10, 7.5);
  if (!mobile) directional.castShadow = true;
  scene.add(directional);
}

export function createThreeScene(
  container: HTMLElement,
  options: ThreeSceneOptions = {}
): ThreeSceneContext {
  const { onXRFrame } = options;
  const mobile = isMobile();
  const w = Math.max(1, container.clientWidth || 1);
  const h = Math.max(1, container.clientHeight || 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    w / h,
    0.01,
    1000
  );
  const renderer = new THREE.WebGLRenderer({
    antialias: !mobile,
    alpha: true,
  });

  camera.position.set(0, 0, 3);

  renderer.setSize(w, h);
  renderer.setPixelRatio(mobile ? Math.min(window.devicePixelRatio, 1.5) : Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  if (!mobile) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;
  }
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  addLights(scene, mobile);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.screenSpacePanning = true;

  const resize = (width: number, height: number) => {
    const rw = Math.max(1, width);
    const rh = Math.max(1, height);
    camera.aspect = rw / rh;
    camera.updateProjectionMatrix();
    renderer.setSize(rw, rh);
  };

  const resetView = () => {
    camera.position.set(0, 0, 3);
    controls.target.set(0, 0, 0);
  };

  const animate = () => {
    renderer.setAnimationLoop((timestamp: number, frame: XRFrame | undefined) => {
      if (frame && onXRFrame) {
        onXRFrame(frame);
      }
      controls.update();
      renderer.render(scene, camera);
    });
  };

  const dispose = () => {
    renderer.setAnimationLoop(null);
    controls.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };

  return { scene, camera, renderer, controls, animate, resize, resetView, dispose };
}
