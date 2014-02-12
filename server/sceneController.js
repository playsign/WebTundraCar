// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *	SceneController
 *	@author Tapani Jamsa
 *	Date: 2014
 */

if (server.IsRunning()) {
	server.UserConnected.connect(ServerHandleUserConnected); //(11a)
	server.UserDisconnected.connect(ServerHandleUserDisconnected); //(11b)

	var users = server.AuthenticatedUsers();
	if (users.length > 0)
		console.LogInfo("[Car Application] Application started.");

	for (var i = 0; i < users.length; i++) {
		ServerHandleUserConnected(users[i].id, users[i]); //(11c)
	}
}

// CAMERA
var cam = scene.GetEntityByName("FreeLookCamera");
cam.farPlane = 50000;
var camPosModifier = 110;
var minCameraPosY = 300;
var camPos = cam.placeable.transform;
camPos.pos.x = 0;
camPos.pos.y = minCameraPosY;
camPos.pos.z = 0;
camPos.rot.x = -90;
cam.placeable.transform = camPos;

// PLAYERS
var playerAmount = 0;
var spectatorAmount = 0;
var players = [];

// OTHER
var sceneController = scene.GetEntityByName("SceneController");


function CreateCar(playerID) {
	var car = scene.CreateEntity(scene.NextFreeId(), ["Name", "Placeable", "DynamicComponent"]);
	// Name
	car.name = "Car";

	// Mesh
	// var meshRef = car.mesh.meshRef;
	// meshRef.ref = "cube.mesh";
	// car.mesh.meshRef = meshRef;

	// Placeable
	// car.placeable.SetScale(new float3(3.7/2, 2/2, 10.5/2));
	car.placeable.SetPosition(new float3(0, 0, 0));

	// Dynamic Component
	var attrs = car.dynamiccomponent;
	attrs.name = "Car";
	attrs.CreateAttribute("string", "playerID");
	attrs.SetAttribute("playerID", playerID);

	// List of cars
	var cars = scene.EntitiesWithComponent("EC_DynamicComponent", "Car");

	// Set the car list to scene controller's dynamic component
	var attrs = sceneController.dynamiccomponent;
	var carList = [];

	for (var i = 0; i < cars.length; i++) {
		carList.push(cars[i].id);
	}
	attrs.SetAttribute("cars", carList);

	// Notify clients that the car is created
	sceneController.Exec(4, "carCreated", "carCreated", cars.length);
}

// Player connected

function ServerHandleUserConnected(userID, userConnection) { //(11d)
	console.LogInfo("username: " + userConnection.Property("name"));
	console.LogInfo("player amount: " + playerAmount);

	players.push(userConnection.Property("name"));

	playerAmount++;

	CreateCar(userConnection.Property("name"));
}

// Player disconnected

function ServerHandleUserDisconnected(userID, userConnection) {
	console.LogInfo("user disconnected:");
	// console.LogInfo("userConnection.id: " + userConnection.id);
	console.LogInfo("user name: " + userConnection.Property("name"));

	if (spectatorAmount === 0) {
		playerAmount--;
	} else {
		spectatorAmount--;
	}

	for (var i = 0; i < players.length; i++) {
		if (players[i] === userConnection.Property("name")) {
			players.splice(i, 1);
		}
	}

	// Remove the car

	// Get the car list
	var attrs = sceneController.dynamiccomponent;
	var carList = attrs.GetAttribute("cars");

	for (var i = 0; i < carList.length; i++) {
		var car = scene.EntityById(carList[i]);

		if (car.dynamiccomponent.GetAttribute("playerID") == userConnection.Property("name")) {
			console.LogInfo("Remove car");
			console.LogInfo(carList[i]);
			scene.RemoveEntity(carList[i]);

			// // Update the list of cars
			// var cars = scene.EntitiesWithComponent("EC_DynamicComponent", "Car");
			
			// var carList = [];

			// for (var i = 0; i < cars.length; i++) {
			// 	carList.push(cars[i].id);
			// }
			// attrs.SetAttribute("cars", carList);

			break;
		}
	}
}

function update(dt) {

}

frame.Updated.connect(update);
