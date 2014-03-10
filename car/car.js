"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE

/*
 *      @author Tapani Jamsa
 *      Date: 2014
 */

var print = false;
var angularVelo, debugAngle, debugQ, debugQ2, debugQ3;
var conjBoxQuater;
var velQuater;


function Subtract(qa, qb) {

    qa._x -= qb._x;
    qa._y -= qb._y;
    qa._z -= qb._z;
    qa._w -= qb._w;

    qa._updateEuler();

    return qa;

};

function MultiplyScalar(qa, s) {

    qa._x *= s;
    qa._y *= s;
    qa._z *= s;
    qa._w *= s;

    qa._updateEuler();

    return qa;

};

/**
 * Returns the logarithm of the Quaternion.
 *
 * @see #exp()
 */

function Qlog(q) {
    // Warning: this method should not normalize the Quaternion
    var len = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z);

    if (len < 1000000)
        return new THREE.Quaternion(q.x, q.y, q.z, 0);
    else {
        var coef = Math.acos(q.w) / len;
        return new THREE.Quaternion(q.x * coef, q.y * coef, q.z * coef, 0);
    }
};

/**
 * Returns the exponential of the Quaternion.
 *
 * @see #log()
 */

function Qexp(q) {
    var theta = Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z);

    if (theta < 1000000)
        return new THREE.Quaternion(q.x, q.y, q.z, Math.cos(theta));
    else {
        var coef = Math.sin(theta) / theta;
        return new THREE.Quaternion(q.x * coef, q.y * coef, q.z * coef,
            Math.cos(theta));
    }
};

// http://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/

function QuaternionToAxisAngle(q1) {
    var result = {
        x: 0,
        y: 0,
        z: 0,
        w: 0
    };

    if (q1.w > 1) q1.normalize(); // if w>1 acos and sqrt will produce errors, this cant happen if quaternion is normalised
    result.w = 2 * Math.acos(q1.w); // angle
    var s = Math.sqrt(1 - q1.w * q1.w); // assuming quaternion normalised then w is less than 1, so term always positive.
    if (s < 0.001) { // test to avoid divide by zero, s is always positive due to sqrt
        // if s close to zero then direction of axis not important
        result.x = q1.x; // if it is important that axis is normalised then replace with x=1; y=z=0;
        result.y = q1.y;
        result.z = q1.z;
    } else {
        result.x = q1.x / s; // normalise axis
        result.y = q1.y / s;
        result.z = q1.z / s;
    }

    return result;
};


