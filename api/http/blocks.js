'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

// Constructor
function BlocksHttpApi (blocksModule, app) {

	var router = new Router();

	router.map(blocksModule.shared, {
		'get /get': 'getBlock',
		'get /': 'getBlocks',
		'get /getBroadhash': 'getBroadhash',
		'get /getEpoch': 'getEpoch',
		'get /getHeight': 'getHeight',
		'get /getNethash': 'getNethash',
		'get /getFee': 'getFee',
		'get /getFees': 'getFees',
		'get /getMilestone': 'getMilestone',
		'get /getReward': 'getReward',
		'get /getSupply': 'getSupply',
		'get /getStatus': 'getStatus'
	});

	httpApi.registerEndpoint('/api/blocks', app, router, blocksModule.isLoaded);
}

module.exports = BlocksHttpApi;
