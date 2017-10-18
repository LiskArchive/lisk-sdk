'use strict';

describe('system', function () {

	describe('constructor', function () {

		describe('library', function () {

			it('should assign build');

			it('should assign lastCommit');

			it('should assign config.version');

			it('should assign config.nethash');

			it('should assign config.nonce');
		});

		it('should assign blockReward');

		it('should assign blockReward with BlockReward instance');

		it('should call callback with error = null');

		it('should call callback with result as a Node instance');
	});

	describe('shared', function () {

		describe('getConstants', function () {

			describe('when loaded = false', function () {

				it('should call callback with error = "Blockchain is loading"');
			});

			describe('when loaded = true', function () {

				it('should call modules.blocks.lastBlock.get');

				it('should call callback with error = null');

				it('should call callback with result containing build = library.build');

				it('should call callback with result containing commit = library.commit');

				it('should call callback with result containing epoch = constants.epochTime');

				it('should call callback with result containing fees = constants.fees');

				it('should call callback with result containing nethash = library.config.nethash');

				it('should call callback with result containing nonce = library.config.nonce');

				it('should call callback with result containing milestone = blockReward.calcMilestone result');

				it('should call callback with result containing reward = blockReward.calcReward result');

				it('should call callback with result containing supply = blockReward.calcSupply result');

				it('should call callback with result containing version = library.config.version');
			});
		});

		describe('getStatus', function () {

			describe('when loaded = false', function () {

				it('should call callback with error = "Blockchain is loading"');
			});

			describe('when loaded = true', function () {

				it('should call callback with error = null');

				it('should call callback with result containing broadhash = modules.system.getBroadhash result');

				it('should call callback with result containing consensus = modules.peers.getConsensus result');

				it('should call callback with result containing height = modules.blocks.lastBlock.get result');

				it('should call callback with result containing syncing = modules.loader.syncing result');

				it('should call modules.loader.getNetwork');

				describe('when modules.loader.getNetwork fails', function () {

					it('should call callback with result containing networkHeight = null');
				});

				describe('when modules.loader.getNetwork succeeds and returns network', function () {

					it('should call callback with result containing networkHeight = network.height');
				});
			});
		});
	});

	describe('onBind', function () {

		describe('modules', function () {

			it('should assign blocks');

			it('should assign loader');

			it('should assign peers');

			it('should assign system');
		});

		it('should assign loaded = true');
	});
});
