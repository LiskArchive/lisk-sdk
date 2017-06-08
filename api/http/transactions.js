'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/transactions`
 * - Public API:
 * 	- get	/
 * 	- get	/get
 * 	- get	/count
 * 	- get	/queued/get
 * 	- get	/queued
 * 	- get	/multisignatures/get
 *  - get	/multisignatures
 * 	- get	/unconfirmed/get
 * 	- get	/unconfirmed
 * 	- put	/
 * @memberof module:transactions
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} transactionsModule - Module transaction instance.
 * @param {scope} app - Network app.
 */
// Constructor
function TransactionsHttpApi (transactionsModule, app, logger, cache) {

	var router = new Router();

	// attach a middlware to endpoints
	router.attachMiddlwareForUrls(httpApi.middleware.useCache.bind(null, logger, cache), [
		'get /'
	]);

	router.map(transactionsModule.shared, {
		'get /': 'getTransactions',
		'get /get': 'getTransaction',
		'get /count': 'getTransactionsCount',
		'get /queued/get': 'getQueuedTransaction',
		'get /queued': 'getQueuedTransactions',
		'get /multisignatures/get': 'getMultisignatureTransaction',
		'get /multisignatures': 'getMultisignatureTransactions',
		'get /unconfirmed/get': 'getUnconfirmedTransaction',
		'get /unconfirmed': 'getUnconfirmedTransactions',
		'put /': 'addTransactions'
	});

	httpApi.registerEndpoint('/api/transactions', app, router, transactionsModule.isLoaded);
}

module.exports = TransactionsHttpApi;
