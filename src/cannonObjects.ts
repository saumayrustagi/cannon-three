import * as THREE from "three";
import * as CANNON from "cannon-es";

export class CannonPlane {
	cannonBody: CANNON.Body;

	constructor(position?: CANNON.Vec3, quaternion?: CANNON.Quaternion) {
		this.cannonBody = new CANNON.Body(
			{ shape: new CANNON.Plane(), type: CANNON.Body.STATIC },
		);
		if (position) {
			this.cannonBody.position = position;
		}
		if (quaternion) {
			this.cannonBody.quaternion = quaternion;
		}
		return this;
	}
}

export class Cushion {
	meshObject: THREE.Mesh;
	segments = 15;
	side = 1;
	particleDist: number;
	particles: CANNON.Body[][] = [];
	constraints: CANNON.DistanceConstraint[] = [];

	constructor() {
		this.meshObject = new THREE.Mesh(
			new THREE.PlaneGeometry(
				this.side,
				this.side,
				this.segments,
				this.segments,
			),
			new THREE.MeshBasicMaterial({
				wireframe: true,
			}),
		);
		this.particleDist = this.side / this.segments;
		return this;
	}

	createParticles(WORLD: CANNON.World) {
		const particles = this.particles;

		const Nx = this.segments;
		const Ny = Nx;
		const dist = this.particleDist;

		const mass = 1000;
		const shape = new CANNON.Particle();

		for (let i = 0; i < Nx + 1; i++) {
			particles.push([]);
			for (let j = 0; j < Ny + 1; j++) {
				const particle = new CANNON.Body({
					mass: mass,
					shape: shape,
					position: new CANNON.Vec3(
						(i - Nx * 0.5) * dist,
						((j - Ny * 0.5) * dist) + 2,
						0,
					),
				});
				particles[i].push(particle);
				WORLD.addBody(particle);
			}
		}
	}

	connectParticles(WORLD: CANNON.World) {
		const Nx = this.segments;
		const Ny = Nx;
		const dist = this.particleDist;
		const diagonalDistance = dist * Math.SQRT2;
		const particles = this.particles;

		for (let i = 0; i < Nx + 1; i++) {
			for (let j = 0; j < Ny + 1; j++) {
				if (i < Nx) {
					this.distConstraint(
						particles[i][j],
						particles[i + 1][j],
						dist,
					);
				}
				if (j < Ny) {
					this.distConstraint(
						particles[i][j],
						particles[i][j + 1],
						dist,
					);
				}
				if (i < Nx && j < Ny) {
					this.distConstraint(
						particles[i][j],
						particles[i + 1][j + 1],
						diagonalDistance,
					);
					this.distConstraint(
						particles[i + 1][j],
						particles[i][j + 1],
						diagonalDistance,
					);
				}
			}
		}
		// diagonals
		this.distConstraint(
			particles[0][0],
			particles[Nx][Ny],
			this.side * Math.SQRT2,
		);
		this.distConstraint(
			particles[0][Ny],
			particles[Nx][0],
			this.side * Math.SQRT2,
		);

		const halfPointWidth = Math.floor(Nx / 2);
		const halfPointHeight = Math.floor(Ny / 2);

		// 00 half
		this.distConstraint(
			particles[0][0],
			particles[0][halfPointHeight],
			this.side / 2,
		);
		this.distConstraint(
			particles[0][0],
			particles[halfPointWidth][0],
			this.side / 2,
		);

		// 0Ny half
		this.distConstraint(
			particles[0][Ny],
			particles[0][halfPointHeight],
			this.side / 2,
		);
		this.distConstraint(
			particles[0][Ny],
			particles[halfPointWidth][Ny],
			this.side / 2,
		);

		// Nx0 half
		this.distConstraint(
			particles[Nx][0],
			particles[Nx][halfPointHeight],
			this.side / 2,
		);
		this.distConstraint(
			particles[Nx][0],
			particles[halfPointWidth][0],
			this.side / 2,
		);

		// NxNy half
		this.distConstraint(
			particles[Nx][Ny],
			particles[Nx][halfPointHeight],
			this.side / 2,
		);
		this.distConstraint(
			particles[Nx][Ny],
			particles[halfPointWidth][Ny],
			this.side / 2,
		);

		for (const constraint of this.constraints) {
			WORLD.addConstraint(constraint);
		}
	}
	distConstraint(p1: CANNON.Body, p2: CANNON.Body, dist: number) {
		this.constraints.push(
			new CANNON.DistanceConstraint(p1, p2, dist),
		);
	}

	updateParticles() {
		const Nx = this.segments;
		const Ny = Nx;
		const cushion = this.meshObject;
		const particles = this.particles;

		for (let i = 0; i < Nx + 1; i++) {
			for (let j = 0; j < Ny + 1; j++) {
				const index = j * (Nx + 1) + i;

				const particlePosition = particles[i][Ny - j].position;

				const positionAttribute = cushion.geometry.attributes.position;

				positionAttribute.setXYZ(
					index,
					particlePosition.x,
					particlePosition.y,
					particlePosition.z,
				);

				positionAttribute.needsUpdate = true;
			}
		}
		this.meshObject.geometry.computeBoundingBox();
		this.meshObject.geometry.computeBoundingSphere();
	}
}
