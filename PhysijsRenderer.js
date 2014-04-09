define([
        "lib/classy",
        "lib/three",
        "core/framework/TundraSDK",
        "core/framework/TundraLogging",
        "core/scene/Scene",
        "view/threejs/ThreeJsRenderer",
        "view/threejs/asset/ThreeJsonAsset",
        "view/threejs/entity-components/EC_Mesh_ThreeJs",
        "view/threejs/entity-components/EC_Placeable_ThreeJs",
        "plugins/WebTundraCar/physi"
    ], function(Class, THREE, TundraSDK, TundraLogging, Scene, ThreeJsRenderer, ThreeJsonAsset,
                EC_Mesh_ThreeJs,
                EC_Placeable_ThreeJs,
                physijs) {
        console.log(physijs)
/**
    Three.js renderer implementation that is accessible from {{#crossLink "TundraClient/renderer:property"}}TundraClient.renderer{{/crossLink}}

    Manages the rendering engine scene and its scene nodes. Utility functions for camera, raycasting etc.
    @class ThreeJsRenderer
    @extends IRenderSystem
    @constructor
*/
var PhysijsRenderer = ThreeJsRenderer.$extend(
{
// For conditions of distribution and use, see copyright notice in LICENSE

/*
 *      @author Tapani Jamsa
 *      Date: 2014
 */

     __init__ : function()
    {
        this.$super("ThreeJsRenderer.js");
        this.log = TundraLogging.getLogger("PhysijsRenderer");
    }
});

// function PhysijsView() {

//     Tundra.ThreeView.call(this); // call super constructor.

//     Physijs.scripts.worker = 'physijs_worker.js';
//     Physijs.scripts.ammo = 'ammo.js';

//     this.componentRemovedSig.add(function(component) {
//         if (component.parentEntity.boxMesh) {
//             // 'if' inside 'if' because we don't want to call threeGroup.parent.remove(threeGroup);
//             if (component.parentEntity.boxMesh.parent) {
//                 component.parentEntity.boxMesh.parent.remove(component.parentEntity.boxMesh);
//             }
//         }
//     });
// }

// PhysijsView.prototype = Object.create(Tundra.ThreeView.prototype);
// PhysijsView.prototype.constructor = PhysijsView;

// PhysijsView.prototype.onComponentAddedOrChanged = function(entity, component,changeType, changedAttr) {
//     Tundra.ThreeView.prototype.onComponentAddedOrChanged.call(this, entity, component, changeType, changedAttr);
//     if (component instanceof Tundra.EC_RigidBody)
//         this.onRigidBodyAddedOrChanged(entity, component);
// };

// PhysijsView.prototype.onRigidBodyAddedOrChanged = function(entity, rigidBodyComponent) {
//     var prevPhysiMesh = rigidBodyComponent.physiMesh;
//     if (prevPhysiMesh) {
//         console.log("unhandled prev physijs mesh");
//     }
        

// };

// PhysijsView.prototype.createScene = function() {
//     return new Physijs.Scene();
// };

return PhysijsRenderer;

}); // require js
