"use strict";

// For conditions of distribution and use, see copyright notice in LICENSE

/*
 *      @author Tapani Jamsa
 *      Date: 2014
 */

function PhysijsView() {

    Tundra.ThreeView.call(this); // call super constructor.

    Physijs.scripts.worker = 'physijs_worker.js';
    Physijs.scripts.ammo = 'ammo.js';

    this.componentRemovedSig.add(function(component) {
        if (component.parentEntity.boxMesh) {
            // 'if' inside 'if' because we don't want to call threeGroup.parent.remove(threeGroup);
            if (component.parentEntity.boxMesh.parent) {
                component.parentEntity.boxMesh.parent.remove(component.parentEntity.boxMesh);
            }
        }
    });
}

PhysijsView.prototype = Object.create(Tundra.ThreeView.prototype);
PhysijsView.prototype.constructor = PhysijsView;

PhysijsView.prototype.onComponentAddedOrChanged = function(entity, component,changeType, changedAttr) {
    Tundra.ThreeView.prototype.onComponentAddedOrChanged.call(this, entity, component, changeType, changedAttr);
    if (component instanceof Tundra.EC_RigidBody)
        this.onRigidBodyAddedOrChanged(entity, component);
};

PhysijsView.prototype.onRigidBodyAddedOrChanged = function(entity, rigidBodyComponent) {
    var prevPhysiMesh = rigidBodyComponent.physiMesh;
    if (prevPhysiMesh) {
        console.log("unhandled prev physijs mesh");
    }
        

};

PhysijsView.prototype.createScene = function() {
    return new Physijs.Scene();
};
