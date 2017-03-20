'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');
var schema = require('../../schema/dapps');
var config = require('../../config.json');

// Constructor
function DappsHttpApi (dappsModule, app) {

	var router = new Router(config.api);

	router.map(dappsModule.internal, {
		'get /categories': 'categories',
		'get /installed': 'installed',
		'get /installedIds': 'installedIds',
		'get /ismasterpasswordenabled': 'isMasterPaswordEnabled',
		'get /installing': 'installing',
		'get /uninstalling': 'getDelegatesFee',
		'get /launched': 'launched',
		'post /launch': 'launch',
		'put /transaction': 'addTransactions',
		'put /withdrawal': 'sendWithdrawal'
	});

	router.get('/', httpApi.middleware.sanitize('query', schema.list, dappsModule.internal.list));
	router.put('/', httpApi.middleware.sanitize('body', schema.put, dappsModule.internal.put));
	router.get('/get', httpApi.middleware.sanitize('query', schema.get, dappsModule.internal.get));
	router.get('/search', httpApi.middleware.sanitize('query', schema.search, dappsModule.internal.search));
	router.post('/install', httpApi.middleware.sanitize('body', schema.install, dappsModule.internal.install));
	router.post('/uninstall', httpApi.middleware.sanitize('body', schema.uninstall, dappsModule.internal.uninstall));
	router.post('/stop', httpApi.middleware.sanitize('body', schema.stop, dappsModule.internal.stop));

	httpApi.registerEndpoint('/api/dapps', app, router, dappsModule.isLoaded);
}

module.exports = DappsHttpApi;
