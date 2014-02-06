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
var cars = [];

// OTHER


function CreateCar() {
	var car = scene.CreateEntity(scene.NextFreeId(), ["Name", "Mesh", "Placeable"]);
	car.name = "car";

	var meshRef = car.mesh.meshRef;
	meshRef.ref = "cube.mesh";
	car.mesh.meshRef = meshRef;

	car.placeable.SetScale(new float3(4, 2.5, 8));
	car.placeable.SetPosition(new float3(0, 0, 0));

	cars.push(car);
}

// Player connected

function ServerHandleUserConnected(userID, userConnection) { //(11d)
	console.LogInfo("username: " + userConnection.Property("name"));
	console.LogInfo("player amount: " + playerAmount);

	players.push(userConnection.Property("name"));

	playerAmount++;

	CreateCar();
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
}

function update(dt) {

}

frame.Updated.connect(update);
