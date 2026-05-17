import * as THREE from 'three'; 
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';

// import objects
const calculatorUrl = new URL('../srcs/three_assets/calculator.glb', import.meta.url);
const folderUrl = new URL('../srcs/three_assets/folder.glb', import.meta.url);
const calendarUrl = new URL('../srcs/three_assets/calendar.glb', import.meta.url);

// HTML container
const container = document.getElementById('canvas-container');

const renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// renderer size
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    90, 
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);

// const axesHelper = new THREE.AxesHelper(5);
// scene.add(axesHelper);

// const planeGeometry = new THREE.PlaneGeometry(10, 10);
// const planeMterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
// const plane = new THREE.Mesh(planeGeometry, planeMterial);
// plane.receiveShadow = true;
// scene.add(plane);

const assetLoader = new GLTFLoader();

let calculators = [];
let folder = [];
let calendar = [];

assetLoader.load(calculatorUrl.href, function(gltf) {
    const baseModel = gltf.scene;
    
    // Positions (x, y, z, rotationY)
    const positions = [
        { x: -8, y: 3,  z: -2, rotY: -1.5, rotX: 1.8, rotZ: 0.4    },  // Top left
        { x: -4, y: -1, z: -3, rotY: 0.8, rotX: 0, rotZ: 0.4    },  // Center left
        { x: 9,  y: 1,  z: -1, rotY: -1.4, rotX: 1.6, rotZ: 0.4    },  // Mid right
        { x: 4,  y: 3,  z: -5, rotY: -0.8, rotX: 0, rotZ: 0.4    }  // Back top right
    ];

    positions.forEach((pos, index) => {
        const model = baseModel.clone();
        
        model.position.set(pos.x, -15, pos.z); 
        model.rotation.set(pos.rotX, pos.rotY, pos.rotZ);
        model.scale.set(0.02, 0.02, 0.02); 
        scene.add(model);

        const objEntry = {
            mesh: model,
            targetY: pos.y,
            offset: index * 0.5,
            idleAmplitude: 0
        };

        gsap.to(model.position, {
            y: pos.y,
            duration: 1.8,
            delay: index * 0.15,
            ease: "back.out(1.2)",
        });

        gsap.to(objEntry, {
            idleAmplitude: 1, 
            duration: 2.5,
            delay: index * 0.15 + 0.5 
        });

        calculators.push(objEntry);
    });
    
}, undefined, function(error) {
    console.log(error);
});

assetLoader.load(folderUrl.href, function(gltf) {
    const baseModel = gltf.scene;
    
    // Positions (x, y, z, rotationY)
    const positions = [
        { x: -9, y: 0,  z: -1, rotY: -0.9, rotX: 1.5, rotZ: 0   },  // Mid left
        { x: 8,  y: 3.5, z: -2, rotY: 0.8, rotX: 1.6, rotZ: 0   }, // Top right
        { x: 7,  y: -2, z: -2, rotY: 0, rotX: 1.7, rotZ: 0    }, // Bottom right
    ];

    positions.forEach((pos, index) => {
        const model = baseModel.clone();
        
        model.position.set(pos.x, -15, pos.z); 
        model.rotation.set(pos.rotX, pos.rotY, pos.rotZ);
        model.scale.set(0.1, 0.1, 0.1); 
        scene.add(model);

        const objEntry = {
            mesh: model,
            targetY: pos.y,
            offset: index * 0.5,
            idleAmplitude: 0
        };

        gsap.to(model.position, {
            y: pos.y,
            duration: 1.8,
            delay: index * 0.15,
            ease: "back.out(1.2)",
        });

        gsap.to(objEntry, {
            idleAmplitude: 1, 
            duration: 2.5,
            delay: index * 0.15 + 0.5 
        });

        folder.push(objEntry);
    });
    
}, undefined, function(error) {
    console.log(error);
});

assetLoader.load(calendarUrl.href, function(gltf) {
    const baseModel = gltf.scene;
    
    // Positions (x, y, z, rotationY)
    const positions = [
        { x: -7, y: -3, z: -2, rotY: 0.4, rotX: 1.9, rotZ: -0.6 }, // Bottom left
        { x: 5,  y: -4, z: -3, rotY: -0.5, rotX: 1.7, rotZ: -0.1  },  // Far bottom right
        { x: -5, y: 4,  z: -4, rotY: 0.3, rotX: 1.8, rotZ: 0.4  },  // Back top left
    ];

    positions.forEach((pos, index) => {
        const model = baseModel.clone();
        
        model.position.set(pos.x, -15, pos.z); 
        model.rotation.set(pos.rotX, pos.rotY, pos.rotZ);
        model.scale.set(0.1, 0.1, 0.1); 
        scene.add(model);

        const objEntry = {
            mesh: model,
            targetY: pos.y,
            offset: index * 0.5,
            idleAmplitude: 0
        };

        gsap.to(model.position, {
            y: pos.y,
            duration: 1.8,
            delay: index * 0.15,
            ease: "back.out(1.2)",
        });

        gsap.to(objEntry, {
            idleAmplitude: 1, 
            duration: 2.5,
            delay: index * 0.15 + 0.5 
        });

        calendar.push(objEntry);
    });
    
}, undefined, function(error) {
    console.log(error);
});


// light

const spotLight = new THREE.SpotLight(0xFFFFFF, 50);
spotLight.angle = Math.PI / 6;
spotLight.penumbra = 0.3;
spotLight.decay = 1;
spotLight.distance = 100;

camera.add(spotLight);
spotLight.position.set(0, 0, 0); 

scene.add(camera);
spotLight.target = camera;


const ambientLight = new THREE.AmbientLight(0x333333, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 5);
directionalLight.position.set(0, 4, 4); // x, y, z
directionalLight.castShadow = false;

directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -5;
directionalLight.shadow.camera.right = 5;
directionalLight.shadow.camera.top = 5;
directionalLight.shadow.camera.bottom = -5;
directionalLight.shadow.bias = -0.0005;
scene.add(directionalLight);

// const dLightHelper = new THREE.DirectionalLightHelper(directionalLight); 
// scene.add(dLightHelper);

// plane.rotation.x = -0.5 * Math.PI;
function animate(time) {
    const updateMotion = (obj) => {

        const floatY = Math.sin(time / 1000 + obj.offset) * 0.2 * obj.idleAmplitude;
        const wiggleZ = Math.sin(time / 2000 + obj.offset) * 0.1 * obj.idleAmplitude;

        obj.mesh.position.y += (floatY * 0.01);

        obj.mesh.rotation.z = obj.mesh.rotation.z + (wiggleZ * 0.001);
    };

    calculators.forEach(updateMotion);
    folder.forEach(updateMotion);
    calendar.forEach(updateMotion);

    renderer.render(scene, camera);
}

                //  x, y, z
camera.position.set(0, 2, 4);
renderer.setAnimationLoop(animate);

// resize listener 
window.addEventListener('resize', function() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});