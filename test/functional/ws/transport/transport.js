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

require('../../functional.js');
const async = require('async');
const WAMPServer = require('wamp-socket-cluster/WAMPServer');
const prefixedPeer = require('../../../fixtures/peers').randomNormalizedPeer;
const Rules = require('../../../../api/ws/workers/rules');
const wsRPC = require('../../../../api/ws/rpc/ws_rpc').wsRPC;
const WsTestClient = require('../../../common/ws/client');

describe('RPC', () => {
	let connectedPeer;

	before(done => {
		// Setup stub for tested endpoints
		const RPCEndpoints = {
			updatePeer: () => {},
			height: () => {},
			status: () => {},
			list: () => {},
			blocks: () => {},
			updateMyself: () => {},
		};
		const wampServer = new WAMPServer();
		wampServer.registerRPCEndpoints(RPCEndpoints);
		wsRPC.setServer(wampServer);

		// Register client
		const wsTestClient = new WsTestClient();
		wsTestClient.start();
		connectedPeer = wsTestClient.client;
		done();
	});

	describe('internal', () => {
		describe('updatePeer', () => {
			var validAcceptRequest;

			beforeEach(done => {
				validAcceptRequest = {
					authKey: 'authentication key',
					peer: prefixedPeer,
					updateType: Rules.UPDATES.INSERT,
				};
				done();
			});

			describe('schema', () => {
				it('should reject empty request', done => {
					connectedPeer.rpc.updatePeer(undefined, err => {
						expect(err).to.equal('Missing required property: updateType');
						done();
					});
				});

				it('should reject requests without peer field defined', done => {
					delete validAcceptRequest.peer;
					connectedPeer.rpc.updatePeer(validAcceptRequest, err => {
						expect(err).to.equal('Missing required property: peer');
						done();
					});
				});

				it('should reject requests without authKey field defined', done => {
					delete validAcceptRequest.authKey;
					connectedPeer.rpc.updatePeer(validAcceptRequest, err => {
						expect(err).to.equal('Missing required property: authKey');
						done();
					});
				});

				it('should reject requests with incorrect authKey', done => {
					validAcceptRequest.authKey = 'incorrect authKey';
					connectedPeer.rpc.updatePeer(validAcceptRequest, err => {
						expect(err).to.equal(
							'Unable to access internal function - Incorrect authKey'
						);
						done();
					});
				});

				it('should reject requests without updateType', done => {
					delete validAcceptRequest.updateType;
					connectedPeer.rpc.updatePeer(validAcceptRequest, err => {
						expect(err).to.equal('Missing required property: updateType');
						done();
					});
				});

				it('should reject requests when updateType is not a number', done => {
					var nonNumbers = [{}, [], 'A', '1', NaN, true];
					async.forEachOf(
						nonNumbers,
						(nonNumber, index, eachCb) => {
							validAcceptRequest.updateType = nonNumber;

							connectedPeer.rpc.updatePeer(validAcceptRequest, err => {
								expect(err).to.contain('Expected type integer but found type');
								eachCb();
							});
						},
						done
					);
				});

				it('should reject requests when updateType is greater than 1', done => {
					validAcceptRequest.updateType = 2;
					connectedPeer.rpc.updatePeer(validAcceptRequest, err => {
						expect(err).to.contain(
							`Value ${validAcceptRequest.updateType} is greater than maximum 1`
						);
						done();
					});
				});
			});
		});
	});

	describe('height', () => {
		it('should return height', done => {
			connectedPeer.rpc.height('height', (err, result) => {
				expect(result).to.have.property('success').to.be.ok;
				expect(result)
					.to.have.property('height')
					.that.is.a('number')
					.at.least(1);
				done();
			});
		});
	});

	describe('status', () => {
		it('should return height, broadhash, nonce, os, version and httpPort', done => {
			connectedPeer.rpc.status((err, result) => {
				expect(result).to.have.property('success').to.be.ok;
				expect(result)
					.to.have.property('broadhash')
					.that.is.a('string');
				expect(result)
					.to.have.property('nonce')
					.that.is.a('string');
				expect(result)
					.to.have.property('os')
					.that.is.a('string');
				expect(result)
					.to.have.property('version')
					.that.is.a('string');
				expect(result)
					.to.have.property('httpPort')
					.that.is.a('number');
				expect(result)
					.to.have.property('height')
					.that.is.a('number')
					.at.least(1);
				done();
			});
		});
	});

	describe('list', () => {
		it('should return list of peers', done => {
			connectedPeer.rpc.list((err, result) => {
				expect(result).to.have.property('success').to.be.ok;
				expect(result)
					.to.have.property('peers')
					.to.be.an('array');
				done();
			});
		});

		it('asking for a list multiple times should be ok', done => {
			var successfulAsks = 0;
			/* eslint-disable no-loop-func */
			for (var i = 0; i < 100; i += 1) {
				connectedPeer.rpc.list((err, result) => {
					expect(result).to.have.property('success').to.be.ok;
					expect(result)
						.to.have.property('peers')
						.to.be.an('array');
					successfulAsks += 1;
					if (successfulAsks === 100) {
						done();
					}
				});
			}
		});
	});

	describe('blocks', () => {
		it('should return height and broadhash', done => {
			connectedPeer.rpc.blocks((err, result) => {
				expect(result)
					.to.have.property('blocks')
					.to.be.an('array');
				done();
			});
		});
	});
});
