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

const prefixedPeer = require('../../fixtures/peers').randomNormalizedPeer;
const Peer = require('../../../logic/peer');
const BanManager = require('../../../helpers/ban_manager');

let configWithBlackListStub;
let loggerStub;
let banManagerInstance;
const twoMinTimeout = 120000;

describe('BanManager', () => {
	before(done => {
		loggerStub = {
			error: sinonSandbox.stub(),
			warn: sinonSandbox.stub(),
			log: sinonSandbox.stub(),
			debug: sinonSandbox.stub(),
			trace: sinonSandbox.stub(),
		};
		configWithBlackListStub = {
			peers: {
				access: {
					blackList: [],
				},
			},
		};
		return done();
	});
	beforeEach(done => {
		banManagerInstance = new BanManager(loggerStub, configWithBlackListStub);
		return done();
	});

	describe('constructor', () => {
		it('should have empty bannedPeers map after initialization', () => {
			return expect(banManagerInstance).to.have.property('bannedPeers').to.be
				.empty;
		});

		it('should have logger assigned after initialization', () => {
			return expect(banManagerInstance)
				.to.have.property('logger')
				.equal(loggerStub);
		});

		it('should have config assigned after initialization', () => {
			return expect(banManagerInstance)
				.to.have.property('config')
				.equal(configWithBlackListStub);
		});
	});

	describe('banTemporarily', () => {
		let validPeer;
		let onBanFinishedSpy;
		before(done => {
			validPeer = new Peer(prefixedPeer);
			onBanFinishedSpy = sinonSandbox.spy();
			return done();
		});

		beforeEach(done => {
			onBanFinishedSpy.reset();
			banManagerInstance.bannedPeers = {};
			banManagerInstance.banTemporarily(validPeer, onBanFinishedSpy);
			return done();
		});

		describe('when peer is in config.json blackList', () => {
			before(done => {
				configWithBlackListStub.peers.access.blackList = [validPeer.ip];
				return done();
			});
			it('should not add validPeer to bannedPeers map', () => {
				return expect(banManagerInstance.bannedPeers).not.to.have.property(
					validPeer.string
				);
			});
		});

		describe('when peer is not in config.json blackList', () => {
			let clock;
			before(done => {
				configWithBlackListStub.peers.access.blackList = [];
				clock = sinonSandbox.useFakeTimers();
				return done();
			});
			after(done => {
				clock.restore();
				return done();
			});

			describe('when peer was not banned before', () => {
				it('should add validPeer to bannedPeers map', () => {
					return expect(banManagerInstance.bannedPeers).to.have.property(
						validPeer.string
					);
				});
				it('should add an entry to bannedPeers containing validPeer', () => {
					return expect(banManagerInstance.bannedPeers[validPeer.string])
						.to.have.property('peer')
						.equal(validPeer);
				});
				it('should add an entry to bannedPeers containing banTimeoutId as a Timeout', () => {
					return expect(banManagerInstance.bannedPeers[validPeer.string])
						.to.have.nested.property('banTimeoutId.id')
						.to.be.a('number');
				});
				describe('when 2 min have not passed', () => {
					beforeEach(done => {
						clock.tick(twoMinTimeout - 1);
						return done();
					});
					it('should not call onBanFinished', () => {
						return expect(onBanFinishedSpy).not.to.be.called;
					});
				});
				describe('when 2 min have passed', () => {
					beforeEach(done => {
						clock.tick(twoMinTimeout);
						return done();
					});
					it('should call onBanFinished', () => {
						return expect(onBanFinishedSpy).to.be.called;
					});
					it('should call onBanFinished with validPeer', () => {
						return expect(onBanFinishedSpy).to.be.calledWith(validPeer);
					});
					it('should remove entry from bannedPeers', () => {
						return expect(banManagerInstance.bannedPeers).not.to.have.property(
							validPeer.string
						);
					});
				});
			});
		});
	});
});
