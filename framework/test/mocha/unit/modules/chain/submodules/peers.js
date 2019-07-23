/*
 * Copyright © 2019 Lisk Foundation
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

const rewire = require('rewire');
const randomstring = require('randomstring');
const prefixedPeer = require('../../../../fixtures/peers').randomNormalizedPeer;
const modulesLoader = require('../../../../common/modules_loader');

describe('peers', () => {
	const NONCE = randomstring.generate(16);

	let storageMock;
	let peers;
	let PeersRewired;

	let scope;
	let channelMock;

	before(done => {
		storageMock = {
			entities: {
				Peer: {
					get: sinonSandbox.stub().resolves(),
				},
			},
		};

		channelMock = {
			invoke: sinonSandbox.stub(),
			once: sinonSandbox.stub(),
		};

		PeersRewired = rewire(
			'../../../../../../src/modules/chain/submodules/peers'
		);

		scope = _.defaultsDeep(
			{
				nonce: NONCE,
				components: { storage: storageMock },
				channel: channelMock,
				applicationState: {},
			},
			modulesLoader.scope
		);

		new PeersRewired((err, peersModule) => {
			peers = peersModule;
			done();
		}, scope);
	});

	describe('isPoorConsensus', () => {
		let isPoorConsensusResult;

		describe('when library.config.forging.force is true', () => {
			beforeEach(async () => {
				isPoorConsensusResult = await peers.isPoorConsensus();
			});

			it('should return false', async () =>
				expect(isPoorConsensusResult).to.be.false);
		});

		describe('when library.config.forging.force is false', () => {
			beforeEach(done => {
				scope.config.forging.force = false;
				new PeersRewired((err, peersModule) => {
					peers = peersModule;
					done();
				}, scope);
			});

			afterEach(done => {
				scope.config.forging.force = true;
				new PeersRewired((err, peersModule) => {
					peers = peersModule;
					done();
				}, scope);
			});

			describe('when consensus < MIN_BROADHASH_CONSENSUS', () => {
				beforeEach(async () => {
					peers.calculateConsensus = sinonSandbox.stub().returns(50);
					isPoorConsensusResult = await peers.isPoorConsensus();
				});

				it('should return true', async () =>
					expect(isPoorConsensusResult).to.be.true);
			});

			describe('when consensus >= MIN_BROADHASH_CONSENSUS', () => {
				beforeEach(async () => {
					peers.calculateConsensus = sinonSandbox.stub().returns(51);
					isPoorConsensusResult = await peers.isPoorConsensus();
				});

				it('should return false', async () =>
					expect(isPoorConsensusResult).to.be.false);
			});
		});
	});

	describe('getLastConsensus', () => {
		it('should return self.consensus value', async () =>
			expect(peers.getLastConsensus()).equal(
				PeersRewired.__get__('self.consensus')
			));
	});

	describe('calculateConsensus', () => {
		let calculateConsensusResult;

		beforeEach(async () => {
			Object.assign(scope.applicationState, {
				broadhash: prefixedPeer.broadhash,
				height: prefixedPeer.height,
				httpPort: 'anHttpHeight',
				nonce: 'aNonce',
				os: 'anOs',
				version: '1.0.0',
				minVersion: '1.0.0-beta.0',
				protocolVersion: '1.0',
			});
			calculateConsensusResult = await peers.calculateConsensus();
		});

		afterEach(async () => {
			channelMock.invoke.resetHistory();
		});

		after(async () => {
			sinonSandbox.restore();
		});

		describe('when all CONNECTED peers match our broadhash', () => {
			before(async () => {
				channelMock.invoke
					.withArgs('network:getConnectedPeersCountByFilter')
					.returns(2);
				channelMock.invoke
					.withArgs('network:getConnectedPeersCountByFilter', {
						broadhash: prefixedPeer.broadhash,
					})
					.returns(2);
			});

			it('should set self.consensus value', async () =>
				expect(PeersRewired.__get__('self.consensus')).to.equal(
					calculateConsensusResult
				));

			it('should call channel invoke twice', async () =>
				expect(channelMock.invoke.calledTwice).to.be.true);

			it('should call channel invoke with action network:getConnectedPeersCountByFilter', async () =>
				expect(
					channelMock.invoke.calledWithExactly(
						'network:getConnectedPeersCountByFilter',
						{}
					)
				).to.be.true);

			it('should call channel invoke with action network:getConnectedPeersCountByFilter and filter broadhash', async () =>
				expect(
					channelMock.invoke.calledWithExactly(
						'network:getConnectedPeersCountByFilter',
						{ broadhash: prefixedPeer.broadhash }
					)
				).to.be.true);

			it('should return consensus as a number', async () =>
				expect(calculateConsensusResult).to.be.a('number'));

			it('should return consensus = 100', async () =>
				expect(calculateConsensusResult).to.equal(100));
		});

		describe('when half of connected peers match our broadhash', () => {
			before(async () => {
				channelMock.invoke
					.withArgs('network:getConnectedPeersCountByFilter')
					.returns(2);
				channelMock.invoke
					.withArgs('network:getConnectedPeersCountByFilter', {
						broadhash: prefixedPeer.broadhash,
					})
					.returns(1);
			});

			it('should return consensus = 50', async () =>
				expect(calculateConsensusResult).to.equal(50));
		});
	});
});
