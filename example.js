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
    ground.receiveShadow = true;
    app.viewer.scene.add(ground);

    // Walls
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
            var mass = 1500;
            var mesh = new Physijs.BoxMesh(
                car,
                new THREE.MeshFaceMaterial(car_materials),
                mass);
            mesh.position.y = 2;
            mesh.castShadow = mesh.receiveShadow = true;

            app.vehicle = new Physijs.Vehicle(mesh, new Physijs.VehicleTuning(
                10.88,
                1.83,
                0.28,
                500,
                10.5,
                6000));
            app.vehicle.engineForwardForce = 1200;
            app.vehicle.engineBackwardForce = -1000;
            app.vehicle.brakeAmount = 1000;
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
                        app.vehicle.engineForceAmount = app.vehicle.engineForwardForce;
                        break;

                    case 68: // right
                        app.input.direction = -1;
                        break;

                    case 83: // back
                        app.input.power = true;
                        app.vehicle.engineForceAmount = app.vehicle.engineBackwardForce;
                        // app.input.power = false;
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
                        // app.input.power = null;
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

    app.viewer.connectToPlaceable = function(threeObject, placeable) {
        if (placeable.debug)
            console.log("connect o3d " + threeObject.id + " to placeable - pl x " + placeable.transform.pos.x + " o3d x " + threeObject.position.x + " o3d parent x " + threeObject.parent.position.x);

        //NOTE: this depends on component handling being done here before the componentReady signal fires
        var thisIsThis = this;
        placeable.parentRefReady.add(function() {
            var parent = thisIsThis.parentForPlaceable(placeable);
            //NOTE: assumes first call -- add removing from prev parent to support live changes! XXX

            // Physi.js comment to quickfix
            // parent.add(threeObject);

            if (placeable.debug)
                console.log("parent ref set - o3d id=" + threeObject.id + " added to parent " + parent.id);
            thisIsThis.updateFromTransform(threeObject, placeable);
            placeable.attributeChanged.add(function(attr, changeType) {
                thisIsThis.updateFromTransform(threeObject, placeable); //Todo: pass attr to know when parentRef changed
            });
        });
    };

    // Custom mesh loaded callback
    app.viewer.onMeshLoaded = function(threeParent, meshComp, geometry, material) {
        // console.log("onMeshLoaded, entityID: " + meshComp.parentEntity.id);
        // if(meshComp.parentEntity.id === 39){
        //     return;
        // }

        if (!useCubes && geometry === undefined) {
            console.log("mesh load failed");
            return;
        }
        var mesh;
        if (useCubes) {
            /*if (meshComp.meshRef.ref === "") {
                console.log("useCubes ignoring empty meshRef");
                return; //hackish fix to avoid removing the cube when the ref gets the data later
            }*/
            mesh = new THREE.Mesh(this.cubeGeometry, this.wireframeMaterial);
        } else {
            // checkDefined(geometry, material, meshComp, threeParent);
            // PHYSIJS.MESH DOESNT SEEM TO HAVE PHYSICAL PROPERTIES
            // mesh = new Physijs.Mesh(geometry, new THREE.MeshFaceMaterial(material));
            // checkDefined(threeParent, meshComp, geometry, material);

            mesh = new Physijs.BoxMesh(
                new THREE.CubeGeometry(10.5, 3.7, 2),
                ground_material,
                1500 // mass
            );
            // mesh.position.set(0, 0, 5);
            mesh.receiveShadow = true;

            // var loader = new THREE.JSONLoader();

            // loader.load("models/mustang.js", function(car, car_materials) {
            //     loader.load("models/mustang_wheel.js", function(wheel, wheel_materials) {
            //         var mass = 1500;
            //         mesh = new Physijs.BoxMesh(
            //             car,
            //             new THREE.MeshFaceMaterial(car_materials),
            //             mass);
            //         mesh.position.y = 2;
            //         mesh.castShadow = mesh.receiveShadow = true;

            //         var wheel_material = new THREE.MeshFaceMaterial(wheel_materials);

            //         for (var i = 0; i < 4; i++) {
            //             app.vehicle.addWheel(
            //                 wheel,
            //                 wheel_material,
            //                 new THREE.Vector3(
            //                 i % 2 === 0 ? -1.6 : 1.6, -1,
            //                 i < 2 ? 3.3 : -3.2),
            //                 new THREE.Vector3(0, -1, 0),
            //                 new THREE.Vector3(-1, 0, 0),
            //                 0.5,
            //                 0.7,
            //                 i < 2 ? false : true);
            //         }
            //     });
            // });
        }
        checkDefined(meshComp.parentEntity);
        check(threeParent.userData.entityId === meshComp.parentEntity.id);
        // console.log("Mesh loaded:", meshComp.meshRef.ref, "- adding to o3d of entity "+ threeParent.userData.entityId);
        meshComp.threeMesh = mesh;
        //mesh.applyMatrix(threeParent.matrixWorld);

        threeParent.add(mesh);

        // Physi.js uncomment to quickfix
        var parent = this.parentForPlaceable(meshComp.parentEntity);
        threeParent._physijs = mesh._physijs;
        // threeParent.material._physijs = mesh.material._physijs;
        parent.add(threeParent);

        // app.viewer.scene.add(mesh);

        this.meshReadySig.dispatch(meshComp, mesh);
        mesh.needsUpdate = 1;
        console.log("added mesh to o3d id=" + threeParent.id);
        // threeParent.needsUpdate = 1;

        // do we need to set up signal that does
        // mesh.applyMatrix(threeParent.matrixWorld) when placeable
        // changes?
    }
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
            this.vehicle.applyEngineForce(this.vehicle.engineForceAmount);
        } else if (this.input.power === false) {
            this.vehicle.setBrake(this.vehicle.brakeAmount, 2);
            this.vehicle.setBrake(this.vehicle.brakeAmount, 3);
        } else {
            this.vehicle.applyEngineForce(0);
        }
    }

    this.viewer.scene.simulate(); // run physics

    if (this.physics_stats) {
        this.physics_stats.update();
    }


    if (this.connected) {
        // Apply mustang boxmesh transform to corresponding placeable transform
        if (this.reservedCar !== undefined && this.vehicle !== undefined) {
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
        }

        // Apply new received car placeable positions (excluding our car) to corresponding placeable transforms
        if (this.serverSceneCtrl) {
            for (var i = 0; i < this.serverSceneCtrl.dynamicComponent.cars.length; i++) {
                var entID = this.serverSceneCtrl.dynamicComponent.cars[i];
                var entity = this.dataConnection.scene.entityById(entID);
                if (!entity || entity.dynamicComponent.name !== "Car" || entity.boxMesh === "loading" || entity.dynamicComponent.playerID == this.dataConnection.loginData.name) {
                    continue;
                }
                var ent = entity;

                // Create boxmesh if it doesn't already exist
                if (ent.boxMesh === undefined) {
                    ent.boxMesh = "loading";
                    var loader = new THREE.JSONLoader();

                    loader.load("models/mustang.js", function(car, car_materials) {
                        loader.load("models/mustang_wheel.js", function(wheel, wheel_materials) {
                            var mass = 1500;
                            ent.boxMesh = new Physijs.BoxMesh(
                                car,
                                new THREE.MeshFaceMaterial(car_materials),
                                mass);
                            ent.boxMesh.position.y = 2;
                            ent.boxMesh.castShadow = ent.boxMesh.receiveShadow = true;

                            app.viewer.scene.add(ent.boxMesh);

                            // var wheel_material = new THREE.MeshFaceMaterial(wheel_materials);

                            // for (var i = 0; i < 4; i++) {
                            //     app.vehicle.addWheel(
                            //         wheel,
                            //         wheel_material,
                            //         new THREE.Vector3(
                            //         i % 2 === 0 ? -1.6 : 1.6, -1,
                            //         i < 2 ? 3.3 : -3.2),
                            //         new THREE.Vector3(0, -1, 0),
                            //         new THREE.Vector3(-1, 0, 0),
                            //         0.5,
                            //         0.7,
                            //         i < 2 ? false : true);
                            // }
                        });
                    });
                } else {
                    ent.boxMesh.__dirtyPosition = true;
                    ent.boxMesh.__dirtyRotation = true;

                    copyXyz(ent.placeable.transform.pos, ent.boxMesh.position);
                    copyXyz(ent.placeable.transform.scale, ent.boxMesh.scale);
                    tundraToThreeEuler(ent.placeable.transform.rot, ent.boxMesh.rotation, app.viewer.degToRad);
                }
            }
        }

        // Inform the server about the change
        this.dataConnection.syncManager.sendChanges();
    }
};

// Car created callback
CarApp.prototype.onCarCreated = function(scope, entity, action, params) {
    console.log("onCarCreated");

    this.findMyCar();
};

CarApp.prototype.findMyCar = function() {
    console.log("getEntities");

    this.reservedCar = undefined;

    // Find a car that matches with the player
    this.serverSceneCtrl = this.dataConnection.scene.entityByName("SceneController");
    for (var i = 0; i < this.serverSceneCtrl.dynamicComponent.cars.length; i++) {
        var entityID = this.serverSceneCtrl.dynamicComponent.cars[i];
        var entity = this.dataConnection.scene.entityById(entityID);
        if (!entity) {
            console.log("entity not found: " + entityID);
        } else if (entity.dynamicComponent.name === "Car" && entity.dynamicComponent.playerID == this.dataConnection.loginData.name) {
            // Set entity reference
            this.reservedCar = entity;
            console.log("reserved car id: " + entity.id);

            break;
        }
    }

};

init();
