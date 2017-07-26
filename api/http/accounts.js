'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');
var schema = require('../../schema/accounts.js');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/accounts`
 * - Public API:
 * 	- get 	/getBalance
 * 	- get 	/getPublicKey
 * 	- get 	/delegates
 * 	- get 	/delegates/fee
 * 	- get 	/
 * - Private API:
 * 	- get 	/count
 * @memberof module:accounts
 * @requires helpers/Router
 * @requires helpers/httpApi
 * @constructor
 * @param {Object} accountsModule - Module account instance.
 * @param {scope} app - Network app.
 */

function AccountsHttpApi (accountsModule, app) {

	var router = new Router();

	router.map(accountsModule.shared, {
		'get /': 'getAccount',
		'get /getBalance': 'getBalance',
		'get /getPublicKey': 'getPublickey',
		'get /delegates': 'getDelegates',
		'get /delegates/fee': 'getDelegatesFee'
	});

	if (process.env.TOP && process.env.TOP.toUpperCase() === 'TRUE') {
		router.get('/top', httpApi.middleware.sanitize('query', schema.top, accountsModule.internal.top));
	}

	httpApi.registerEndpoint('/api/accounts', app, router, accountsModule.isLoaded);
}

module.exports = AccountsHttpApi;
