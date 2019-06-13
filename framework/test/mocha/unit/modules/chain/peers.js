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

const randomstring = require('randomstring');
const prefixedPeer = require('../../../fixtures/peers').randomNormalizedPeer;
const modulesLoader = require('../../../common/modules_loader');
const { Peers } = require('../../../../../src/modules/chain/peers');

describe('peers', () => {
	const PEER_STATE_CONNECTED = 2;
	const NONCE = randomstring.generate(16);

	let storageMock;
	let peers;
	let blocksStub;

	let scope;
	let channelMock;

	before(async () => {
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

		blocksStub = {
			broadhash: prefixedPeer.broadhash,
		};

		scope = _.cloneDeep({
			...modulesLoader.scope,
			nonce: NONCE,
			components: {
				storage: storageMock,
				...modulesLoader.scope.components,
			},
			channel: channelMock,
			applicationState: {},
			modules: { blocks: blocksStub },
		});
		peers = new Peers(scope);
	});

	describe('isPoorConsensus', () => {
		let isPoorConsensusResult;

		describe('when library.config.forging.force is true', () => {
			beforeEach(async () => {
				isPoorConsensusResult = await peers.isPoorConsensus(
					blocksStub.broadhash
				);
			});

			it('should return false', async () =>
				expect(isPoorConsensusResult).to.be.false);
		});

		describe('when library.config.forging.force is false', () => {
			beforeEach(async () => {
				scope.config.forging.force = false;
				peers = new Peers(scope);
			});

			afterEach(async () => {
				scope.config.forging.force = true;
				peers = new Peers(scope);
			});

			describe('when consensus < MIN_BROADHASH_CONSENSUS', () => {
				beforeEach(async () => {
					peers.calculateConsensus = sinonSandbox.stub().returns(50);
					isPoorConsensusResult = await peers.isPoorConsensus(
						blocksStub.broadhash
					);
				});

				it('should return true', async () =>
					expect(isPoorConsensusResult).to.be.true);
			});

			describe('when consensus >= MIN_BROADHASH_CONSENSUS', () => {
				beforeEach(async () => {
					peers.calculateConsensus = sinonSandbox.stub().returns(51);
					isPoorConsensusResult = await peers.isPoorConsensus(
						blocksStub.broadhash
					);
				});

				it('should return false', async () =>
					expect(isPoorConsensusResult).to.be.false);
			});
		});
	});

	describe('getLastConsensus', () => {
		let lastConsensus;
		let calculateConsensusStub;

		beforeEach(async () => {
			calculateConsensusStub = sinonSandbox
				.stub(peers, 'calculateConsensus')
				.returns(50);
			lastConsensus = await peers.getLastConsensus(blocksStub.broadhash);
		});

		afterEach(async () => {
			calculateConsensusStub.restore();
		});

		it('should return last consensus value value', async () => {
			expect(lastConsensus).equal(50);
		});
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
			calculateConsensusResult = await peers.calculateConsensus(
				blocksStub.broadhash
			);
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
					.withArgs('network:getPeersCountByFilter', {
						state: PEER_STATE_CONNECTED,
					})
					.returns(2);
				channelMock.invoke
					.withArgs('network:getPeersCountByFilter', {
						broadhash: prefixedPeer.broadhash,
						state: PEER_STATE_CONNECTED,
					})
					.returns(2);
			});

			it('should call channel invoke twice', async () =>
				expect(channelMock.invoke.calledTwice).to.be.true);

			it('should call channel invoke with action network:getPeersCountByFilter and filter state', async () =>
				expect(
					channelMock.invoke.calledWithExactly(
						'network:getPeersCountByFilter',
						{ state: PEER_STATE_CONNECTED }
					)
				).to.be.true);

			it('should call channel invoke with action network:getPeersCountByFilter and filter broadhash', async () =>
				expect(
					channelMock.invoke.calledWithExactly(
						'network:getPeersCountByFilter',
						{ broadhash: prefixedPeer.broadhash, state: PEER_STATE_CONNECTED }
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
					.withArgs('network:getPeersCountByFilter', {
						state: PEER_STATE_CONNECTED,
					})
					.returns(2);
				channelMock.invoke
					.withArgs('network:getPeersCountByFilter', {
						broadhash: prefixedPeer.broadhash,
						state: PEER_STATE_CONNECTED,
					})
					.returns(1);
			});

			it('should return consensus = 50', async () =>
				expect(calculateConsensusResult).to.equal(50));
		});
	});
});
