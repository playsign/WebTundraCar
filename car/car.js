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
            }

            // Brake
            if (this.app.keyboard.pressed(this.keyconfig.brake) || this.app.keyboard.pressed(this.keyconfig.brakeSecondary)) {
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

                // Set velocity to dynamic component
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
                                // newCar.boxMesh._physijs.collision_flags = 2; // set as kinematic
                                newCar.boxMesh._physijs.isRemoteObject = true; // custom physijs property
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

                        if (!ent.previousThreePos || !(ent.previousThreePos.x == ent.placeable.transform.pos.x && ent.previousThreePos.y == ent.placeable.transform.pos.y && ent.previousThreePos.z == ent.placeable.transform.pos.z)) {
                            // console.log("set position");

                            // console.clear();
                            // console.log(ent.previousThreePos);
                            // console.log(ent.placeable.transform.pos);

                            ent.boxMesh.__dirtyPosition = true;
                            ent.boxMesh.__dirtyRotation = true;

                            // Greatly reduces "saw" motion
                            var averagePos = {
                                x: (ent.boxMesh.position.x + ent.placeable.transform.pos.x) / 2,
                                y: (ent.boxMesh.position.y + ent.placeable.transform.pos.y) / 2,
                                z: (ent.boxMesh.position.z + ent.placeable.transform.pos.z) / 2
                            };

                            // Rotation                      
                            var tempThreeRot = new THREE.Vector3();
                            tundraToThreeEuler(ent.placeable.transform.rot, tempThreeRot, this.app.viewer.degToRad);
                            // console.log(ent.boxMesh.rotation.order);
                            // ent.boxMesh.rotation.order = "XYZ";
                            ent.boxMesh.rotation.x = (ent.boxMesh.rotation.x + tempThreeRot.x) / 2,
                            ent.boxMesh.rotation.y = (ent.boxMesh.rotation.y + tempThreeRot.y) / 2,
                            ent.boxMesh.rotation.z = (ent.boxMesh.rotation.z + tempThreeRot.z) / 2

                            copyXyz(averagePos, ent.boxMesh.position);
                            copyXyz(ent.placeable.transform.scale, ent.boxMesh.scale);
                            tundraToThreeEuler(ent.placeable.transform.rot, ent.boxMesh.rotation, this.app.viewer.degToRad);
                            ent.previousThreePos = ent.placeable.transform.pos;

                            // copyXyz(ent.placeable.transform.pos, ent.boxMesh.position);
                            // copyXyz(ent.placeable.transform.scale, ent.boxMesh.scale);
                            // tundraToThreeEuler(ent.placeable.transform.rot, ent.boxMesh.rotation, this.app.viewer.degToRad);

                            var found = false;
                            // Loop touches of the local vehicle
                            for (var i = 0; i < this.vehicle.mesh._physijs.touches.length; i++) {
                                if (ent.boxMesh._physijs === this.vehicle.world._objects[this.vehicle.mesh._physijs.touches[i]]._physijs && this.vehicle.world._objects[this.vehicle.mesh._physijs.touches[i]]._physijs.isRemoteObject) {
                                    found = true;
                                    break;
                                }
                            }

                            if (found === false) {
                                // console.log("set pos and velo");
                                // Set velocity to boxMesh
                                ent.boxMesh.setLinearVelocity(new THREE.Vector3(ent.dynamicComponent.linearVelocity.x, ent.dynamicComponent.linearVelocity.y, ent.dynamicComponent.linearVelocity.z));
                                ent.boxMesh.setAngularVelocity(new THREE.Vector3(ent.dynamicComponent.angularVelocity.x, ent.dynamicComponent.angularVelocity.y, ent.dynamicComponent.angularVelocity.z));
                            } else {
                                // debugger;
                                // console.log("don't set velo");
                            }

                            // var averageLinearVelocity = {
                            //     x: (ent.dynamicComponent.linearVelocity.x + ent.boxMesh.getLinearVelocity().x) / 2,
                            //     y: (ent.dynamicComponent.linearVelocity.y + ent.boxMesh.getLinearVelocity().y) / 2,
                            //     z: (ent.dynamicComponent.linearVelocity.z + ent.boxMesh.getLinearVelocity().z) / 2
                            // };
                            // ent.boxMesh.setLinearVelocity(new THREE.Vector3(averageLinearVelocity.x, averageLinearVelocity.y, averageLinearVelocity.z));
                            // ent.boxMesh.setAngularVelocity(new THREE.Vector3(ent.dynamicComponent.angularVelocity.x, ent.dynamicComponent.angularVelocity.y, ent.dynamicComponent.angularVelocity.z));

                        } else {
                            // console.log("don't set position");
                        }

                        // console.clear();
                        // console.log(ent.boxMesh.getLinearVelocity());

                    }
                }
            }

            // Inform the server about the change
            this.app.dataConnection.syncManager.sendChanges();
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
};
