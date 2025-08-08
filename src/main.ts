import * as THREE from "three";
import * as CANNON from "cannon-es";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { MyScreen } from "./constants.ts";
import { CannonPlane } from "./cannonObjects.ts";

const SCREEN = new MyScreen();

const SCENE = SCREEN.SCENE;
const RENDERER = SCREEN.RENDERER;

const CAM = (() => {
	const pcam = new THREE.PerspectiveCamera(60, SCREEN.ASPECT_RATIO);
	pcam.position.z = 5;
	pcam.position.y = 4;
	const controls = new OrbitControls(pcam, RENDERER.domElement);
	controls.update();
	return pcam;
})();

const WORLD = SCREEN.WORLD;

const ground = new CannonPlane(
	new CANNON.Vec3(0, -3, 0),
	new CANNON.Quaternion().setFromEuler(-Math.PI / 2, 0, 0),
);

const groundMesh = new THREE.Mesh(
	new THREE.PlaneGeometry(10, 10),
	new THREE.MeshBasicMaterial({
		wireframe: true,
	}),
);
groundMesh.position.copy(ground.cannonBody.position as any);
groundMesh.quaternion.copy(ground.cannonBody.quaternion as any);

const box = new THREE.Mesh(
	new THREE.BoxGeometry(),
	new THREE.MeshBasicMaterial({ wireframe: true }),
);

const boxBody = new CANNON.Body(
	{ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)) },
);
boxBody.position.set(2, 2, 0);

const box2 = new THREE.Mesh(
	new THREE.BoxGeometry(),
	new THREE.MeshBasicMaterial({ wireframe: true }),
);

const boxBody2 = new CANNON.Body(
	{ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5)) },
);
boxBody2.position.set(-2, 2, 0);

SCENE.add(groundMesh, box, box2);
WORLD.addBody(ground.cannonBody);
WORLD.addBody(boxBody);
WORLD.addBody(boxBody2);
RENDERER.setAnimationLoop(animate);

function animate() {
	WORLD.step(SCREEN.TIME_STEP);
	box.position.copy(boxBody.position);
	box2.position.copy(boxBody2.position);
	RENDERER.render(SCENE, CAM);
}
