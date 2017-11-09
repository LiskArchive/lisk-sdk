'use strict';

describe('loader', function () {

	describe('constructor', function () {

		describe('library', function () {

			it('should assign logger');

			it('should assign db');

			it('should assign network');

			it('should assign schema');

			it('should assign sequence');

			it('should assign bus');

			it('should assign genesisblock');

			it('should assign balancesSequence');

			describe('logic', function () {

				it('should assign logic.transaction');

				it('should assign logic.account');

				it('should assign logic.peers');
			});

			describe('config', function () {

				it('should assign config.loading.verifyOnLoading');

				it('should assign config.loading.snapshot');
			});
		});

		it('should call __private.initialize');

		describe('__private', function () {

			it('should assign genesisBlock');

			it('should assign lastBlock');
		});

		it('should return error = null');

		it('should return Loader instance');
	});


	describe('findGoodPeers', function () {

		it('should call modules.blocks.lastBlock.get');

		it('should call library.logger.trace');

		it('should call library.logger.trace with "Good peers - received"');

		it('should call library.logger.trace with {count: peers.length}}');

		it('should call library.logger.trace second time');

		it('should call library.logger.trace second time with "Good peers - filtered"');

		describe('when peers = []', function () {

			it('should call library.logger.trace second time with {count: 0}');

			it('should return result = {height: 0, peers: []}');
		});

		describe('when peers = [null]', function () {

			it('should call library.logger.trace second time with {count: 0}');

			it('should return result = {height: 0, peers: []}');
		});

		describe('when peers have height < modules.blocks.lastBlock.get().height', function () {

			it('should call library.logger.trace second time with {count: 0}');

			it('should return result = {height: 0, peers: []}');
		});

		describe('when peers have height >= modules.blocks.lastBlock.get().height', function () {

			it('should call library.logger.trace second time with {count: peers.length}');

			it('should call library.logger.trace third time');

			it('should call library.logger.trace third time with "Good peers - accepted"');

			it('should return result containing height of the highest peer');

			describe('given not accepted peers have heights that differs more than 2 than the highest', function () {

				it('should call library.logger.trace third time with {count: accepted.length}');

				it('should call library.logger.debug');

				it('should call library.logger.debug with accepted only');

				it('should return result containing accepted only');
			});

			describe('when peers have heights that differs less than 2 than the highest', function () {

				it('should call library.logger.trace third time with {count: peers.length}');

				it('should call library.logger.debug');

				it('should call library.logger.debug with peers');

				it('should return result containing peers');
			});

			it('should return result containing peers of type Peer');
		});
	});

	describe('getNetwork', function () {

		describe('when __private.network.height > 0 and differs from last block height with 1', function () {

			it('should call callback with error = null');

			it('should call callback with result = __private.network');

			it('should not call modules.peers.list');
		});

		describe('when __private.network.height = 0 or differs from last block height with more than 1', function () {

			it('should call modules.peers.list');

			it('should call modules.peers.list with {normalized: false}');

			describe('when modules.peers.list fails', function () {

				it('should call callback with error');
			});

			describe('when modules.peers.list succeeds', function () {

				it('should call self.findGoodPeers');
				
				it('should assign __private.network');
				
				describe('when __private.network.peers.length = 0', function () {

					it('should call callback with error = "Failed to find enough good peers"');
				});

				describe('when __private.network.peers.length > 0', function () {

					it('should call callback with error = null');

					it('should call callback with result = __private.network');
				});
			});
		});
	});

	describe('syncing', function () {

		it('should return true if __private.syncIntervalId exists');

		it('should return false if __private.syncIntervalId does not exist');
	});

	describe('isLoaded', function () {

		it('should return true if modules exists');

		it('should return false if modules does not exist');
	});

	describe('onPeersReady', function () {

		it('should call library.logger.trace');

		it('should call library.logger.trace with "Peers ready"');

		it('should call library.logger.trace with {module: "loader"}');

		it('should call __private.syncTimer');

		describe('when __private.loaded = true', function () {

			it('should call __private.loadTransactions');

			describe('when __private.loadTransactions fails', function () {

				it('should call library.logger.log');

				it('should call library.logger.log with "Unconfirmed transactions loader"');

				it('should call library.logger.log with error');

				it('should call __private.loadTransactions 4 more times');

				it('should not call __private.loadTransactions 6th time');

				it('should call __private.initialize');
			});

			describe('when __private.loadTransactions succeeds', function () {

				it('should call __private.loadSignatures');

				describe('when __private.loadSignatures fails', function () {

					it('should call library.logger.log');

					it('should call library.logger.log with "Signatures loader"');

					it('should call library.logger.log with error');

					it('should call __private.loadSignatures 4 more times');

					it('should not call __private.loadSignatures 6th time');

					it('should call __private.initialize');
				});
			});
		});

		it('should call library.logger.trace');

		it('should call library.logger.trace with "Transactions and signatures pulled"');
	});

	describe('onBind', function () {

		describe('modules', function () {

			it('should assign transactions');

			it('should assign blocks');

			it('should assign peers');

			it('should assign transport');

			it('should assign multisignatures');

			it('should assign system');
		});

		it('should call __private.loadBlockChain');
	});

	describe('onBlockchainReady', function () {

		it('should assign __private.loaded = true');
	});

	describe('cleanup', function () {

		it('should assign __private.loaded = false');

		it('should call callback with error = undefined');

		it('should call callback with result = undefined');
	});
});
