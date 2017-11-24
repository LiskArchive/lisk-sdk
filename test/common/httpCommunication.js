'use strict';

var config = require('../config.json');
var node = require('../node');

var baseUrl = 'http://' + config.address + ':' + config.httpPort;

var httpCommunication = {

	baseUrl: baseUrl,

	abstractRequest: function (options, done) {
		var request = node.api[options.verb.toLowerCase()](options.path);

		request.set('Accept', 'application/json');
		request.expect(function (response) {
			if (response.statusCode !== 204 && (!response.headers['content-type'] || response.headers['content-type'].indexOf('json') === -1)) {
				return new Error('Unexpected content-type!');
			}
		});

		if (options.params) {
			request.send(options.params);
		}

		var verb = options.verb.toUpperCase();
		node.debug(['> Path:'.grey, verb, options.path].join(' '));
		if (verb === 'POST' || verb === 'PUT') {
			node.debug(['> Data:'.grey, JSON.stringify(options.params)].join(' '));
		}

		if (done) {
			request.end(function (err, res) {
				node.debug('> Status:'.grey, JSON.stringify(res ? res.statusCode : ''));
				node.debug('> Response:'.grey, JSON.stringify(res ? res.body : err));
				done(err, res);
			});
		} else {
			return request;
		}
	},

	// Get the given path
	get: function (path, done) {
		return this.abstractRequest({verb: 'GET', path: path, params: null}, done);
	},

	// Post to the given path
	post: function (path, params, done) {
		return this.abstractRequest({verb: 'POST', path: path, params: params}, done);
	},

	// Put to the given path
	put: function (path, params, done) {
		return this.abstractRequest({verb: 'PUT', path: path, params: params}, done);
	},

	getHeight: function (cb) {
		var request = node.popsicle.get(baseUrl + '/api/node/status');

		request.use(node.popsicle.plugins.parse(['json']));

		request.then(function (res) {
			if (res.status !== 200) {
				return setImmediate(cb, ['Received bad response code', res.status, res.url].join(' '));
			} else {
				return setImmediate(cb, null, res.body.data.height);
			}
		});

		request.catch(function (err) {
			return setImmediate(cb, err);
		});
	}
};

module.exports = httpCommunication;
