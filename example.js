"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE

/*
 *      @author Tapani Jamsa
 *      Date: 2014
 */

var app;

function init() {
    app = new CarApp();
    var host = "10.10.3.28"; // hostname of the Tundra server
    var port = 2345; // and port to the server

    app.start();

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    // Custom app specific properties
    app.serverSceneCtrl = undefined;
    app.reservedCar = undefined;
    app.dataConnection.loginData = {
        "name": Date.now().toString() + getRandomInt(0, 2000000).toString()
    };

    // PHYSI.JS

    Physijs.scripts.worker = 'physijs_worker.js';
    Physijs.scripts.ammo = 'ammo.js';

    // Ground
    var ground_material = Physijs.createMaterial(
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
    ground.receiveShadow = true;
    app.viewer.scene.add(ground);


    // CAR

    app.car = new THREE.Car();
    app.car.modelScale = 0.8;
    app.car.backWheelOffset = 0.02;

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

    app.connect(host, port);

    function addCar(object, x, y, z, s) {
        console.log("Add car");

        object.root.position.set(x, y, z);
        app.viewer.scene.add(object.root);

        // object.root.castShadow = true;
        // object.root.receiveShadow = true;
    }

    // function checkSceneCondition(condition) {
    //     var range = condition.entityRangePresent;
    //     var i, o3d;
    //     if (range) {
    //         for (i = range.min; i < range.max; i++) {
    //             check(app.dataConnection.scene.entityById(i) !== null);
    //             o3d = app.viewer.o3dByEntityId[i];
    //             check(o3d !== null);
    //             check(o3d.userData.entityId == i);
    //         }
    //     }

    //     range = condition.entityRangeHaveMesh;
    //     if (range) {
    //         for (i = range.min; i < range.max; i++) {
    //             o3d = app.viewer.o3dByEntityId[i];
    //             check(o3d.children.length > 0);
    //         }
    //     }
    // }

    // function checkPhysics2() {
    //     var condition = {
    //         entityRangePresent: {
    //             min: 1,
    //             max: 563
    //         },
    //         entityRangeHaveMesh: {
    //             min: 1,
    //             max: 563
    //         },
    //     };
    //     checkSceneCondition();
    // }
}

function CarApp() {
    Application.call(this); // Super class
}

CarApp.prototype = new Application();

CarApp.prototype.constructor = CarApp;

CarApp.prototype.onConnected = function() {
    console.log("connected");
    this.connected = true;

    // Set callback function to know when a car is created
    this.dataConnection.scene.actionTriggered.add(this.onCarCreated.bind(this));
};

CarApp.prototype.onDisconnected = function() {
    console.log("disconnected");
    this.connected = false;
};

CarApp.prototype.logicInit = function() {

};

CarApp.prototype.logicUpdate = function(dt) {
    app.viewer.scene.simulate(); // run physics

    if (this.connected && this.reservedCar !== undefined) {
        // Set a new position for the entity
        var newTransform = this.reservedCar.placeable.transform;
        newTransform.pos.x = this.car.root.position.x;
        newTransform.pos.y = this.car.root.position.y;
        newTransform.pos.z = this.car.root.position.z;
        this.reservedCar.placeable.transform = newTransform;

        // Inform the server about the change
        this.dataConnection.syncManager.sendChanges();
    }
};

// Car created callback
CarApp.prototype.onCarCreated = function(scope, entity, action, params) {
    console.log("onCarCreated");

    this.getEntities();
};

CarApp.prototype.getEntities = function() {
    console.log("getEntities");

    this.reservedCar = undefined;

    // Find a car that matches with the player
    this.serverSceneCtrl = this.dataConnection.scene.entityByName("SceneController");
    var playerAmount = this.serverSceneCtrl.dynamicComponent.cars.length;
    for (var i = 0; i < this.serverSceneCtrl.dynamicComponent.cars.length; i++) {
        var entityID = this.serverSceneCtrl.dynamicComponent.cars[i];
        var entity = this.dataConnection.scene.entityById(entityID);
        if (!entity) {
            throw "entity not found";
        }
        if (entity.dynamicComponent.playerID == this.dataConnection.loginData.name) {
            // Set entity reference
            this.reservedCar = entity;

            break;
        }
    }

    if (this.reservedPlayerArea !== undefined) {
        this.setCameraPosition(playerAmount);
    }
};

init();
