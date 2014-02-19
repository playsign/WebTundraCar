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
    var host = "10.10.3.28"; // hostname of the Tundra server
    var port = 2345; // and port to the server

    app.start();

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
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

    var ground = new Physijs.BoxMesh(
        new THREE.CubeGeometry(200, 1, 200),
        ground_material,
        0 // mass
    );
    ground.position.set(0, -3, 0);
    // ground.rotation.set(0,0,0.2);
    ground.receiveShadow = true;
    app.viewer.scene.add(ground);

    // WALLS

    var wall = new Physijs.BoxMesh(
        new THREE.CubeGeometry(1, 50, 200),
        ground_material,
        0 // mass
    );
    wall.position.set(-50, 0, 0);
    wall.receiveShadow = true;
    app.viewer.scene.add(wall);

    var wall = new Physijs.BoxMesh(
        new THREE.CubeGeometry(1, 50, 200),
        ground_material,
        0 // mass
    );
    wall.position.set(50, 0, 0);
    wall.receiveShadow = true;
    app.viewer.scene.add(wall);

    var wall = new Physijs.BoxMesh(
        new THREE.CubeGeometry(200, 50, 1),
        ground_material,
        0 // mass
    );
    wall.position.set(0, 0, -50);
    wall.receiveShadow = true;
    app.viewer.scene.add(wall);

    var wall = new Physijs.BoxMesh(
        new THREE.CubeGeometry(200, 10, 1),
        ground_material,
        0 // mass
    );
    wall.position.set(0, 0, 50);
    wall.receiveShadow = true;
    app.viewer.scene.add(wall);

    // carSize = new Physijs.BoxMesh(
    //     new THREE.CubeGeometry(1, 4, 1),
    //     ground_material,
    //     0 // mass
    // );
    // carSize.position.set(0, 0, 0);
    // carSize.receiveShadow = true;
    // app.viewer.scene.add(carSize);

    // Car
    app.car = new Car(app);   

    // CAMERA
    app.viewer.camera.position.set(0, 100, 87);
    app.viewer.camera.lookAt(new THREE.Vector3());

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

    this.viewer.scene.simulate(); // run physics

    if (this.physics_stats) {
        this.physics_stats.update();
    }

};

init();
