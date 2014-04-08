
define([
        "core/framework/TundraSDK",
        "core/framework/ITundraPlugin",
        "core/framework/TundraLogging",
        "plugins/WebTundraCar/car/car"
    ], function(TundraSDK, ITundraPlugin, TundraLogging, Car) { //, WebTundraCar) {

var WebTundraCarPlugin = ITundraPlugin.$extend(
{
    __init__ : function()
    {
        this.$super("WebTundraCarPlugin");
        this.log = TundraLogging.getLogger("WebTundraCarPlugin");

        this.log.debug("WebTundraCarPlugin initialized. Let's start driving!");
        
    },

    initialize : function()
    {
        this.carApp = new Car();
        this.log.debug("initialize");
    }
});

TundraSDK.registerPlugin(new WebTundraCarPlugin());

return WebTundraCarPlugin;

}); // require js
