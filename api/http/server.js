'use strict';

var Router = require('../../helpers/router');
var httpApi = require('../../helpers/httpApi');

// Constructor
function ServerHttpApi (serverModule, app) {

	var router = new Router();

	router.use(function (req, res, next) {
		if (serverModule.areModulesReady()) { return next(); }
		res.status(500).send({success: false, error: 'Blockchain is loading'});
	});

	router.get('/', function (req, res) {
		if (serverModule.isLoaded()) {
			res.render('wallet.html', {layout: false});
		} else {
			res.render('loading.html');
		}
	});

	router.use(function (req, res, next) {
		if (req.url.indexOf('/api/') === -1 && req.url.indexOf('/peer/') === -1) {
			return res.redirect('/');
		}
		next();
	});

	app.use('/', router);
}

module.exports = ServerHttpApi;
