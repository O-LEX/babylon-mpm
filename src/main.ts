import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, CreateSphere, InstancedMesh } from "@babylonjs/core";
import { MPM } from "./mpm";

function createScene(canvas: HTMLCanvasElement, engine: Engine): Scene {
    const scene = new Scene(engine);

    const camera = new ArcRotateCamera("cam", Math.PI / 2, Math.PI / 3, 15, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    new HemisphericLight("light", new Vector3(0, 1, 0), scene);

    return scene;
}

function createParticleSystem(scene: Scene, mpm: MPM) {
    const baseSphere = CreateSphere("particle", { diameter: 0.1 }, scene);
    baseSphere.isVisible = false;

    const particleInstances: InstancedMesh[] = [];
    for (let i = 0; i < mpm.particles.length; i++) {
        const instance = baseSphere.createInstance(`particle_${i}`);
        particleInstances.push(instance);
    }

    return particleInstances;
}

function updateParticles(mpm: MPM, particleInstances: InstancedMesh[]) {
    for (let i = 0; i < mpm.particles.length; i++) {
        const particle = mpm.particles[i];
        const instance = particleInstances[i];
        
        // Convert grid coordinates to scene coordinates
        const sceneX = (particle.x.x / 64 - 0.5) * 10;
        const sceneY = (particle.x.y / 64 - 0.5) * 10;
        
        instance.position.set(sceneX, sceneY, 0);
    }
}

function main() {
    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    const engine = new Engine(canvas, true);
    const scene = createScene(canvas, engine);

    const mpm = new MPM();
    const particleInstances = createParticleSystem(scene, mpm);

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