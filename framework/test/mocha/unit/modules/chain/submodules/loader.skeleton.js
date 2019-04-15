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

/* eslint-disable mocha/no-pending-tests */
describe('loader', () => {
	describe('constructor', () => {
		describe('library', () => {
			it('should assign logger');

			it('should assign db');

			it('should assign network');

			it('should assign schema');

			it('should assign sequence');

			it('should assign bus');

			it('should assign genesisBlock');

			it('should assign balancesSequence');

			describe('logic', () => {
				it('should assign logic.transaction');

				it('should assign logic.account');

				it('should assign logic.peers');
			});

			describe('config', () => {
				it('should assign config.loading.snapshotRound');
			});
		});

		it('should call __private.initialize');

		describe('__private', () => {
			it('should assign genesisBlock');

			it('should assign lastBlock');
		});

		it('should return error = null');

		it('should return Loader instance');
	});

	describe('findGoodPeers', () => {
		it('should call modules.blocks.lastBlock.get');

		it('should call library.logger.trace');

		it('should call library.logger.trace with "Good peers - received"');

		it('should call library.logger.trace with {count: peers.length}}');

		it('should call library.logger.trace second time');

		it(
			'should call library.logger.trace second time with "Good peers - filtered"'
		);

		describe('when peers = []', () => {
			it('should call library.logger.trace second time with {count: 0}');

			it('should return result = {height: 0, peers: []}');
		});

		describe('when peers = [null]', () => {
			it('should call library.logger.trace second time with {count: 0}');

			it('should return result = {height: 0, peers: []}');
		});

		describe('when peers have height < modules.blocks.lastBlock.get().height', () => {
			it('should call library.logger.trace second time with {count: 0}');

			it('should return result = {height: 0, peers: []}');
		});

		describe('when peers have height >= modules.blocks.lastBlock.get().height', () => {
			it(
				'should call library.logger.trace second time with {count: peers.length}'
			);

			it('should call library.logger.trace third time');

			it(
				'should call library.logger.trace third time with "Good peers - accepted"'
			);

			it('should return result containing height of the highest peer');

			describe('given not accepted peers have heights that differs more than 2 than the highest', () => {
				it(
					'should call library.logger.trace third time with {count: accepted.length}'
				);

				it('should call library.logger.debug');

				it('should call library.logger.debug with accepted only');

				it('should return result containing accepted only');
			});

			describe('when peers have heights that differs less than 2 than the highest', () => {
				it(
					'should call library.logger.trace third time with {count: peers.length}'
				);

				it('should call library.logger.debug');

				it('should call library.logger.debug with peers');

				it('should return result containing peers');
			});

			it('should return result containing peers of type Peer');
		});
	});

	describe('syncing', () => {
		it('should return true if __private.syncIntervalId exists');

		it('should return false if __private.syncIntervalId does not exist');
	});

	describe('isLoaded', () => {
		it('should return true if modules exists');

		it('should return false if modules does not exist');
	});

	describe('onPeersReady', () => {
		it('should call library.logger.trace');

		it('should call library.logger.trace with "Peers ready"');

		it('should call library.logger.trace with {module: "loader"}');

		it('should call __private.syncTimer');

		describe('when __private.loaded = true', () => {
			it('should call __private.loadTransactions');

			describe('when __private.loadTransactions fails', () => {
				it('should call library.logger.error');

				it(
					'should call library.logger.error with "Unconfirmed transactions loader"'
				);

				it('should call library.logger.error with error');

				it('should call __private.loadTransactions 4 more times');

				it('should not call __private.loadTransactions 6th time');

				it('should call __private.initialize');
			});

			describe('when __private.loadTransactions succeeds', () => {
				it('should call __private.loadSignatures');

				describe('when __private.loadSignatures fails', () => {
					it('should call library.logger.error');

					it('should call library.logger.error with "Signatures loader"');

					it('should call library.logger.error with error');

					it('should call __private.loadSignatures 4 more times');

					it('should not call __private.loadSignatures 6th time');

					it('should call __private.initialize');
				});
			});
		});

		it('should call library.logger.trace after __private.loaded');

		it(
			'should call library.logger.trace with "Transactions and signatures pulled"'
		);
	});

	describe('onBind', () => {
		describe('modules', () => {
			it('should assign transactions');

			it('should assign blocks');

			it('should assign peers');

			it('should assign transport');

			it('should assign multisignatures');
		});

		it('should assign applicationState');

		it('should call __private.loadBlockChain');
	});

	describe('onBlockchainReady', () => {
		it('should assign __private.loaded = true');
	});

	describe('cleanup', () => {
		it('should assign __private.loaded = false');

		it('should call callback with error = undefined');

		it('should call callback with result = undefined');
	});
});

/* eslint-enable mocha/no-pending-tests */
