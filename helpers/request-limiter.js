'use strict';

var RateLimit = require('express-rate-limit');

var defaults = {
	max: 0, // Disabled
	delayMs: 0, // Disabled
	delayAfter: 0, // Disabled
	windowMs: 60000 // 1 minute window
};

function applyLimits (limits) {
	if (typeof limits === 'object') {
		return {
			max: Math.floor(limits.max) || defaults.max,
			delayMs: Math.floor(limits.delayMs) || defaults.delayMs,
			delayAfter: Math.floor(limits.delayAfter) || defaults.delayAfter,
			windowMs: Math.floor(limits.windowMs) || defaults.windowMs
		};
	} else {
		return defaults;
	}
}

module.exports = function (app, config) {
	if (config.trustProxy) {
		app.enable('trust proxy');
	}

	config.api = config.api || {};
	config.api.options = config.api.options || {};

	config.peers = config.peers || {};
	config.peers.options = config.peers.options || {};

	var limits = {
		client: applyLimits(config.api.options.limits),
		peer: applyLimits(config.peers.options.limits)
	};

	limits.middleware = {
		client: app.use('/api/', new RateLimit(limits.client)),
		peer: app.use('/peer/', new RateLimit(limits.peer))
	};

	return limits;
};
