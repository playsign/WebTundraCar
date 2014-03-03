"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE

/*
 *      @author Tapani Jamsa
 *      Date: 2014
 */

var app;
// var carSize; // TODO debug remove
var ground_material;

function init() {
    app = new CarApp();
    var host = "10.10.2.7"; // hostname of the Tundra server
    var port = 2345; // and port to the server

    app.start();

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    function createElement(pos, rot, scale) {
        var element = new Physijs.BoxMesh(
            new THREE.CubeGeometry(scale.x, scale.y, scale.z),
            ground_material,
            0 // mass
        );
        element.position.set(pos.x, pos.y, pos.z);
        element.rotation.set(rot.x, rot.y, rot.z);
        element.receiveShadow = true;
        app.viewer.scene.add(element);
    }

    // Custom app specific properties
    app.dataConnection.loginData = {
        "name": Date.now().toString() + getRandomInt(0, 2000000).toString()
    };

    // STATS
    app.physics_stats = new Stats();
    app.physics_stats.domElement.style.position = 'absolute';
    app.physics_stats.domElement.style.bottom = '50px';
    app.physics_stats.domElement.style.zIndex = 100;
    app.viewer.container.appendChild(app.physics_stats.domElement);

    // GROUND
    ground_material = Physijs.createMaterial(
        new THREE.MeshLambertMaterial({
        map: THREE.ImageUtils.loadTexture('images/rocks.jpg')
    }),
        0.8, // high friction
    .3 // low restitution
    );
    ground_material.map.wrapS = ground_material.map.wrapT = THREE.RepeatWrapping;
    ground_material.map.repeat.set(3, 3);
    createElement({
        x: 0,
        y: -3,
        z: -25
    }, {
        x: 0,
        y: 0,
        z: 0
    }, {
        x: 50,
        y: 1,
        z: 100
    });

    // RAMPS
    createElement({
        x: 0,
        y: -3,
        z: -10
    }, {
        x: -0.2,
        y: 0,
        z: 0
    }, {
        x: 10,
        y: 1,
        z: 13
    });
    createElement({
        x: 10,
        y: -3,
        z: -10
    }, {
        x: -0.5,
        y: 0,
        z: 0
    }, {
        x: 10,
        y: 1,
        z: 25
    });

    // WALLS
    createElement({
        x: -25,
        y: 0,
        z: -25
    }, {
        x: 0,
        y: 0,
        z: 0
    }, {
        x: 1,
        y: 25,
        z: 100
    });
    createElement({
        x: 25,
        y: 0,
        z: -25
    }, {
        x: 0,
        y: 0,
        z: 0
    }, {
        x: 1,
        y: 25,
        z: 100
    });
    createElement({
        x: 0,
        y: 0,
        z: -75
    }, {
        x: 0,
        y: 0,
        z: 0
    }, {
        x: 50,
        y: 25,
        z: 1
    });
    createElement({
        x: 0,
        y: 0,
        z: 25
    }, {
        x: 0,
        y: 0,
        z: 0
    }, {
        x: 50,
        y: 5,
        z: 1
    });

    // Car
    app.car = new Car(app, new THREE.Vector3(0, 2, 0));

    // CAMERA
    app.viewer.camera.position.set(0, 20, 40);
    app.viewer.camera.lookAt(new THREE.Vector3());
    app.car.useCameraFollow = false;

    // // FREE LOOK
    // var freeLookCtrl = new THREE.FreeLookControls(app.viewer.camera, app.viewer.renderer.domElement);
    // app.scene.add(freeLookCtrl.getObject());
    // // An object in freeLookCtrl that carries the camera. Set it's position instead of setting camera position directly
    // freeLookCtrl.getObject().position.set(0, 8.50, 28.50);

    app.connect(host, port);
}

function CarApp() {
    Application.call(this); // Super class
}

CarApp.prototype = new Application();

CarApp.prototype.constructor = CarApp;

CarApp.prototype.createViewer = function() {
    return new PhysijsView();
};

CarApp.prototype.logicUpdate = function(dt) {

    // PHYSICS

    // Fixed time step
    // app.viewer.scene.setFixedTimeStep(1 / 240);
    // var timeStep = 1 / 60;
    // var maxSubSteps = 5;
    // this.viewer.scene.simulate(timeStep, maxSubSteps); // run physics
    
    this.viewer.scene.simulate(); // run physics

    if (this.physics_stats) {
        this.physics_stats.update();
    }
};

init();
