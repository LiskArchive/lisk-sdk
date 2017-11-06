'use strict';

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class NodeController
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
function NodeController (scope) {
	modules = scope.modules; 
}

NodeController.getConstants = function (req, res) {
	modules.node.shared.getConstants(null, function (err, data){
		res.send(data);
	});
};

NodeController.getStatus = function (req, res) {
	modules.node.shared.getStatus(null, function (err, data){
		res.send(data);
	});
};

module.exports = NodeController;
