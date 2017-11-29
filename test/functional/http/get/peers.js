'use strict';

require('../../functional.js');

var _ = require('lodash');
var node = require('../../../node.js');
var WSServer = require('../../../common/ws/serverMaster');
var swaggerEndpoint = require('../../../common/swaggerSpec');
var apiHelpers = require('../../../common/apiHelpers');

describe('GET /peers', function () {

	var peersEndpoint = new swaggerEndpoint('GET /peers');
	var wsServer1;
	var wsServer2;
	var validHeaders = null;

	before(function () {
		wsServer1 = new WSServer();
		wsServer2 = new WSServer();

		return wsServer1.start().then(function () {
			validHeaders = wsServer1.getHeaders();
			return wsServer2.start();
		});
	});

	after(function () {
		wsServer1.stop();
		wsServer2.stop();
	});

	var paramSet = {
		ip: {
			valid: ['192.168.99.1'], invalid: ['invalid', '1278.0.0.2'], checkResponse: true
		},
		wsPort: {
			valid: [65535, 4508], invalid: [0, 65536], checkResponse: true
		},
		httpPort: {
			valid: [65535, 4508], invalid: [0, 65536], checkResponse: true
		},
		state: {
			valid: [0, 1, 2], invalid: [-1, 3], checkResponse: true
		},
		version: {
			valid: ['999.999.999a'], invalid: ['9999.999.999ab'], checkResponse: true
		},
		broadhash: {
			valid: [node.config.nethash], invalid: ['invalid'], checkResponse: true
		},
		limit: {
			valid: [1, 100], invalid: [-1, 0]
		},
		offset: {
			valid: [1], invalid: [-1]
		},
		sort: {
			valid: ['height:asc'], invalid: ['alpha']
		}
	};

	Object.keys(paramSet).forEach(function (param) {

		// Describe each param
		describe(param, function () {

			paramSet[param].invalid.forEach(function (val) {

				// Test case for each invalid param
				it('using invalid value ' + param + '=' + val, function () {
					var params = {};
					params[param] = val;
					return peersEndpoint.makeRequest(params, 400).then(function (res) {
						apiHelpers.expectSwaggerParamError(res, param);
					});
				});
			});

			paramSet[param].valid.forEach(function (val) {

				// Test case for each valid param
				it('using valid value ' + param + '=' + val, function () {
					var params = {};
					params[param] = val;
					return peersEndpoint.makeRequest(params, 200).then(function (res) {
						if(paramSet[param].checkResponse) {
							res.body.data.forEach(function (peer) {
								peer[param].should.be.eql(val);
							});
						}
					});
				});
			});
		});
	});

	describe('pass data from a real peer', function () {

		it('using a valid httpPort should return the result', function () {
			return peersEndpoint.makeRequest({httpPort: validHeaders.httpPort}, 200)
				.then(function (res) {
					res.body.data[0].httpPort.should.be.eql(validHeaders.httpPort);
				});
		});

		it('using state = 2 should return the result', function () {
			return peersEndpoint.makeRequest({state: validHeaders.status}, 200)
				.then(function (res) {
					res.body.data[0].state.should.be.eql(2);
				});
		});

		it('using version = "0.0.0a" should return the result', function () {
			return peersEndpoint.makeRequest({version: validHeaders.version}, 200)
				.then(function (res) {
					res.body.data[0].version.should.be.eql(validHeaders.version);
				});
		});

		it('using valid broadhash = "198f2b61a8eb95fbeed58b8216780b68f697f26b849acf00c8c93bb9b24f783d" should return the result', function () {
			return peersEndpoint.makeRequest({broadhash: validHeaders.broadhash}, 200)
				.then(function (res) {
					res.body.data[0].broadhash.should.be.eql(validHeaders.broadhash);
				});
		});

		it('using sort = "version:asc" should return results in ascending order by version', function () {
			return peersEndpoint.makeRequest({sort: 'version:asc'}, 200)
				.then(function (res) {
					var versions = _(res.body.data).map('version').value();
					_.clone(versions).sort().should.be.eql(versions);
				});
		});

		it('using sort = "version:desc" should return results in descending order by version', function () {
			return peersEndpoint.makeRequest({sort: 'version:desc'}, 200)
				.then(function (res) {
					var versions = _(res.body.data).map('version').value();
					_.clone(versions).sort().reverse().should.be.eql(versions);
				});
		});

		it('using limit = 1 and offset = 1 should be ok', function () {
			var limit = 1;
			var firstObject = null;

			return peersEndpoint.makeRequest({limit: limit}, 200)
				.then(function (res) {
					res.body.data.length.should.be.at.most(limit);
					firstObject = res.body.data[0];

					return peersEndpoint.makeRequest({limit: limit, offset: 1}, 200);
				})
				.then(function (res) {
					res.body.data.length.should.be.at.most(limit);
					res.body.data[0].should.not.equal(firstObject);
				});
		});
	});
});
