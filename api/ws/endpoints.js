'use strict';

var _ = require('lodash');

function Endpoints () {}

Endpoints.prototype.rpcEndpoints = {};

Endpoints.prototype.eventEndpoints = {};

Endpoints.prototype.registerRPCEndpoints = function (endpoints) {
	this.rpcEndpoints = _.extend(this.rpcEndpoints, endpoints);
};

Endpoints.prototype.registerEventEndpoints = function (endpoints) {
	this.eventEndpoints = _.extend(this.eventEndpoints, endpoints);
};

module.exports =  new Endpoints();

