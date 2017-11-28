'use strict';

var node = require('../../node.js');
var async = require('async');
var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var randomstring = require('randomstring');
var sinon = require('sinon');
var _ = require('lodash');
var randomString = require('randomstring');

var config = node.config;
var wsApi = require('../../../helpers/wsApi');
var failureCodes = require('../../../api/ws/rpc/failureCodes');
var WSClient = require('../../common/ws/client');
var System = require('../../../modules/system');
var typeRepresentatives = require('../../fixtures/typesRepresentatives.js');

describe('handshake', function () {

	var system;
	var handshake;
	var minVersion = '1.0.0';
	var validPeerNonce = randomstring.generate(16);
	var validNodeNonce = randomstring.generate(16);
	var validConfig = {
		config: {
			version: config.version,
			minVersion: minVersion,
			nethash: config.nethash,
			nonce: validNodeNonce
		}
	};
	var validHeaders;

	before(function (done) {
		new System(function (err, __system) {
			system = __system;
			handshake = wsApi.middleware.Handshake(system);
			done(err);
		}, validConfig);
	});

	describe('compatibility', function () {

		beforeEach(function () {
			validHeaders = WSClient.generatePeerHeaders();
			validHeaders.version = minVersion;
			validHeaders.nonce = validPeerNonce;
		});

		it('should return an error when nonce is identical to server', function (done) {
			validHeaders.nonce = validConfig.config.nonce;
			handshake(validHeaders, function (err) {
				expect(err).to.have.property('code').equal(failureCodes.INCOMPATIBLE_NONCE);
				expect(err).to.have.property('description').equal('Expected nonce to be not equal to: ' + validConfig.config.nonce);
				done();
			});
		});

		it('should return an error when nethash does not match', function (done) {
			validHeaders.nethash = 'DIFFERENT_NETWORK_NETHASH';
			handshake(validHeaders, function (err) {
				expect(err).to.have.property('code').equal(failureCodes.INCOMPATIBLE_NETWORK);
				expect(err).to.have.property('description').contain('Expected nethash: ' + config.nethash + ' but received: ' + validHeaders.nethash);
				done();
			});
		});

		it('should return an error when version is incompatible', function (done) {
			validHeaders.version = '0.0.0';
			handshake(validHeaders, function (err) {
				expect(err).to.have.property('code').equal(failureCodes.INCOMPATIBLE_VERSION);
				expect(err).to.have.property('description').equal('Expected version: ' + minVersion + ' but received: ' + validHeaders.version);
				done();
			});
		});
	});

	after(function () {

		validHeaders = WSClient.generatePeerHeaders();
		validHeaders.version =  minVersion;
		validHeaders.nonce = '0123456789ABCDEF';

		describe('schema tests', function () {

			var headers;

			beforeEach(function () {
				headers = _.cloneDeep(validHeaders);
			});

			describe('handshake', function () {

				var invalidTypes = _.difference(typeRepresentatives.allTypes,
					typeRepresentatives.objects
				);

				invalidTypes.forEach(function (type) {

					it('should call callback with error.description when input is: ' + type.description, function (done) {
						handshake(type.input, function (err) {
							expect(err.description).to.equal('#/: Expected type object but found type ' + type.expectation);
							done();
						});
					});

					it('should call callback with error.code when input is: ' + type.description, function (done) {
						handshake(type.input, function (err) {
							expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
							done();
						});
					});
				});

				describe('nonce', function  () {

					var invalidTypes = _.difference(typeRepresentatives.allTypes, 
						typeRepresentatives.strings
					);

					var validValues = _.map(new Array(10), function () {
						return randomString.generate(16);
					});

					invalidTypes.forEach(function (type) {

						it('should call callback with error.description when input is: ' + type.description, function (done) {
							headers.nonce = type.input;
							handshake(headers, function (err) {
								expect(err.description).to.equal('#/nonce: Expected type string but found type ' + type.expectation);
								done();
							});
						});

						it('should call callback with error.code when input is: ' + type.description, function (done) {
							headers.nonce = type.input;
							handshake(headers, function (err) {
								expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
								done();
							});
						});
					});

					validValues.forEach(function (input) {

						it('should call callback with error = null when input is:' + input, function (done) {

							handshake(headers, function (err) {
								expect(err).to.not.exist;
								done();
							});
						});
					});
				});

				describe('height', function  () {

					var validValues = _.map(new Array(10), function () {
						return Math.floor(Math.random() * (Number.MAX_VALUE));
					});

					var invalidTypes = _.difference(typeRepresentatives.allTypes, 
						typeRepresentatives.positiveIntegers,
						typeRepresentatives.negativeIntegers,
						typeRepresentatives.positiveNumbers,
						typeRepresentatives.negativeNumbers
					);

					var invalidValues = typeRepresentatives.negativeIntegers
						.concat(typeRepresentatives.positiveNumbers)
						.concat(typeRepresentatives.negativeNumbers);

					invalidTypes.forEach(function (type) {

						it('should call callback with error.description when input is: ' + type.description, function (done) {
							headers.height = type.input;
							handshake(headers, function (err) {
								expect(err.description).to.equal('#/height: Expected type integer but found type ' + type.expectation);
								done();
							});
						});

						it('should call callback with error.code when input is: ' + type.description, function (done) {
							headers.height = type.input;
							handshake(headers, function (err) {
								expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
								done();
							});
						});
					});

					validValues.forEach(function (input) {

						it('should call callback with error = null when input is: ' + input, function (done) {
							headers.height = input;
							handshake(headers, function (err) {
								expect(err).to.not.exist;
								done();
							});
						});
					});
				});

				describe('nethash', function () {

					var validValues = _.map(new Array(10), function () {
						return randomString.generate(64);
					});

					var invalidTypes = _.difference(typeRepresentatives.allTypes, 
						typeRepresentatives.strings
					);

					invalidTypes.forEach(function (type) {

						it('should call callback with error.description when input is: ' + type.description, function (done) {
							headers.nethash = type.input;
							handshake(headers, function (err) {
								expect(err.description).to.equal('#/nethash: Expected type string but found type ' + type.expectation);
								done();
							});
						});

						it('should call callback with error.code when input is: ' + type.description, function (done) {
							headers.nethash = type.input;
							handshake(headers, function (err) {
								expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
								done();
							});
						});
					});
				});

				describe('version', function () {

					var invalidTypes = _.difference(typeRepresentatives.allTypes, 
						typeRepresentatives.strings
					);

					invalidTypes.forEach(function (type) {

						it('should call callback with error.description when input is: ' + type.description, function (done) {
							headers.version = type.input;
							handshake(headers, function (err) {
								expect(err.description).to.equal('#/version: Expected type string but found type ' + type.expectation);
								done();
							});
						});

						it('should call callback with error.code when input is: ' + type.description, function (done) {
							headers.version = type.input;
							handshake(headers, function (err) {
								expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
								done();
							});
						});
					});
				});

				var requiredProperties = ['port', 'version', 'nonce', 'nethash', 'height'];
				requiredProperties.forEach(function (property) {
					it('should call callback with error for required property: ' + property, function (done) {
						headers[property] = undefined;
						handshake(headers, function (err) {
							expect(err.description).to.equal('#/: Missing required property: ' + property);
							done();
						});
					});
				});
			});
		});
	});
});
