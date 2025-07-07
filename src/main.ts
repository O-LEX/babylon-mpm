import { Engine, Scene, UniversalCamera, Vector3, HemisphericLight, CreateSphere, InstancedMesh, MeshBuilder, StandardMaterial, Color3 } from "@babylonjs/core";
import { MPM } from "./mpm";

function createScene(canvas: HTMLCanvasElement, engine: Engine): Scene {
    const scene = new Scene(engine);

    // Create orthographic camera for 2D view from the side
    const camera = new UniversalCamera("camera", new Vector3(0, 0, 10), scene);
    camera.setTarget(Vector3.Zero());
    
    // Set orthographic projection for true 2D appearance
    camera.mode = UniversalCamera.ORTHOGRAPHIC_CAMERA;
    camera.orthoTop = 5;
    camera.orthoBottom = -5;
    camera.orthoLeft = -5;
    camera.orthoRight = 5;
    
    // Disable default camera controls
    camera.inputs.clear();
    
    // Manual camera movement with keyboard
    const keys: { [key: string]: boolean } = {};
    const moveSpeed = 0.1;
    
    window.addEventListener("keydown", (event) => {
        keys[event.code] = true;
    });
    
    window.addEventListener("keyup", (event) => {
        keys[event.code] = false;
    });
    
    // Update camera position based on key input
    scene.registerBeforeRender(() => {
        if (keys["KeyW"] || keys["ArrowUp"]) {
            camera.position.y += moveSpeed;
        }
        if (keys["KeyS"] || keys["ArrowDown"]) {
            camera.position.y -= moveSpeed;
        }
        if (keys["KeyA"] || keys["ArrowLeft"]) {
            camera.position.x -= moveSpeed;
        }
        if (keys["KeyD"] || keys["ArrowRight"]) {
            camera.position.x += moveSpeed;
        }
        
        // Update camera target to maintain the view direction
        camera.setTarget(new Vector3(camera.position.x, camera.position.y, 0));
    });

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    return scene;
}

function createParticleSystem(scene: Scene, mpm: MPM) {
    // Create a base sphere for particles
    const baseSphere = CreateSphere("particle", { diameter: 0.05 }, scene);
    baseSphere.isVisible = false; // Hide the base mesh

    // Create instanced meshes for each particle
    const particleInstances: InstancedMesh[] = [];
    for (let i = 0; i < mpm.particles.length; i++) {
        const instance = baseSphere.createInstance(`particle_${i}`);
        particleInstances.push(instance);
    }

    return { baseSphere, particleInstances };
}

function updateParticles(mpm: MPM, particleInstances: InstancedMesh[]) {
    for (let i = 0; i < mpm.particles.length; i++) {
        const particle = mpm.particles[i];
        const instance = particleInstances[i];
        
        // Scale particle positions to scene coordinates (grid coordinates to -5 to 5 range)
        // Grid is 64x64, so normalize by dividing by 64, then scale to -5 to 5
        const sceneX = (particle.x.x / 64 - 0.5) * 10;
        const sceneY = (particle.x.y / 64 - 0.5) * 10;
        const sceneZ = 0;
        
        instance.position.set(sceneX, sceneY, sceneZ);
    }
}

function createGridWalls(scene: Scene) {
    const wallMaterial = new StandardMaterial("wallMaterial", scene);
    wallMaterial.diffuseColor = Color3.Red();
    wallMaterial.emissiveColor = Color3.Red();
    
    // Calculate wall positions based on grid boundary (64x64 grid)
    // Boundary is at grid position 3 and gridSize-3 (3 and 61)
    const leftWallPos = (3 / 64 - 0.5) * 10;
    const rightWallPos = (61 / 64 - 0.5) * 10;
    const bottomWallPos = (3 / 64 - 0.5) * 10;
    const topWallPos = (61 / 64 - 0.5) * 10;
    
    // Create wall lines using thin boxes
    const wallThickness = 0.05;
    const wallHeight = Math.abs(topWallPos - bottomWallPos);
    const wallWidth = Math.abs(rightWallPos - leftWallPos);
    
    // Left wall
    const leftWall = MeshBuilder.CreateBox("leftWall", {
        width: wallThickness,
        height: wallHeight,
        depth: 0.1
    }, scene);
    leftWall.position.x = leftWallPos;
    leftWall.position.y = (topWallPos + bottomWallPos) / 2;
    leftWall.material = wallMaterial;
    
    // Right wall
    const rightWall = MeshBuilder.CreateBox("rightWall", {
        width: wallThickness,
        height: wallHeight,
        depth: 0.1
    }, scene);
    rightWall.position.x = rightWallPos;
    rightWall.position.y = (topWallPos + bottomWallPos) / 2;
    rightWall.material = wallMaterial;
    
    // Bottom wall
    const bottomWall = MeshBuilder.CreateBox("bottomWall", {
        width: wallWidth,
        height: wallThickness,
        depth: 0.1
    }, scene);
    bottomWall.position.x = (leftWallPos + rightWallPos) / 2;
    bottomWall.position.y = bottomWallPos;
    bottomWall.material = wallMaterial;
    
    // Top wall
    const topWall = MeshBuilder.CreateBox("topWall", {
        width: wallWidth,
        height: wallThickness,
        depth: 0.1
    }, scene);
    topWall.position.x = (leftWallPos + rightWallPos) / 2;
    topWall.position.y = topWallPos;
    topWall.material = wallMaterial;
    
    return { leftWall, rightWall, bottomWall, topWall };
}

function main() {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const engine = new Engine(canvas, true);
    const scene = createScene(canvas, engine);

    const mpm = new MPM();
    const { particleInstances } = createParticleSystem(scene, mpm);
    
    // Create visible grid walls
    createGridWalls(scene);

    engine.runRenderLoop(() => {
        mpm.step();
        updateParticles(mpm, particleInstances);
        scene.render();
    });

    window.addEventListener("resize", () => {
        engine.resize();
    });
}

main();