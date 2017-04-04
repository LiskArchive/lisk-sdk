'use strict';

var _ = require('lodash');

function Endpoints () {}

Endpoints.prototype.rpcEndpoints = {};

Endpoints.prototype.eventEndpoints = {};

Endpoints.prototype.registerRPCEndpoints = function (endpoints) {
	console.log('\x1b[36m%s\x1b[0m', 'ENDPOINTS: registerRPCEndpoints', endpoints);

	this.rpcEndpoints = _.extend(this.rpcEndpoints, endpoints);
};

Endpoints.prototype.registerEventEndpoints = function (endpoints) {
	console.log('\x1b[36m%s\x1b[0m', 'ENDPOINTS: registerEVENTEndpoints', endpoints);
	this.eventEndpoints = _.extend(this.eventEndpoints, endpoints);
};

module.exports = new Endpoints();
