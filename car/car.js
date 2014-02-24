"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE

/*
 *      @author Tapani Jamsa
 *      Date: 2014
 */

function Car(webTundraApp, position) {
    if (webTundraApp instanceof Application === false) {
        throw ("Instance of WebTundra application is required");
    }

    if (!position) {
        position = new THREE.Vector3();
    }

    this.app = webTundraApp;
    // TODO this.hotkeys{}
    this.serverCarCtrl = undefined;
    this.reservedCar = undefined;
    this.vehicle = undefined;
    this.input = undefined;
    this.scale = 0.5;

    var loader = new THREE.JSONLoader();
    this.clock = new THREE.Clock();

    loader.load("car/GreenCarBase.js", function(car, car_materials) {
        loader.load("car/GreenCarWheel.js", function(wheel_geometry, wheel_materials) {
            var mass = 1500;
            var mesh = new Physijs.BoxMesh(
                car,
                new THREE.MeshFaceMaterial(car_materials),
                mass);
            mesh.position = position;
            mesh.castShadow = mesh.receiveShadow = true;

            this.vehicle = new Physijs.Vehicle(mesh, new Physijs.VehicleTuning(
                10.88,
                1.83,
                0.28,
                500,
                10.5,
                6000));
            this.vehicle.engineForwardForce = 1200;
            this.vehicle.engineBackwardForce = -1000;
            this.vehicle.brakeAmount = 250;
            this.vehicle.steeringDeceleration = 0.5;
            this.vehicle.steeringMax = 0.6;
            this.app.viewer.scene.add(this.vehicle);

            var wheel_material = new THREE.MeshFaceMaterial(wheel_materials);

            for (var i = 0; i < 4; i++) {
                var wheelProperties = this.getWheelProperties(i);

                this.vehicle.addWheel(
                    wheel_geometry,
                    wheel_material,
                    wheelProperties.connection_point,
                    wheelProperties.wheel_direction,
                    wheelProperties.wheel_axle,
                    wheelProperties.suspension_rest_length,
                    wheelProperties.wheel_radius,
                    i < 2 ? false : true);
            }

            this.input = {
                power: null,
                direction: null,
                steering: 0
            };
        }.bind(this));
    }.bind(this));

    // Converts from radians to degrees.
    Math.degrees = function(radians) {
        return radians * 180 / Math.PI;
    };
    // Converts from degrees to radians.
    Math.radians = function(degrees) {
        return degrees * Math.PI / 180;
    };
    Math.clamp = function(x, a, b) {
        return x < a ? a : (x > b ? b : x);
    };

    this.app.dataConnection.client.connected.add(this.connectionEstablished.bind(this));

    requestAnimationFrame(this.update.bind(this));
}

