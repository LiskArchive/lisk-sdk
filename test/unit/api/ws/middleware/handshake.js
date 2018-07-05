/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

var randomstring = require('randomstring');
var typeRepresentatives = require('../../../../fixtures/types_representatives.js');
var Handshake = require('../../../../../api/ws/workers/middlewares/handshake');
var failureCodes = require('../../../../../api/ws/rpc/failure_codes');
var WSServerMaster = require('../../../../common/ws/server_master');
var System = require('../../../../../modules/system');

var config = __testContext.config;

describe('Handshake', () => {
	var system;
	var handshake;
	var minVersion = '1.0.0';
	var validPeerNonce = randomstring.generate(16);
	var validNodeNonce = randomstring.generate(16);
	var validConfig = {
		config: {
			version: config.version,
			minVersion,
			nethash: config.nethash,
			nonce: validNodeNonce,
			blackListedPeers: [],
		},
	};
	var validHeaders;

	before(done => {
		new System((err, __system) => {
			system = __system;
			handshake = Handshake.middleware.Handshake(system, validConfig.config);
			done(err);
		}, validConfig);
	});

	describe('compatibility', () => {
		beforeEach(done => {
			validHeaders = WSServerMaster.generatePeerHeaders({
				version: minVersion,
				nonce: validPeerNonce,
			});
			done();
		});

		it('should return an error when nonce is identical to server', done => {
			validHeaders.nonce = validConfig.config.nonce;
			handshake(validHeaders, err => {
				expect(err)
					.to.have.property('code')
					.equal(failureCodes.INCOMPATIBLE_NONCE);
				expect(err)
					.to.have.property('description')
					.equal(
						`Expected nonce to be not equal to: ${validConfig.config.nonce}`
					);
				done();
			});
		});

		it('should return an error when nethash does not match', done => {
			validHeaders.nethash = 'DIFFERENT_NETWORK_NETHASH';
			handshake(validHeaders, err => {
				expect(err)
					.to.have.property('code')
					.equal(failureCodes.INCOMPATIBLE_NETWORK);
				expect(err)
					.to.have.property('description')
					.contain(
						`Expected nethash: ${config.nethash} but received: ${
							validHeaders.nethash
						}`
					);
				done();
			});
		});

		it('should return an error when version is incompatible', done => {
			validHeaders.version = '0.0.0';
			handshake(validHeaders, err => {
				expect(err)
					.to.have.property('code')
					.equal(failureCodes.INCOMPATIBLE_VERSION);
				expect(err)
					.to.have.property('description')
					.equal(
						`Expected version: ${minVersion} but received: ${
							validHeaders.version
						}`
					);
				done();
			});
		});
	});

	after(done => {
		validHeaders = WSServerMaster.generatePeerHeaders({
			version: minVersion,
			nonce: '0123456789ABCDEF',
		});

		describe('schema tests', () => {
			var headers;

			beforeEach(done => {
				headers = _.cloneDeep(validHeaders);
				done();
			});

			describe('handshake', () => {
				var invalidTypes = _.difference(
					typeRepresentatives.allTypes,
					typeRepresentatives.objects
				);

				invalidTypes.forEach(type => {
					it(`should call callback with error.description when input is: ${
						type.description
					}`, done => {
						handshake(type.input, err => {
							expect(err.description).to.equal(
								`Expected type object but found type ${type.expectation}`
							);
							done();
						});
					});

					it(`should call callback with error.code when input is: ${
						type.description
					}`, done => {
						handshake(type.input, err => {
							expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
							done();
						});
					});
				});

				describe('nonce', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.strings
					);

					var validValues = _.map(new Array(10), () => {
						return randomstring.generate(16);
					});

					invalidTypes.forEach(type => {
						it(`should call callback with error.description when input is: ${
							type.description
						}`, done => {
							headers.nonce = type.input;
							handshake(headers, err => {
								expect(err.description).to.equal(
									`nonce: Expected type string but found type ${
										type.expectation
									}`
								);
								done();
							});
						});

						it(`should call callback with error.code when input is: ${
							type.description
						}`, done => {
							headers.nonce = type.input;
							handshake(headers, err => {
								expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
								done();
							});
						});
					});

					validValues.forEach(input => {
						it(`should call callback with error = null when input is:${input}`, done => {
							handshake(headers, err => {
								expect(err).to.not.exist;
								done();
							});
						});
					});
				});

				describe('height', () => {
					var validValues = _.map(new Array(10), () => {
						return Math.floor(Math.random() * Number.MAX_VALUE);
					});

					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.positiveIntegers,
						typeRepresentatives.negativeIntegers,
						typeRepresentatives.positiveNumbers,
						typeRepresentatives.negativeNumbers
					);

					invalidTypes.forEach(type => {
						it(`should call callback with error.description when input is: ${
							type.description
						}`, done => {
							headers.height = type.input;
							handshake(headers, err => {
								expect(err.description).to.equal(
									`height: Expected type integer but found type ${
										type.expectation
									}`
								);
								done();
							});
						});

						it(`should call callback with error.code when input is: ${
							type.description
						}`, done => {
							headers.height = type.input;
							handshake(headers, err => {
								expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
								done();
							});
						});
					});

					validValues.forEach(input => {
						it(`should call callback with error = null when input is: ${input}`, done => {
							headers.height = input;
							handshake(headers, err => {
								expect(err).to.not.exist;
								done();
							});
						});
					});
				});

				describe('nethash', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.strings
					);

					invalidTypes.forEach(type => {
						it(`should call callback with error.description when input is: ${
							type.description
						}`, done => {
							headers.nethash = type.input;
							handshake(headers, err => {
								expect(err.description).to.equal(
									`nethash: Expected type string but found type ${
										type.expectation
									}`
								);
								done();
							});
						});

						it(`should call callback with error.code when input is: ${
							type.description
						}`, done => {
							headers.nethash = type.input;
							handshake(headers, err => {
								expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
								done();
							});
						});
					});
				});

				describe('version', () => {
					var invalidTypes = _.difference(
						typeRepresentatives.allTypes,
						typeRepresentatives.strings
					);

					invalidTypes.forEach(type => {
						it(`should call callback with error.description when input is: ${
							type.description
						}`, done => {
							headers.version = type.input;
							handshake(headers, err => {
								expect(err.description).to.equal(
									`version: Expected type string but found type ${
										type.expectation
									}`
								);
								done();
							});
						});

						it(`should call callback with error.code when input is: ${
							type.description
						}`, done => {
							headers.version = type.input;
							handshake(headers, err => {
								expect(err.code).to.equal(failureCodes.INVALID_HEADERS);
								done();
							});
						});
					});
				});

				var requiredProperties = ['wsPort', 'version', 'nonce', 'nethash'];
				requiredProperties.forEach(property => {
					it(`should call callback with error for required property: ${property}`, done => {
						headers[property] = undefined;
						handshake(headers, err => {
							expect(err.description).to.equal(
								`Missing required property: ${property}`
							);
							done();
						});
					});
				});
			});
		});
		done();
	});
});
