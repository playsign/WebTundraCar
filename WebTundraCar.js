/* jslint browser: true, globalstrict: true, devel: true, debug: true */
/* globals Tundra */

// For conditions of distribution and use, see copyright notice in LICENSE

define([
        "lib/classy",
        "core/framework/TundraSDK",
        "core/framework/CoreStringUtils",
        "core/framework/TundraLogging"
    ], function(Class, TundraSDK, CoreStringUtils, TundraLogging) {

var WebTundraCar = Class.$extend(
{
    __init__ : function(targetScene)
    {
        this.scene = targetScene;
        this.baseRef = "";

        this.log = TundraLogging.getLogger("WebTundraCar");

        this.log.debug("Parser initialized. Target scene", this.scene.toString());
    },
});

return WebTundraCar;

}); // require js