Car.prototype = {
    constructor: Car,

    // Connected to the server
    connectionEstablished: function() {
        // Set callback function to know when a car is created
        this.app.dataConnection.scene.actionTriggered.add(this.onActionTriggered.bind(this));
    },

    onActionTriggered: function(scope, param2, param3, param4) {
        if (param2 === "carCreated") {
            console.log("findMyCar");

            this.reservedCar = undefined;

            // Find a car that matches with the player
            this.serverCarCtrl = this.app.dataConnection.scene.entityByName("CarController");
            for (var i = 0; i < this.serverCarCtrl.dynamicComponent.cars.length; i++) {
                var entityID = this.serverCarCtrl.dynamicComponent.cars[i];
                var entity = this.app.dataConnection.scene.entityById(entityID);
                if (!entity) {
                    console.log("entity not found: " + entityID);
                } else if (entity.dynamicComponent.name === "Car" && entity.dynamicComponent.playerID == this.app.dataConnection.loginData.name) {
                    // Set entity reference
                    this.reservedCar = entity;
                    console.log("reserved car id: " + entity.id);

                    break;
                }
            }
        }
    },

    getWheelProperties: function(i) {
        var props = {};

        props.connection_point = new THREE.Vector3(
            i % 2 === 0 ? -1.9 * this.scale : 1.9 * this.scale, -0.6 * this.scale,
            i < 2 ? 3 * this.scale : -3 * this.scale);
        props.wheel_direction = new THREE.Vector3(0, -1, 0);
        props.wheel_axle = new THREE.Vector3(-1, 0, 0);
        props.suspension_rest_length = 0.4 * this.scale;
        props.wheel_radius = 0.7 * this.scale;

        return props;
    },

    update: function() {
        var delta = this.clock.getDelta(); // seconds 

        // INPUT
        if (this.input) {
            // Steering
            if (this.app.keyboard.pressed("left") || this.app.keyboard.pressed("a")) {
                this.input.direction = 1;
            } else if (this.app.keyboard.pressed("right") || this.app.keyboard.pressed("d")) {
                this.input.direction = -1;
            } else {
                this.input.direction = 0;
            }

            // Acceleration
            if (this.app.keyboard.pressed("up") || this.app.keyboard.pressed("w")) {
                this.input.power = true;
                this.vehicle.engineForceAmount = this.vehicle.engineForwardForce;
            } else if (this.app.keyboard.pressed("down") || this.app.keyboard.pressed("s")) {
                this.input.power = true;
                this.vehicle.engineForceAmount = this.vehicle.engineBackwardForce;
            } else {
                this.input.power = false;
            }

            // Brake
            if (this.app.keyboard.pressed("space")) {
                this.vehicle.setBrake(this.vehicle.brakeAmount, 2);
                this.vehicle.setBrake(this.vehicle.brakeAmount, 3);
            } else {
                this.vehicle.setBrake(0, 2);
                this.vehicle.setBrake(0, 3);
            }

            // Update engine and steering
            if (this.input && this.vehicle) {
                if (this.input.direction !== 0) {
                    this.input.steering += this.input.direction / 50;
                    if (this.input.steering < -this.vehicle.steeringMax) this.input.steering = -this.vehicle.steeringMax;
                    if (this.input.steering > this.vehicle.steeringMax) this.input.steering = this.vehicle.steeringMax;
                } else {
                    // Decay steering
                    if (this.input.steering > 0) {
                        this.input.steering = Math.clamp(this.input.steering - delta * this.vehicle.steeringDeceleration, 0, this.vehicle.steeringMax);
                    } else {
                        this.input.steering = Math.clamp(this.input.steering + delta * this.vehicle.steeringDeceleration, -this.vehicle.steeringMax, 0);
                    }
                }
                this.vehicle.setSteering(this.input.steering, 0);
                this.vehicle.setSteering(this.input.steering, 1);

                if (this.input.power === true) {
                    this.vehicle.applyEngineForce(this.vehicle.engineForceAmount);
                } else if (this.input.power === false) {
                    this.vehicle.applyEngineForce(0);
                }
            }
        }

        // WEBTUNDRA

        if (this.app.connected) {
            // Apply mustang boxmesh transform to corresponding placeable transform
            if (this.reservedCar !== undefined && this.vehicle !== undefined) {
                // Set a new position for the entity
                var newTransform = this.reservedCar.placeable.transform;

                // Position
                newTransform.pos.x = this.vehicle.mesh.position.x;
                newTransform.pos.y = this.vehicle.mesh.position.y;
                newTransform.pos.z = this.vehicle.mesh.position.z;
                // Rotation
                this.vehicle.mesh.quaternion._euler._order = "ZYX";
                newTransform.rot.x = Math.degrees(this.vehicle.mesh.rotation.x);
                newTransform.rot.y = Math.degrees(this.vehicle.mesh.rotation.y);
                newTransform.rot.z = Math.degrees(this.vehicle.mesh.rotation.z);

                // console.clear();
                // console.log(this.vehicle.mesh.rotation);
                // console.log(newTransform.rot);

                this.reservedCar.placeable.transform = newTransform;
            }

            // Apply new received car placeable positions (excluding our car) to corresponding placeable transforms
            if (this.serverCarCtrl) {
                for (var i = 0; i < this.serverCarCtrl.dynamicComponent.cars.length; i++) {
                    var entID = this.serverCarCtrl.dynamicComponent.cars[i];
                    var entity = this.app.dataConnection.scene.entityById(entID);
                    if (!entity || entity.dynamicComponent.name !== "Car" || entity.boxMesh === "loading" || entity.dynamicComponent.playerID == this.app.dataConnection.loginData.name) {
                        continue;
                    }
                    var ent = entity;

                    // Create boxmesh if it doesn't already exist
                    if (ent.boxMesh === undefined) {
                        var loader = new THREE.JSONLoader();
                        ent.boxMesh = "loading";
                        console.log(ent);

                        var scope = {
                            entity: ent,
                            car: this,
                        }

                        loader.load("car/GreenCarBase.js", function(car, car_materials) {
                            loader.load("car/GreenCarWheel.js", function(wheel_geometry, wheel_materials) {
                                var newCar = this.entity;
                                console.log("loader.load");

                                var mass = 1500;
                                newCar.boxMesh = new Physijs.BoxMesh(
                                    car,
                                    new THREE.MeshFaceMaterial(car_materials),
                                    mass);
                                newCar.boxMesh.castShadow = newCar.boxMesh.receiveShadow = true;

                                this.car.app.viewer.scene.add(newCar.boxMesh);

                                var wheel_material = new THREE.MeshFaceMaterial(wheel_materials);

                                for (var i = 0; i < 4; i++) {
                                    // Wheel properties
                                    var wheelProperties = this.car.getWheelProperties(i);

                                    // Wheel mesh
                                    var wheelMesh = new THREE.Mesh(wheel_geometry, wheel_material);
                                    wheelMesh.castShadow = wheelMesh.receiveShadow = true;
                                    wheelMesh.position.copy(wheelProperties.wheel_direction).multiplyScalar(wheelProperties.suspension_rest_length / 100).add(wheelProperties.connection_point);
                                    newCar.boxMesh.add(wheelMesh);
                                    // this.wheels.push(wheelMesh);
                                }
                            }.bind(this));
                        }.bind(scope));
                    } else {
                        ent.boxMesh.__dirtyPosition = true;
                        ent.boxMesh.__dirtyRotation = true;

                        copyXyz(ent.placeable.transform.pos, ent.boxMesh.position);
                        copyXyz(ent.placeable.transform.scale, ent.boxMesh.scale);
                        tundraToThreeEuler(ent.placeable.transform.rot, ent.boxMesh.rotation, this.app.viewer.degToRad);
                    }
                }
            }

            // Inform the server about the change
            this.app.dataConnection.syncManager.sendChanges();
        }

        requestAnimationFrame(function() {
            this.update();
        }.bind(this));
    },
}
