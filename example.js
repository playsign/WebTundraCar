"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE

/*
 *      @author Tapani Jamsa
 *      Date: 2014
 */

var app = new Application();


var host = "10.10.3.28"; // hostname of the Tundra server
var port = 2345; // and port to the server

app.start();

// Custom app specific properties

// PHYSI.JS

Physijs.scripts.worker = 'physijs_worker.js';
Physijs.scripts.ammo = 'ammo.js';

// Ground
var ground_material = Physijs.createMaterial(
    new THREE.MeshLambertMaterial({
    map: THREE.ImageUtils.loadTexture('images/rocks.jpg')
}),
    .8, // high friction
.3 // low restitution
);
ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
ground_material.map.repeat.set(3, 3);

var ground = new Physijs.BoxMesh(
    new THREE.CubeGeometry(200, 1, 200),
    ground_material,
    0 // mass
);
ground.position.set(0,-5,0);
ground.receiveShadow = true;
app.viewer.scene.add(ground);


// CAR

app.car = new THREE.Car();
app.car.modelScale = 0.8;
app.car.backWheelOffset = 0.02;

app.car.MAX_SPEED = 25; //25
app.car.MAX_REVERSE_SPEED = -15; //-15
app.car.FRONT_ACCELERATION = 25; //12
app.car.BACK_ACCELERATION = 15; //15

app.car.WHEEL_ANGULAR_ACCELERATION = 1.5; //1.5

app.car.FRONT_DECCELERATION = 10; //10
app.car.WHEEL_ANGULAR_DECCELERATION = 1; //1.0

app.car.STEERING_RADIUS_RATIO = 0.23; //0.23

app.car.callback = function(object) {
    addCar(object, 0, 0, 0, 1); //10
};

app.car.loadPartsJSON("GreenCar.js", "GreenCar.js");

// CAMERA
app.viewer.camera.position.set(0, 100, 87);
app.viewer.camera.lookAt(new THREE.Vector3());

// // FREE LOOK
// var freeLookCtrl = new THREE.FreeLookControls(app.viewer.camera, app.viewer.renderer.domElement);
// app.scene.add(freeLookCtrl.getObject());
// // An object in freeLookCtrl that carries the camera. Set it's position instead of setting camera position directly
// freeLookCtrl.getObject().position.set(0, 8.50, 28.50);

// app.connect(host, port);

app.logicUpdate = function(dt) {
    app.viewer.scene.simulate(); // run physics
};

function addCar(object, x, y, z, s) {
    console.log("Add car");

    object.root.position.set(x, y, z);
    app.viewer.scene.add(object.root);

    // object.root.castShadow = true;
    // object.root.receiveShadow = true;
}

function checkSceneCondition(condition) {
    var range = condition.entityRangePresent;
    var i, o3d;
    if (range) {
        for (i = range.min; i < range.max; i++) {
            check(app.dataConnection.scene.entityById(i) !== null);
            o3d = app.viewer.o3dByEntityId[i];
            check(o3d !== null);
            check(o3d.userData.entityId == i);
        }
    }

    range = condition.entityRangeHaveMesh;
    if (range) {
        for (i = range.min; i < range.max; i++) {
            o3d = app.viewer.o3dByEntityId[i];
            check(o3d.children.length > 0);
        }
    }
}

function checkPhysics2() {
    var condition = {
        entityRangePresent: {
            min: 1,
            max: 563
        },
        entityRangeHaveMesh: {
            min: 1,
            max: 563
        },
    };
    checkSceneCondition();
}
