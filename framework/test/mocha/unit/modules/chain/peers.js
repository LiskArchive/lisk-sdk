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

const prefixedPeer = require('../../../fixtures/peers').randomNormalizedPeer;
const { Peers } = require('../../../../../src/modules/chain/peers');

describe('peers', () => {
	const PEER_STATE_CONNECTED = 2;
	const channelMock = {
		invoke: sinonSandbox.stub(),
		once: sinonSandbox.stub(),
	};

	const mockLogger = {
		debug: sinonSandbox.stub(),
		info: sinonSandbox.stub(),
		warn: sinonSandbox.stub(),
		error: sinonSandbox.stub(),
	};

	const scope = {
		channel: channelMock,
		logger: mockLogger,
		forgingForce: true,
		minBroadhashConsensus: global.constants.MIN_BROADHASH_CONSENSUS,
	};

	let peersModule;

	before(async () => {
		peersModule = new Peers(scope);
	});

	describe('isPoorConsensus', () => {
		let isPoorConsensusResult;
		describe('when forgingForce is true', () => {
			beforeEach(async () => {
				isPoorConsensusResult = await peersModule.isPoorConsensus(
					prefixedPeer.broadhash
				);
			});

			it('should return false', async () =>
				expect(isPoorConsensusResult).to.be.false);
		});

		describe('when forgingForce is false', () => {
			beforeEach(async () => {
				scope.forgingForce = false;
				peersModule = new Peers(scope);
			});

			afterEach(async () => {
				scope.forgingForce = true;
				peersModule = new Peers(scope);
			});

			describe('when consensus < MIN_BROADHASH_CONSENSUS', () => {
				beforeEach(async () => {
					peersModule.calculateConsensus = sinonSandbox.stub().returns(50);
					isPoorConsensusResult = await peersModule.isPoorConsensus(
						prefixedPeer.broadhash
					);
				});

				it('should return true', async () =>
					expect(isPoorConsensusResult).to.be.true);
			});

			describe('when consensus >= MIN_BROADHASH_CONSENSUS', () => {
				beforeEach(async () => {
					peersModule.calculateConsensus = sinonSandbox.stub().returns(51);
					isPoorConsensusResult = await peersModule.isPoorConsensus(
						prefixedPeer.broadhash
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
				.stub(peersModule, 'calculateConsensus')
				.returns(50);
			lastConsensus = await peersModule.getLastConsensus(
				prefixedPeer.broadhash
			);
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
			calculateConsensusResult = await peersModule.calculateConsensus(
				prefixedPeer.broadhash
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
