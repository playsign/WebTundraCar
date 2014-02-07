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

    // Stats
    app.physics_stats = new Stats();
    app.physics_stats.domElement.style.position = 'absolute';
    app.physics_stats.domElement.style.bottom = '50px';
    app.physics_stats.domElement.style.zIndex = 100;
    app.viewer.container.appendChild(app.physics_stats.domElement);

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

    // Car

    // app.car = new THREE.Car();
    // app.car.modelScale = 0.8;
    // app.car.backWheelOffset = 0.02;
    // app.car.callback = function(object) {
    //     addCar(object, 0, 0, 0, 1); //10
    // };
    // app.car.loadPartsJSON("GreenCar.js", "GreenCar.js");

    // app.vehicle_body = undefined;
    app.vehicle = undefined;
    app.input = undefined;

    var loader = new THREE.JSONLoader();

    loader.load("models/mustang.js", function(car, car_materials) {
        loader.load("models/mustang_wheel.js", function(wheel, wheel_materials) {
            var mesh = new Physijs.BoxMesh(
                car,
                new THREE.MeshFaceMaterial(car_materials));
            mesh.position.y = 2;
            mesh.castShadow = mesh.receiveShadow = true;

            app.vehicle = new Physijs.Vehicle(mesh, new Physijs.VehicleTuning(
                10.88,
                1.83,
                0.28,
                500,
                10.5,
                6000));
            app.viewer.scene.add(app.vehicle);

            var wheel_material = new THREE.MeshFaceMaterial(wheel_materials);

            for (var i = 0; i < 4; i++) {
                app.vehicle.addWheel(
                    wheel,
                    wheel_material,
                    new THREE.Vector3(
                    i % 2 === 0 ? -1.6 : 1.6, -1,
                    i < 2 ? 3.3 : -3.2),
                    new THREE.Vector3(0, -1, 0),
                    new THREE.Vector3(-1, 0, 0),
                    0.5,
                    0.7,
                    i < 2 ? false : true);
            }

            app.input = {
                power: null,
                direction: null,
                steering: 0
            };
            document.addEventListener('keydown', function(ev) {
                switch (ev.keyCode) {
                    // case 37: // left
                    //     app.input.direction = 1;
                    //     break;

                    // case 38: // forward
                    //     app.input.power = true;
                    //     break;

                    // case 39: // right
                    //     app.input.direction = -1;
                    //     break;

                    // case 40: // back
                    //     app.input.power = false;
                    //     break;

                    case 65: // left
                        app.input.direction = 1;
                        break;

                    case 87: // forward
                        app.input.power = true;
                        break;

                    case 68: // right
                        app.input.direction = -1;
                        break;

                    case 83: // back
                        app.input.power = false;
                        break;
                }
            });
            document.addEventListener('keyup', function(ev) {
                switch (ev.keyCode) {
                    // case 37: // left
                    //     app.input.direction = null;
                    //     break;

                    // case 38: // forward
                    //     app.input.power = null;
                    //     break;

                    // case 39: // right
                    //     app.input.direction = null;
                    //     break;

                    // case 40: // back
                    //     app.input.power = null;
                    //     break;

                    case 65: // left
                        app.input.direction = null;
                        break;

                    case 87: // forward
                        app.input.power = null;
                        break;

                    case 68: // right
                        app.input.direction = null;
                        break;

                    case 83: // back
                        app.input.power = null;
                        break;
                }
            });
        });
    });

    // CAMERA
    app.viewer.camera.position.set(0, 100, 87);
    app.viewer.camera.lookAt(new THREE.Vector3());

    // // FREE LOOK
    // var freeLookCtrl = new THREE.FreeLookControls(app.viewer.camera, app.viewer.renderer.domElement);
    // app.scene.add(freeLookCtrl.getObject());
    // // An object in freeLookCtrl that carries the camera. Set it's position instead of setting camera position directly
    // freeLookCtrl.getObject().position.set(0, 8.50, 28.50);

    app.connect(host, port);

    // function addCar(object, x, y, z, s) {
    //     console.log("Add car");

    //     // object.root.position.set(x, y, z);
    //     // app.viewer.scene.add(object.root);

    //     // object.root.castShadow = true;
    //     // object.root.receiveShadow = true;
    // }

    // Converts from degrees to radians.
    Math.radians = function(degrees) {
        return degrees * Math.PI / 180;
    };

    // Converts from radians to degrees.
    Math.degrees = function(radians) {
        return radians * 180 / Math.PI;
    };
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
    if (this.input && this.vehicle) {
        if (this.input.direction !== null) {
            this.input.steering += this.input.direction / 50;
            if (this.input.steering < -.6) this.input.steering = -.6;
            if (this.input.steering > .6) this.input.steering = .6;
        }
        this.vehicle.setSteering(this.input.steering, 0);
        this.vehicle.setSteering(this.input.steering, 1);

        if (this.input.power === true) {
            this.vehicle.applyEngineForce(300);
        } else if (this.input.power === false) {
            this.vehicle.setBrake(20, 2);
            this.vehicle.setBrake(20, 3);
        } else {
            this.vehicle.applyEngineForce(0);
        }
    }

    this.viewer.scene.simulate(); // run physics

    if (this.physics_stats) {
        this.physics_stats.update();
    }

    if (this.connected && this.reservedCar !== undefined && this.vehicle !== undefined) {
        // Set a new position for the entity
        var newTransform = this.reservedCar.placeable.transform;

        // Position
        newTransform.pos.x = this.vehicle.mesh.position.x;
        newTransform.pos.y = this.vehicle.mesh.position.y;
        newTransform.pos.z = this.vehicle.mesh.position.z;
        // Rotation
        newTransform.rot.x = Math.degrees(this.vehicle.mesh.rotation.x);
        newTransform.rot.y = Math.degrees(this.vehicle.mesh.rotation.y);
        newTransform.rot.z = Math.degrees(this.vehicle.mesh.rotation.z);

        // console.clear();
        // console.log(this.vehicle.mesh.rotation);
        // console.log(newTransform.rot);

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
