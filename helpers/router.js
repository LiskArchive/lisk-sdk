'use strict';

var extend = require('extend');

function Map (root, config) {
	var router = this;

	Object.keys(config).forEach(function (params) {
		var route = params.split(' ');
		if (route.length !== 2 || ['post', 'get', 'put'].indexOf(route[0]) === -1) {
			throw Error('Invalid map config');
		}
		router[route[0]](route[1], function (req, res, next) {
			root[config[params]]({'body': route[0] === 'get' ? req.query : req.body}, function (err, response) {
				if (err) {
					res.json({'success': false, 'error': err});
				} else {
					return res.json(extend({}, {'success': true}, response));
				}
			});
		});
	});
}

/**
 * @title Router
 * @overview Router stub
 * @returns {*}
 */
var Router = function () {
	var router = require('express').Router();

	router.use(function (req, res, next) {
		res.header('Access-Control-Allow-Origin', '*');
		res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
		next();
	});

	router.map = Map;

	return router;
};

module.exports = Router;
