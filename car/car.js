"use strict";
/* globals Tundra, Physijs, THREE, Stats, CarApp, Car, PhysijsView */

// For conditions of distribution and use, see copyright notice in LICENSE

/*
 *      @author Tapani Jamsa
 *      Date: 2014
 */

function Car(webTundraApp, position) {
    if (webTundraApp instanceof Tundra.Application === false) {
        throw ("Instance of WebTundra application is required");
    }

    if (position) {
        this.spawnPosition = position;
    } else {
        this.spawnPosition = new THREE.Vector3();
    }

    this.app = webTundraApp;
    this.keyconfig = {
        // Steer left
        left: "left",
        leftSecondary: "a",
        // Steer right
        right: "right",
        rightSecondary: "d",
        // Accelerate 
        accelerate: "up",
        accelerateSecondary: "w",
        // Deccelerate
        deccelearate: "down",
        deccelerateSecondary: "s",
        // Brake
        brake: "space",
        brakeSecondary: "ctrl"
    };
    this.serverCarCtrl = undefined;
    this.reservedCar = undefined;
    this.vehicle = undefined;
    this.input = undefined;
    this.scale = 0.5;
    this.useCameraFollow = false;

    // Default vehicle properties
    this.mass = 1500;
    this.suspension_stiffness = 10.88;
    this.suspension_compression = 1.83;
    this.suspension_damping = 0.28;
    this.max_suspension_travel = 500;
    this.friction_slip = 10.5;
    this.max_suspension_force = 6000;
    this.engineForwardForce = 1200;
    this.engineBackwardForce = -1000;
    this.brakeAmount = 250;
    this.steeringDeceleration = 0.5;
    this.steeringMax = 0.6;

    var loader = new THREE.JSONLoader();
    this.clock = new THREE.Clock();

    loader.load("car/GreenCarBase.js", function(car, car_materials) {
        loader.load("car/GreenCarWheel.js", function(wheel_geometry, wheel_materials) {
            var mass = this.mass;
            var mesh = new Physijs.BoxMesh(
                car,
                new THREE.MeshFaceMaterial(car_materials),
                mass);
            mesh.position = this.spawnPosition.clone();
            mesh.castShadow = mesh.receiveShadow = true;

            this.vehicle = new Physijs.Vehicle(mesh, new Physijs.VehicleTuning(
                this.suspension_stiffness,
                this.suspension_compression,
                this.suspension_damping,
                this.max_suspension_travel,
                this.friction_slip,
                this.max_suspension_force));
            this.vehicle.engineForwardForce = this.engineForwardForce;
            this.vehicle.engineBackwardForce = this.engineBackwardForce;
            this.vehicle.brakeAmount = this.brakeAmount;
            this.vehicle.steeringDeceleration = this.steeringDeceleration;
            this.vehicle.steeringMax = this.steeringMax;
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
                steering: 0,
                brakeRear: 0,
                brakeFront: 0
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
            if (this.app.keyboard.pressed(this.keyconfig.left) || this.app.keyboard.pressed(this.keyconfig.leftSecondary)) {
                this.input.direction = 1;
            } else if (this.app.keyboard.pressed(this.keyconfig.right) || this.app.keyboard.pressed(this.keyconfig.rightSecondary)) {
                this.input.direction = -1;
            } else {
                this.input.direction = 0;
            }

            // Acceleration and decceleration
            if (this.app.keyboard.pressed(this.keyconfig.accelerate) || this.app.keyboard.pressed(this.keyconfig.accelerateSecondary)) {
                this.input.power = true;
                this.vehicle.engineForceAmount = this.vehicle.engineForwardForce;
            } else if (this.app.keyboard.pressed(this.keyconfig.deccelearate) || this.app.keyboard.pressed(this.keyconfig.deccelerateSecondary)) {
                this.input.power = true;
                this.vehicle.engineForceAmount = this.vehicle.engineBackwardForce;
            } else {
                this.input.power = false;
                this.vehicle.engineForceAmount = 0;
            }

            // Brake
            if (this.app.keyboard.pressed(this.keyconfig.brake) || this.app.keyboard.pressed(this.keyconfig.brakeSecondary)) {
                this.input.brakeRear = this.vehicle.brakeAmount;
                this.vehicle.setBrake(this.input.brakeRear, 2);
                this.vehicle.setBrake(this.input.brakeRear, 3);
            } else {
                this.input.brakeRear = 0;
                this.vehicle.setBrake(this.input.brakeRear, 2);
                this.vehicle.setBrake(this.input.brakeRear, 3);
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
            // Apply physijs vehicle data to corresponding webtundra entity
            if (this.reservedCar !== undefined && this.vehicle !== undefined) {
                this.updateLocalCarEntity();
            }

            // Apply new received webtundra entity data (excluding our car) to corresponding physijs vehicle
            if (this.serverCarCtrl) {
                for (var i = 0; i < this.serverCarCtrl.dynamicComponent.cars.length; i++) {
                    this.updateRemoteCarPhysijs(this.serverCarCtrl.dynamicComponent.cars[i]);
                }
            }

            if (this.reservedCar && (isNaN(this.reservedCar.threeGroup.position.x) || isNaN(this.reservedCar.dynamicComponent.engineForce))) {
                console.warn("app.car.reservedCar.threeGroup.position.x is NaN");
            } else {
                // Inform the server about the change
                this.app.dataConnection.syncManager.sendChanges();
            }
        }

        // Camera follow
        if (this.useCameraFollow && this.vehicle) {
            var relativeCameraOffset = new THREE.Vector3(0, 3, -15);

            var cameraOffset = relativeCameraOffset.applyMatrix4(this.vehicle.mesh.matrixWorld);

            this.app.viewer.camera.position.x = cameraOffset.x;
            this.app.viewer.camera.position.y = cameraOffset.y;
            this.app.viewer.camera.position.z = cameraOffset.z;
            this.app.viewer.camera.lookAt(this.vehicle.mesh.position);
            this.app.viewer.camera.position.y += 3;
        }

        requestAnimationFrame(function() {
            this.update();
        }.bind(this));
    },

    updateLocalCarEntity: function() {
        // TRANSFORM

        // Set a new position for the entity
        var newTransform = this.reservedCar.placeable.transform;

        // Position
        newTransform.pos.x = this.vehicle.mesh.position.x;
        newTransform.pos.y = this.vehicle.mesh.position.y;
        newTransform.pos.z = this.vehicle.mesh.position.z;
        // Rotation
        var e = new THREE.Euler(0, 0, 0, "ZYX");
        e.setFromQuaternion(this.vehicle.mesh.quaternion, undefined, false);
        newTransform.rot.x = Math.degrees(e.x);
        newTransform.rot.y = Math.degrees(e.y);
        newTransform.rot.z = Math.degrees(e.z);

        // console.clear();
        // console.log(this.vehicle.mesh.rotation);
        // console.log(newTransform.rot);

        this.reservedCar.placeable.transform = newTransform;

        // DYNAMIC COMPONENT

        // Set velocity
        this.reservedCar.dynamicComponent.linearVelocity = {
            x: this.vehicle.mesh.getLinearVelocity().x,
            y: this.vehicle.mesh.getLinearVelocity().y,
            z: this.vehicle.mesh.getLinearVelocity().z
        };
        this.reservedCar.dynamicComponent.angularVelocity = {
            x: this.vehicle.mesh.getAngularVelocity().x,
            y: this.vehicle.mesh.getAngularVelocity().y,
            z: this.vehicle.mesh.getAngularVelocity().z
        };

        this.reservedCar.dynamicComponent.steering = this.input.steering;
        this.reservedCar.dynamicComponent.brakeFront = this.input.brakeFront;
        this.reservedCar.dynamicComponent.brakeRear = this.input.brakeRear;
        this.reservedCar.dynamicComponent.engineForce = this.vehicle.engineForceAmount;
    },

    updateRemoteCarPhysijs: function(entID) {
        var entity = this.app.dataConnection.scene.entityById(entID);
        if (!entity || entity.dynamicComponent.name !== "Car" || entity.boxMesh === "loading" || entity.dynamicComponent.playerID == this.app.dataConnection.loginData.name) {
            return;
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
            };

            var loader = new THREE.JSONLoader();

            loader.load("car/GreenCarBase.js", function(car, car_materials) {
                loader.load("car/GreenCarWheel.js", function(wheel_geometry, wheel_materials) {
                    var newCar = this.entity;

                    var mass = this.car.mass;
                    newCar.boxMesh = new Physijs.BoxMesh(
                        car,
                        new THREE.MeshFaceMaterial(car_materials),
                        mass);
                    newCar.boxMesh.position = this.car.spawnPosition;
                    newCar.boxMesh.castShadow = newCar.boxMesh.receiveShadow = true;

                    newCar.boxMesh.vehicle = new Physijs.Vehicle(newCar.boxMesh, new Physijs.VehicleTuning(
                        this.car.suspension_stiffness,
                        this.car.suspension_compression,
                        this.car.suspension_damping,
                        this.car.max_suspension_travel,
                        this.car.friction_slip,
                        this.car.max_suspension_force));
                    newCar.boxMesh.vehicle.engineForwardForce = this.car.engineForwardForce;
                    newCar.boxMesh.vehicle.engineBackwardForce = this.car.engineBackwardForce;
                    newCar.boxMesh.vehicle.brakeAmount = this.car.brakeAmount;
                    newCar.boxMesh.vehicle.steeringDeceleration = this.car.steeringDeceleration;
                    newCar.boxMesh.vehicle.steeringMax = this.car.steeringMax;
                    this.car.app.viewer.scene.add(newCar.boxMesh.vehicle);

                    var wheel_material = new THREE.MeshFaceMaterial(wheel_materials);

                    for (var i = 0; i < 4; i++) {
                        var wheelProperties = this.car.getWheelProperties(i);

                        newCar.boxMesh.vehicle.addWheel(
                            wheel_geometry,
                            wheel_material,
                            wheelProperties.connection_point,
                            wheelProperties.wheel_direction,
                            wheelProperties.wheel_axle,
                            wheelProperties.suspension_rest_length,
                            wheelProperties.wheel_radius,
                            i < 2 ? false : true);
                    }

                    // this.car.input = {
                    //     power: null,
                    //     direction: null,
                    //     steering: 0
                    // };
                }.bind(this));
            }.bind(scope));
        } else {
            var transformVec = new THREE.Vector3(ent.placeable.transform.pos.x, ent.placeable.transform.pos.y, ent.placeable.transform.pos.z);
            var errorVec = new THREE.Vector3();

            errorVec.subVectors(transformVec, ent.boxMesh.position);
            // console.clear();
            // console.log("length: " + errorVec.length());
            // console.log("length: " + errorVec.lengthSq());

            if (errorVec === undefined || errorVec.length() > 9) {
                console.log("set position");
                if (errorVec !== undefined) {
                    console.log("error length: " + errorVec.length());
                }

                // console.clear();
                // console.log(ent.previousThreePos);
                // console.log(ent.placeable.transform.pos);

                ent.boxMesh.__dirtyPosition = true;
                ent.boxMesh.__dirtyRotation = true;

                copyXyz(ent.placeable.transform.pos, ent.boxMesh.position);
                copyXyz(ent.placeable.transform.scale, ent.boxMesh.scale);
                tundraToThreeEuler(ent.placeable.transform.rot, ent.boxMesh.rotation, this.app.viewer.degToRad);
            }

            if (!ent.previousLinearVelocity || !(ent.previousLinearVelocity.x == ent.dynamicComponent.linearVelocity.x && ent.previousLinearVelocity.y == ent.dynamicComponent.linearVelocity.y && ent.previousLinearVelocity.z == ent.dynamicComponent.linearVelocity.z)) {
                if (errorVec !== undefined || errorVec.length() < 9) {
                    // Position
                    var newPos = new THREE.Vector3();

                    /* Correction affects how aggressively we correct car's position towards its new position. It's 0.05 in stunt rally, but it seems to be too low for webtundra (the car would lag behind). 
                                https://github.com/stuntrally/stuntrally/blob/499b079d4478b4a6e4b114ba1fc0c94aec7b5c1d/source/vdrift/car.cpp#L332*/
                    var correction = 0.5;
                    newPos.addVectors(ent.boxMesh.position, errorVec.clone().multiplyScalar(correction));

                    // Rotation
                    var threeTargetRotation = new THREE.Euler(0, 0, 0, "ZYX");
                    tundraToThreeEuler(ent.placeable.transform.rot, threeTargetRotation, this.app.viewer.degToRad);

                    var newRot = ent.boxMesh.quaternion.clone();
                    var rotationQuat = new THREE.Quaternion();
                    rotationQuat.setFromEuler(threeTargetRotation);
                    newRot.slerp(rotationQuat, 0.5);

                    //

                    ent.boxMesh.__dirtyPosition = true;
                    ent.boxMesh.__dirtyRotation = true;

                    ent.boxMesh.position = newPos;
                    ent.boxMesh.quaternion = newRot;
                }
                var newVelocity = new THREE.Vector3(ent.dynamicComponent.linearVelocity.x, ent.dynamicComponent.linearVelocity.y, ent.dynamicComponent.linearVelocity.z);
                ent.boxMesh.setLinearVelocity(newVelocity);
                ent.previousLinearVelocity = newVelocity;
            }
            if (!ent.previousAngularVelocity || !(ent.previousAngularVelocity.x == ent.dynamicComponent.angularVelocity.x && ent.previousAngularVelocity.y == ent.dynamicComponent.angularVelocity.y && ent.previousAngularVelocity.z == ent.dynamicComponent.angularVelocity.z)) {
                var newAngVelocity = new THREE.Vector3(ent.dynamicComponent.angularVelocity.x, ent.dynamicComponent.angularVelocity.y, ent.dynamicComponent.angularVelocity.z);
                ent.boxMesh.setAngularVelocity(newAngVelocity);
                ent.previousAngularVelocity = newAngVelocity;
            }

            // Steering
            if (!ent.previousSteering || ent.dynamicComponent.steering != ent.previousSteering) {
                ent.boxMesh.vehicle.setSteering(ent.dynamicComponent.steering, 0); // (amount, wheel)
                ent.boxMesh.vehicle.setSteering(ent.dynamicComponent.steering, 1);
                ent.previousSteering = ent.dynamicComponent.steering;
            }

            // Brake
            if (!ent.previousBrakeFront || ent.dynamicComponent.brakeFront != ent.previousBrakeFront) {
                ent.boxMesh.vehicle.setBrake(ent.dynamicComponent.brakeFront, 0);
                ent.boxMesh.vehicle.setBrake(ent.dynamicComponent.brakeFront, 1);
                ent.previousBrakeFront = ent.dynamicComponent.brakeFront;
            }
            if (!ent.previousBrakeRear || ent.dynamicComponent.brakeRear != ent.previousBrakeRear) {
                ent.boxMesh.vehicle.setBrake(ent.dynamicComponent.brakeRear, 2);
                ent.boxMesh.vehicle.setBrake(ent.dynamicComponent.brakeRear, 3);
                ent.previousBrakeRear = ent.dynamicComponent.brakeRear;
            }

            // Engine force
            if (!ent.previousEngineForce || ent.dynamicComponent.engineForce != ent.previousEngineForce) {
                ent.boxMesh.vehicle.applyEngineForce(ent.dynamicComponent.engineForce);
                ent.previousEngineForce = ent.dynamicComponent.engineForce;
            }
        }

    }
};
