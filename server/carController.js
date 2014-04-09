// For conditions of distribution and use, see copyright notice in LICENSE
/*
 *	CarController
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

// PLAYERS
var playerAmount = 0;
var spectatorAmount = 0;
var players = [];

// OTHER
var carController = scene.GetEntityByName("CarController");
var zeroFloat3 = new float3(0, 0, 0);

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
	attrs.CreateAttribute("float3", "linearVelocity");
	attrs.SetAttribute("linearVelocity", zeroFloat3);
	attrs.CreateAttribute("float3", "angularVelocity");
	attrs.SetAttribute("angularVelocity", zeroFloat3);
	attrs.CreateAttribute("real", "steering");
	attrs.SetAttribute("steering", 0);
	attrs.CreateAttribute("real", "brakeFront");
	attrs.SetAttribute("brakeFront", 0);
	attrs.CreateAttribute("real", "brakeRear");
	attrs.SetAttribute("brakeRear", 0);
	attrs.CreateAttribute("real", "engineForce");
	attrs.SetAttribute("engineForce", 0);

	// List of cars
	var cars = scene.EntitiesWithComponent("EC_DynamicComponent", "Car");

	// Set the car list to car controller's dynamic component
	var attrs = carController.dynamiccomponent;
	var carList = [];

	for (var i = 0; i < cars.length; i++) {
		carList.push(cars[i].id);
	}
	attrs.SetAttribute("cars", carList);

	// Notify clients that the car is created
	carController.Exec(4, "carCreated", "carCreated", cars.length);
}

// Player connected

function ServerHandleUserConnected(userID, userConnection) { //(11d)
	console.LogInfo("unique id: " + userConnection.Property("uniqueID"));
	console.LogInfo("player amount: " + playerAmount);

	players.push(userConnection.Property("uniqueID"));

	playerAmount++;

	CreateCar(userConnection.Property("uniqueID"));
}

// Player disconnected

function ServerHandleUserDisconnected(userID, userConnection) {
	console.LogInfo("user disconnected:");
	// console.LogInfo("userConnection.id: " + userConnection.id);
	console.LogInfo("user name: " + userConnection.Property("uniqueID"));

	if (spectatorAmount === 0) {
		playerAmount--;
	} else {
		spectatorAmount--;
	}

	for (var i = 0; i < players.length; i++) {
		if (players[i] === userConnection.Property("uniqueID")) {
			players.splice(i, 1);
		}
	}

	// Remove the car

	// Get the car list
	var attrs = carController.dynamiccomponent;
	var carList = attrs.GetAttribute("cars");

	for (var i = 0; i < carList.length; i++) {
		var car = scene.EntityById(carList[i]);

		if (car.dynamiccomponent.GetAttribute("playerID") == userConnection.Property("uniqueID")) {
			console.LogInfo("Remove car: " + carList[i]);
			scene.RemoveEntity(carList[i]);			

			// Update the list of cars
			var cars = scene.EntitiesWithComponent("EC_DynamicComponent", "Car");

			carList = [];

			for (var i = 0; i < cars.length; i++) {
				carList.push(cars[i].id);
			}
			attrs.SetAttribute("cars", carList);

			break;
		}
	}
}

// function update(dt) {

// }

// frame.Updated.connect(update);
