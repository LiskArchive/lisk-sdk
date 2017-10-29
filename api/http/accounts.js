'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');
var schema = require('../../schema/accounts.js');

/**
 * Binds api with modules and creates common url.
 * - End point: `/api/accounts`
 * - Public API:
 * 	- get 	/
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
		'get /': 'getAccounts'
	}, {responseWithCode: true});

	httpApi.registerEndpoint('/api/accounts', app, router, accountsModule.isLoaded);
}

module.exports = AccountsHttpApi;
