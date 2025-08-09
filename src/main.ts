import * as THREE from "three";
import * as CANNON from "cannon-es";
// import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { MyScreen } from "./constants.ts";
import { CannonPlane } from "./cannonObjects.ts";

const SCREEN = new MyScreen();

const SCENE = SCREEN.SCENE;
const RENDERER = SCREEN.RENDERER;
const CAM = SCREEN.CAM;
// CAM.position.y -= 1;
CAM.position.x += 1;

// const CAM = (() => {
// 	const pcam = new THREE.PerspectiveCamera(60, SCREEN.ASPECT_RATIO);
// 	pcam.position.z = 10;
// 	pcam.position.y = -2;
// 	const controls = new OrbitControls(pcam, RENDERER.domElement);
// 	controls.update();
// 	return pcam;
// })();

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
groundMesh.position.copy(ground.cannonBody.position);
groundMesh.quaternion.copy(ground.cannonBody.quaternion);

const meshes: THREE.Mesh[] = [];
const bodies: CANNON.Body[] = [];

const boxGeo = new THREE.BoxGeometry();
const boxMat = new THREE.MeshBasicMaterial({ wireframe: true });
const mass = 1;
const boxShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
const newBox = () => {
	return new THREE.Mesh(boxGeo, boxMat);
};
const newBody = () => {
	return new CANNON.Body(
		{ mass: mass, shape: boxShape },
	);
};

for (let i = 0; i < 4; ++i) {
	meshes.push(newBox());
	bodies.push(newBody());
}

bodies[0].position.set(0, 0, 0);
bodies[1].position.set(2, 0, 0);
bodies[2].position.set(0, 2, 0);
bodies[3].position.set(2, 2, 0);

const springs: CANNON.Spring[] = [];

const springOption = {
	restLength: 2,
	stiffness: 50,
	damping: 1,
};

springs.push(
	new CANNON.Spring(bodies[0], bodies[1], springOption),
	new CANNON.Spring(bodies[2], bodies[3], springOption),
	new CANNON.Spring(bodies[0], bodies[2], springOption),
	new CANNON.Spring(bodies[1], bodies[3], springOption),
	new CANNON.Spring(bodies[0], bodies[3], {
		restLength: 2 * Math.SQRT2,
		stiffness: 50,
		damping: 1,
	}),
	new CANNON.Spring(bodies[2], bodies[1], {
		restLength: 2 * Math.SQRT2,
		stiffness: 50,
		damping: 1,
	}),
);

SCENE.add(groundMesh, ...meshes);
for (const body of [ground.cannonBody, ...bodies]) {
	WORLD.addBody(body);
}
RENDERER.setAnimationLoop(animate);

const mousePosition = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const plane = new THREE.Plane(
	new THREE.Vector3(0, 0, 1),
	-(meshes[0].geometry as THREE.BoxGeometry).parameters.depth /
		2,
);
const tempVector3 = new THREE.Vector3();

// Create a static anchor body at the start
const dragAnchor = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
WORLD.addBody(dragAnchor);

let dragConstraint: CANNON.PointToPointConstraint | null = null;
let draggedBody: CANNON.Body | null = null;
let localOffset: CANNON.Vec3 | null = null;

globalThis.addEventListener("mousedown", (e) => {
	// Convert mouse position to normalized device coordinates
	mousePosition.set(
		(e.clientX / globalThis.innerWidth) * 2 - 1,
		-(e.clientY / globalThis.innerHeight) * 2 + 1,
	);

	// Raycast to find clicked objects
	raycaster.setFromCamera(mousePosition, CAM);
	const intersects = raycaster.intersectObjects(meshes);

	if (intersects.length > 0) {
		const intersection = intersects[0];
		const clickedMesh = intersection.object as THREE.Mesh;
		const bodyIndex = meshes.indexOf(clickedMesh);

		// Get local offset where the body was clicked
		const worldPoint = intersection.point;
		const localPoint = clickedMesh.worldToLocal(worldPoint.clone());
		localOffset = new CANNON.Vec3(localPoint.x, localPoint.y, 0);

		// Get mouse position on the plane
		raycaster.ray.intersectPlane(plane, tempVector3);
		dragAnchor.position.set(tempVector3.x, tempVector3.y, 0);

		// Remove any existing constraint
		if (dragConstraint) {
			WORLD.removeConstraint(dragConstraint);
			dragConstraint = null;
		}

		// Create new constraint
		draggedBody = bodies[bodyIndex];
		dragConstraint = new CANNON.PointToPointConstraint(
			draggedBody,
			localOffset,
			dragAnchor,
			new CANNON.Vec3(0, 0, 0),
		);
		WORLD.addConstraint(dragConstraint);
	}
});

globalThis.addEventListener("mousemove", (e) => {
	if (!dragConstraint || !draggedBody) return;

	// Update mouse position
	mousePosition.set(
		(e.clientX / globalThis.innerWidth) * 2 - 1,
		-(e.clientY / globalThis.innerHeight) * 2 + 1,
	);

	// Calculate new anchor position
	raycaster.setFromCamera(mousePosition, CAM);
	if (raycaster.ray.intersectPlane(plane, tempVector3)) {
		// Move the anchor body to the new position
		dragAnchor.position.set(tempVector3.x, tempVector3.y, 0);
	}
});

globalThis.addEventListener("mouseup", () => {
	if (dragConstraint) {
		WORLD.removeConstraint(dragConstraint);
		dragConstraint = null;
	}
	draggedBody = null;
	localOffset = null;
});

function animate() {
	WORLD.step(SCREEN.TIME_STEP);
	for (const spring of springs) {
		spring.applyForce();
	}
	for (const body of bodies) {
		body.position.z = 0; // Lock z-position
		body.velocity.z = 0; // Zero z-velocity
		body.angularVelocity.set(0, 0, 0); // Prevent rotation
	}
	for (let i = 0; i < meshes.length; i++) {
		meshes[i].position.copy(bodies[i].position);
		meshes[i].quaternion.copy(bodies[i].quaternion);
	}
	RENDERER.render(SCENE, CAM);
}