function AmmoQuaternionToAxisAngle(q1) {
    var result = {
        x: 0,
        y: 0,
        z: 0,
        w: 0
    };

    if (q1.getX() > 1) q1.normalize(); // if w>1 acos and sqrt will produce errors, this cant happen if quaternion is normalised
    result.w = 2 * Math.acos(q1.getW()); // angle
    var s = Math.sqrt(1 - q1.getW() * q1.getW()); // assuming quaternion normalised then w is less than 1, so term always positive.
    if (s < 0.001) { // test to avoid divide by zero, s is always positive due to sqrt
        // if s close to zero then direction of axis not important
        result.x = q1.getX(); // if it is important that axis is normalised then replace with x=1; y=z=0;
        result.y = q1.getY();
        result.z = q1.getZ();
    } else {
        result.x = q1.getX() / s; // normalise axis
        result.y = q1.getY() / s;
        result.z = q1.getZ() / s;
    }

    return result;
};


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
                                // newCar.boxMesh._physijs.isRemoteObject = true; // custom physijs property
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
                        var eulerOrd = "ZYX";

                        if (!ent.previousThreePos) {
                            // Save current position for next update
                            ent.previousThreePos = new THREE.Vector3();
                            ent.previousRotation = new THREE.Euler();
                            ent.previousRotation._order = eulerOrd;
                            ent.previousRotation._quaternion = new THREE.Quaternion();
                            copyXyz(ent.placeable.transform.pos, ent.previousThreePos);

                            copyXyz(ent.placeable.transform.pos, ent.boxMesh.position);
                            copyXyz(ent.placeable.transform.scale, ent.boxMesh.scale);
                            tundraToThreeEuler(ent.placeable.transform.rot, ent.boxMesh.rotation, this.app.viewer.degToRad);
                        } else if (!(ent.previousThreePos.x == ent.placeable.transform.pos.x && ent.previousThreePos.y == ent.placeable.transform.pos.y && ent.previousThreePos.z == ent.placeable.transform.pos.z)) {

                            // console.log("set position");

                            // console.clear();
                            // console.log(ent.previousThreePos);
                            // console.log(ent.placeable.transform.pos);

                            // Interpolate 

                            // POSITION
                            var newPosition = new THREE.Vector3();
                            copyXyz(ent.placeable.transform.pos, newPosition);

                            var newVelocity = newPosition.sub(ent.previousThreePos).multiplyScalar(3);
                            ent.boxMesh.setLinearVelocity(newVelocity);



                            // ROTATION
                            if (print) {
                                // console.clear();
                            }


                            // console.clear();
                            // console.log(ent.boxMesh.rotation._quaternion);



                            // Tapani start------------------------------

                            // // Current
                            // var currentQ = new Ammo.btQuaternion(ent.previousRotation._quaternion.x, ent.previousRotation._quaternion.y, ent.previousRotation._quaternion.z, ent.previousRotation._quaternion.w);

                            // // Target
                            // var threeTargetRotation = new THREE.Euler();
                            // threeTargetRotation._order = eulerOrd;
                            // threeTargetRotation._quaternion = new THREE.Quaternion();
                            // tundraToThreeEuler(ent.placeable.transform.rot, threeTargetRotation, this.app.viewer.degToRad);
                            // var targetQ = new Ammo.btQuaternion(threeTargetRotation._quaternion.x, threeTargetRotation._quaternion.y, threeTargetRotation._quaternion.z, threeTargetRotation._quaternion.w);

                            // // Dot
                            // var dotProduct = currentQ.dot(targetQ);
                            // if (dotProduct < 0) {
                            //     targetQ = new Ammo.btQuaternion(targetQ.getX() * -1, targetQ.getY() * -1, targetQ.getZ() * -1, targetQ.getW() * -1);
                            // }

                            // console.log("---");
                            // console.log("dot: " + dotProduct);
                            // console.log("pre: " + ent.previousRotation._quaternion.y);
                            // console.log("tar: " + threeTargetRotation._quaternion.y);

                            // // Delta
                            // var deltaQ = targetQ.op_sub(currentQ);
                            // deltaQ = deltaQ.op_div(delta);

                            // var tempQ = new THREE.Quaternion(deltaQ.getX(), deltaQ.getY(), deltaQ.getZ(), deltaQ.getW());
                            // tempQ._euler = new THREE.Euler();
                            // tempQ._euler._order = eulerOrd;
                            // tempQ._updateEuler();

                            // console.log("del: " + deltaQ.getY());

                            // // Angular velocity
                            // var speed = 0.1;
                            // var tempY = deltaQ.getY() * speed;
                            // if(tempY < 0) tempY *= -1;
                            // angularVelo = new THREE.Vector3( /* deltaQ.getX() * speed */ 0, tempY, /* deltaQ.getZ() * speed */ 0);
                            // // angularVelo = new THREE.Vector3(tempQ._euler._x * speed, tempQ._euler._y * speed, tempQ._euler._z * speed);

                            // Tapani end------------------------------



                            // AndrewK AMMO Q start------------------------------

                            // //Current
                            // var currentQ = new Ammo.btQuaternion(ent.previousRotation._quaternion.x, ent.previousRotation._quaternion.y, ent.previousRotation._quaternion.z, ent.previousRotation._quaternion.w);

                            // // Target
                            // var threeTargetRotation = new THREE.Euler();
                            // threeTargetRotation._order = eulerOrd;
                            // threeTargetRotation._quaternion = new THREE.Quaternion();
                            // tundraToThreeEuler(ent.placeable.transform.rot, threeTargetRotation, this.app.viewer.degToRad);
                            // var targetQ = new Ammo.btQuaternion(threeTargetRotation._quaternion.x, threeTargetRotation._quaternion.y, threeTargetRotation._quaternion.z, threeTargetRotation._quaternion.w);

                            // // Dot
                            // var dotProduct = currentQ.dot(targetQ);
                            // if (dotProduct < 0) {
                            //     targetQ = new Ammo.btQuaternion(targetQ.getX() * -1, targetQ.getY() * -1, targetQ.getZ() * -1, targetQ.getW() * -1);
                            // }

                            // // Delta
                            // var deltaQ = targetQ.op_sub(currentQ);

                            // conjBoxQuater = targetQ.inverse();
                            // velQuater = deltaQ.op_mul(2);
                            // velQuater = velQuater.op_div(delta * 1000);
                            // var threeVelQuater = new THREE.Quaternion(velQuater.getX(), velQuater.getY(), velQuater.getZ(), velQuater.getW());
                            // var threeConjBoxQuater = new THREE.Quaternion(conjBoxQuater.getX(), conjBoxQuater.getY(), conjBoxQuater.getZ(),conjBoxQuater.getW());

                            // threeVelQuater.multiplyQuaternions(threeVelQuater, threeConjBoxQuater);

                            // threeVelQuater._euler = new THREE.Euler();
                            // threeVelQuater._euler._order = eulerOrd;
                            // threeVelQuater._updateEuler();

                            // // Angular velocity                      
                            // var speed = 1;
                            // angularVelo = new THREE.Vector3(threeVelQuater._euler._x * speed, threeVelQuater._euler._y * speed, threeVelQuater._euler._z * speed);

                            // AndrewK AMMO Q end------------------------------



                            // AndrewK THREE Q start------------------------------

                            // // Target
                            // var threeTargetRotation = new THREE.Euler();
                            // threeTargetRotation._order = eulerOrd;
                            // threeTargetRotation._quaternion = new THREE.Quaternion();
                            // tundraToThreeEuler(ent.placeable.transform.rot, threeTargetRotation, this.app.viewer.degToRad);

                            // // Dot
                            // var dotProduct = threeTargetRotation._quaternion.x * ent.previousRotation._quaternion.x + threeTargetRotation._quaternion.y * ent.previousRotation._quaternion.y + threeTargetRotation._quaternion.z * ent.previousRotation._quaternion.z + threeTargetRotation._quaternion.w * ent.previousRotation._quaternion.w;
                            // // if (dotProduct < 0) {
                            // //     threeTargetRotation._quaternion.conjugate();
                            // // }

                            // console.log("---");
                            // console.log("dot: " + dotProduct);
                            // console.log("pre: " + ent.previousRotation._quaternion.x);
                            // console.log("tar: " + threeTargetRotation._quaternion.x);

                            // var diffQuater = Subtract(threeTargetRotation._quaternion, ent.previousRotation._quaternion);
                            // var conjQuater = threeTargetRotation._quaternion.inverse();
                            // var velQuater = MultiplyScalar(diffQuater, 2);
                            // var multipler = 1 / (delta * 100);
                            // velQuater = MultiplyScalar(velQuater, multipler);
                            // velQuater = velQuater.multiplyQuaternions(velQuater, conjQuater);

                            // velQuater._euler = new THREE.Euler();
                            // velQuater._euler._order = eulerOrd;
                            // velQuater._updateEuler();


                            // console.log("del: " + diffQuater.x);

                            // // Angular velocity
                            // var speed = 1;
                            // angularVelo = new THREE.Vector3(/* velQuater._euler._x * speed*/ 0, velQuater._euler._y * speed, /* velQuater._euler._z * speed */ 0);
                            // // var angularVelo = new THREE.Vector3( Math.cos(velQuater._euler.y) * Math.cos(velQuater._euler.z) * speed, Math.sin(velQuater._euler.y) * Math.cos(velQuater._euler.z) * speed, Math.sin(velQuater._euler.z) * speed);
                            // // angularVelo = new THREE.Vector3(velQuater.x * speed, velQuater.y * speed, velQuater.z * speed);

                            // AndrewK THREE Q end------------------------------



                            // Sam THREE Q start------------------------------

                            // // Target
                            // var threeTargetRotation = new THREE.Euler();
                            // threeTargetRotation._order = eulerOrd;
                            // threeTargetRotation._quaternion = new THREE.Quaternion();
                            // tundraToThreeEuler(ent.placeable.transform.rot, threeTargetRotation, this.app.viewer.degToRad);

                            // var diffQuater = threeTargetRotation._quaternion.multiplyQuaternions(threeTargetRotation._quaternion, ent.previousRotation._quaternion.inverse());
                            // var conjQuater = ent.previousRotation._quaternion.inverse();
                            // // var multipler = 1 / (delta * 10);
                            // // var velQuater = MultiplyScalar(diffQuater, multipler);
                            // var velQuater = Qexp(Qlog(diffQuater));

                            // // velQuater = MultiplyScalar(velQuater, 2);
                            // velQuater = velQuater.multiplyQuaternions(velQuater, conjQuater);

                            // velQuater._euler = new THREE.Euler();
                            // velQuater._euler._order = eulerOrd;
                            // velQuater._updateEuler();

                            // // Angular velocity
                            // var speed = 1;
                            // angularVelo = new THREE.Vector3(velQuater._euler._x * speed, velQuater._euler._y * speed, velQuater._euler._z * speed);
                            // // var angularVelo = new THREE.Vector3( Math.cos(velQuater._euler.y) * Math.cos(velQuater._euler.z) * speed, Math.sin(velQuater._euler.y) * Math.cos(velQuater._euler.z) * speed, Math.sin(velQuater._euler.z) * speed);
                            // // angularVelo = new THREE.Vector3(velQuater.x * speed, velQuater.y * speed, velQuater.z * speed);

                            // Sam THREE Q end------------------------------


                            // Sam THREE Q LITE start------------------------------

                            // // Target
                            // var threeTargetRotation = new THREE.Euler();
                            // threeTargetRotation._order = eulerOrd;
                            // threeTargetRotation._quaternion = new THREE.Quaternion();
                            // tundraToThreeEuler(ent.placeable.transform.rot, threeTargetRotation, this.app.viewer.degToRad);

                            // // Dot
                            // var dotProduct = (threeTargetRotation._quaternion.x * ent.previousRotation._quaternion.x) + (threeTargetRotation._quaternion.y * ent.previousRotation._quaternion.y) + (threeTargetRotation._quaternion.z * ent.previousRotation._quaternion.z) + (threeTargetRotation._quaternion.w * ent.previousRotation._quaternion.w);



                            // if (dotProduct < 0.7 && dotProduct > -0.7) {
                            //     // ent.previousRotation._quaternion.inverse();
                            //     // threeTargetRotation._quaternion.inverse();
                            //     // ent.previousRotation._quaternion.conjugate();
                            //     //     // threeTargetRotation._quaternion.conjugate();

                            //     console.log("---");
                            //     // console.log("dot: " + dotProduct);
                            //     // console.log(ent.boxMesh.rotation._quaternion);

                            //     // ent.boxMesh.position.distanceTo(new THREE.Vector3( x, y, z );)

                            //     // continue;
                            // }
                            // if (print) {
                            //     console.log("---");
                            //     // console.log("dot: " + dotProduct);
                            //     // console.log(ent.boxMesh.rotation._quaternion);

                            // }

                            // // if (print) {
                            // //     console.log("---");
                            // //     console.log("dot: " + dotProduct);
                            // //     console.log("pre: " + ent.boxMesh.rotation._quaternion.y);
                            // //     console.log("tar: " + threeTargetRotation._quaternion.y);
                            // // }

                            // var diffQuater = threeTargetRotation._quaternion.multiplyQuaternions(threeTargetRotation._quaternion, ent.previousRotation._quaternion.inverse());

                            // diffQuater._euler = new THREE.Euler();
                            // diffQuater._euler._order = eulerOrd;
                            // diffQuater._updateEuler();

                            // if (print) {
                            //     console.log("del: " + diffQuater.y);
                            // }

                            // // Angular velocity
                            // var speed = 1;
                            // angularVelo = new THREE.Vector3(diffQuater._euler._x * speed, diffQuater._euler._y * speed, diffQuater._euler._z * speed);

                            // Sam THREE Q LITE end------------------------------


                            // Axis-angle THREE Q start------------------------------

                            // // Target
                            // var threeTargetRotation = new THREE.Euler();
                            // threeTargetRotation._order = eulerOrd;
                            // threeTargetRotation._quaternion = new THREE.Quaternion();
                            // tundraToThreeEuler(ent.placeable.transform.rot, threeTargetRotation, this.app.viewer.degToRad);

                            // // Dot
                            // var dotProduct = threeTargetRotation._quaternion.x * ent.previousRotation._quaternion.x + threeTargetRotation._quaternion.y * ent.previousRotation._quaternion.y + threeTargetRotation._quaternion.z * ent.previousRotation._quaternion.z + threeTargetRotation._quaternion.w * ent.previousRotation._quaternion.w;
                            // if (dotProduct < 0) {
                            //     threeTargetRotation._quaternion.conjugate();
                            // }

                            // console.log("---");
                            // console.log("dot: " + dotProduct);
                            // console.log("pre: " + ent.previousRotation._quaternion.y);
                            // console.log("tar: " + threeTargetRotation._quaternion.y);

                            // var diffQuater = Subtract(threeTargetRotation._quaternion, ent.previousRotation._quaternion);
                            // var conjQuater = threeTargetRotation._quaternion.inverse();
                            // var velQuater = MultiplyScalar(diffQuater, 2);
                            // var multipler = 1 / (delta * 100);
                            // velQuater = MultiplyScalar(velQuater, multipler);
                            // velQuater = velQuater.multiplyQuaternions(velQuater, conjQuater);

                            // var axisAngle = QuaternionToAxisAngle(velQuater);


                            // console.log("del: " + diffQuater.y);
                            // console.log("aa : " + axisAngle.y);

                            // // Angular velocity
                            // var speed = 1;

                            // angularVelo = new THREE.Vector3(/*axisAngle.x * speed */0, axisAngle.y * speed, /* axisAngle.z * speed */ 0);

                            // Axis-angle THREE Q end------------------------------


                            // Animate with slerp -----------------------------------
                            ent.threeTargetRotation = new THREE.Euler();
                            ent.threeTargetRotation._order = eulerOrd;
                            ent.threeTargetRotation._quaternion = new THREE.Quaternion();
                            tundraToThreeEuler(ent.placeable.transform.rot, ent.threeTargetRotation, this.app.viewer.degToRad);
                            ent.slerpTime = 0;
                            // Animate with slerp end -----------------------------------



                            // ent.boxMesh.setAngularVelocity(angularVelo);



                            copyXyz(ent.placeable.transform.scale, ent.boxMesh.scale);

                            // Debug hover car
                            // ent.boxMesh.__dirtyPosition = true;
                            // ent.boxMesh.position.y = 5;

                            // Save current position for next update
                            ent.previousThreePos = ent.boxMesh.position;
                            ent.previousRotation = ent.boxMesh.rotation;
                            ent.previousRotation._order = eulerOrd;
                            ent.previousRotation._quaternion._updateEuler();

                        }
                        if(ent.previousRotation && ent.threeTargetRotation) {
                           

                            // Animate with slerp -----------------------------------

                            ent.slerpTime += delta * 5;

                            ent.boxMesh.__dirtyRotation = true;

                            var newRot = ent.previousRotation.clone();
                            // newRot._quaternion = ent.previousRotation._quaternion.clone();
                            // ent.boxMesh.rotation._quaternion = newRot._quaternion.slerp(ent.threeTargetRotation._quaternion, delta * 10);

                            ent.boxMesh.rotation._quaternion = ent.boxMesh.rotation._quaternion.slerp(ent.threeTargetRotation._quaternion, ent.slerpTime);       

                            ent.boxMesh.rotation._quaternion._euler = new THREE.Euler();
                            ent.boxMesh.rotation._quaternion._euler._order = eulerOrd;
                            ent.boxMesh.rotation._quaternion._updateEuler();
                            ent.boxMesh.rotation = ent.boxMesh.rotation._quaternion._euler;

                            console.clear();
                            console.log(delta);
                            console.log(ent.slerpTime);
                            console.log(ent.boxMesh.rotation);
                            console.log(ent.threeTargetRotation);

                            // Animate with slerp end -----------------------------------

                        }

                        // console.clear();
                        // console.log(ent.box Mesh.getLinearVelocity());

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
