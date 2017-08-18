'use strict';

var config = require('../../../config.json');

var async = require('async');
var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var sinon = require('sinon');

var wsApi = require('../../../helpers/wsApi');
var failureCodes = require('../../../api/ws/rpc/failureCodes');

var System = require('../../../modules/system');

describe('handshake', function () {

	var system;
	var handshake;
	var validConfig;
	var validHeaders;
	var minVersion = '1.0.0';
	var nonStrings = [{}, [], 1, 0.1, NaN, true];
	var nonNumbers = [{}, [], 'A', '1', NaN, true];

	beforeEach(function (done) {
		validConfig = {
			config: {
				version: config.version,
				minVersion: minVersion,
				nethash: config.nethash,
				nonce: 'ABCDEF0123456789'
			}
		};
		new System(function (err, __system) {
			system = __system;
			handshake = wsApi.middleware.Handshake(system);
			done(err);
		}, validConfig);

		validHeaders = {
			port: 5000,
			nethash: config.nethash,
			version: minVersion,
			nonce: '0123456789ABCDEF',
			height: 1
		};
	});

	it('should accept handshake for valid headers', function (done) {
		handshake(validHeaders, function (err) {
			expect(err).to.be.null;
			done();
		});
	});

	it('should return an error when invoked with undefined', function (done) {
		handshake(undefined, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
			expect(err).to.have.property('description').equal('#/: Expected type object but found type undefined');
			done();
		});
	});

	it('should return an error when invoked with null', function (done) {
		handshake(null, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
			expect(err).to.have.property('description').equal('#/: Expected type object but found type null');
			done();
		});
	});

	it('should return an error when invoked with 0', function (done) {
		handshake(0, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
			expect(err).to.have.property('description').equal('#/: Expected type object but found type integer');
			done();
		});
	});

	it('should return an error when invoked with empty object', function (done) {
		handshake({}, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
			expect(err).to.have.property('description').contain('Missing required property');
			done();
		});
	});

	it('should return an error when invoked without version', function (done) {
		delete validHeaders.version;
		handshake(validHeaders, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
			expect(err).to.have.property('description').equal('#/: Missing required property: version');
			done();
		});
	});

	it('should return an error when version is not a string', function (done) {
		async.forEachOf(nonStrings, function (nonString, index, eachCb) {
			validHeaders.version = nonString;
			handshake(validHeaders, function (err) {
				expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
				expect(err).to.have.property('description').contain('#/version: Expected type string but found type');
				eachCb();
			});
		}, done);
	});

	it('should return an error when version is incompatible', function (done) {
		validHeaders.version = '0.0.0';
		handshake(validHeaders, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INCOMPATIBLE_VERSION);
			expect(err).to.have.property('description').equal('Expected min version: ' + minVersion + ' but received: ' + validHeaders.version);
			done();
		});
	});

	it('should return an error when invoked without port', function (done) {
		delete validHeaders.port;
		handshake(validHeaders, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
			expect(err).to.have.property('description').equal('#/: Missing required property: port');
			done();
		});
	});

	it('should return an error when port is not a number', function (done) {
		async.forEachOf(nonNumbers, function (nonNumber, index, eachCb) {
			validHeaders.port = nonNumber;
			handshake(validHeaders, function (err) {
				expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
				expect(err).to.have.property('description').contain('#/port: Expected type integer but found type');
				eachCb();
			});
		}, done);
	});

	it('should return an error when invoked without nethash', function (done) {
		delete validHeaders.nethash;
		handshake(validHeaders, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
			expect(err).to.have.property('description').equal('#/: Missing required property: nethash');
			done();
		});
	});

	it('should return an error when nethash is not a string', function (done) {
		async.forEachOf(nonStrings, function (nonString, index, eachCb) {
			validHeaders.nethash = nonString;
			handshake(validHeaders, function (err) {
				expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
				expect(err).to.have.property('description').contain('#/nethash: Expected type string but found type');
				eachCb();
			});
		}, done);
	});

	it('should return an error when nethash does not match', function (done) {
		async.forEachOf(nonStrings, function (nonString, index, eachCb) {
			validHeaders.nethash = 'DIFFERENT_NETWORK_NETHASH';
			handshake(validHeaders, function (err) {
				expect(err).to.have.property('code').equal(failureCodes.INCOMPATIBLE_NETWORK);
				expect(err).to.have.property('description').contain('Expected network: ' + config.nethash + ' but received: ' + validHeaders.nethash);
				eachCb();
			});
		}, done);
	});

	it('should return an error when invoked without nonce', function (done) {
		delete validHeaders.nonce;
		handshake(validHeaders, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
			expect(err).to.have.property('description').equal('#/: Missing required property: nonce');
			done();
		});
	});

	it('should return an error when nonce is not a string', function (done) {
		async.forEachOf(nonStrings, function (nonString, index, eachCb) {
			validHeaders.nonce = nonString;
			handshake(validHeaders, function (err) {
				expect(err).to.have.property('code').equal(failureCodes.INVALID_HEADERS);
				expect(err).to.have.property('description').contain('#/nonce: Expected type string but found type');
				eachCb();
			});
		}, done);
	});

	it('should return an error when nonce is identical to server', function (done) {
		validHeaders.nonce = validConfig.config.nonce;
		handshake(validHeaders, function (err) {
			expect(err).to.have.property('code').equal(failureCodes.INCOMPATIBLE_NONCE);
			expect(err).to.have.property('description').contain('Expected nonce different than ' + validConfig.config.nonce);
			done();
		});
	});
});
