'use strict';

// Private Fields
var modules;

/**
 * Initializes with scope content and private variables:
 * - modules
 * @class
 * @classdesc Main System methods.
 * @param {scope} scope - App instance.
 */
// Constructor
function Controller (scope) {
	modules = scope.modules; 
}

function getConstants (req, res) {
	modules.node.shared.getConstants(null, function (err, data){
		res.send(data);
	});
}

function getStatus (req, res) {
	modules.node.shared.getStatus(null, function (err, data){
		res.send(data);
	});
}

module.exports = {
	getConstants: getConstants,
	getStatus: getStatus,
	bind: Controller
};