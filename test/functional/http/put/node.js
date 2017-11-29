'use strict';

require('../../functional.js');

var node = require('../../../node');
var swaggerEndpoint = require('../../../common/swaggerSpec');
var apiHelpers = require('../../../common/apiHelpers');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
var genesisDelegates = require('../../../data/genesisDelegates.json');

describe('PUT /node/status/forging', function () {

	var validDelegate = genesisDelegates.delegates[0];
	var toggleForgingEndpoint = new swaggerEndpoint('PUT /node/status/forging');
	var forgingStatusEndpoint = new swaggerEndpoint('GET /node/status/forging');

	before(function () {
		return forgingStatusEndpoint.makeRequest({publicKey: validDelegate.publicKey}, 200).then(function (res) {
			if(!res.body.data[0].forging) {
				return toggleForgingEndpoint.makeRequest({data: {publicKey: validDelegate.publicKey, decryptionKey: validDelegate.key}}, 200)
					.then(function (res) {
						res.body.data[0].publicKey.should.be.eql(validDelegate.publicKey);
						res.body.data[0].forging.should.be.true;
					});
			}
		});
	});

	// TODO: Find a library for supertest to make request from a proxy server
	it('called from unauthorized IP should fail');

	it('using no params should fail', function () {
		return toggleForgingEndpoint.makeRequest({data: {}}, 400).then(function (res) {
			expectSwaggerParamError(res, 'data');
		});
	});

	it('using invalid publicKey should fail', function () {
		var invalidPublicKey = '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
		var params = {
			publicKey: invalidPublicKey,
			decryptionKey: validDelegate.key
		};

		return toggleForgingEndpoint.makeRequest({data: params}, 404).then(function (res) {
			res.body.message.should.contains('not found');
		});
	});

	it('using invalid key should fail', function () {
		var params = {
			publicKey: validDelegate.publicKey,
			decryptionKey: 'invalid key'
		};

		return toggleForgingEndpoint.makeRequest({data: params}, 404).then(function (res) {
			res.body.message.should.contain('Invalid key and public key combination');
		});
	});

	it('using valid params should be ok', function () {
		var params = {
			publicKey: validDelegate.publicKey,
			decryptionKey: validDelegate.key
		};

		return toggleForgingEndpoint.makeRequest({data: params}, 200).then(function (res) {
			res.body.data.should.have.length(1);
			res.body.data[0].publicKey.should.be.eql(validDelegate.publicKey);
		});
	});

	it('using valid params should toggle forging status', function () {
		var params = {
			publicKey: validDelegate.publicKey,
			decryptionKey: validDelegate.key
		};

		return forgingStatusEndpoint.makeRequest({publicKey: params.publicKey}, 200).then(function (res) {
			var currentStatus = res.body.data[0].forging;

			return toggleForgingEndpoint.makeRequest({data: params}, 200).then(function (res) {
				res.body.data[0].publicKey.should.eql(validDelegate.publicKey);
				res.body.data[0].forging.should.not.eql(currentStatus);
			});
		});
	});
});
