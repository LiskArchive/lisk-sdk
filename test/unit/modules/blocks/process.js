'use strict';

var expect = require('chai').expect;
var async = require('async');
var sinon  = require('sinon');

var modulesLoader = require('../../../common/initModule').modulesLoader;
var BlockLogic = require('../../../../logic/block.js');
var VoteLogic = require('../../../../logic/vote.js');
var genesisBlock = require('../../../../genesisBlock.json');
var clearDatabaseTable = require('../../../common/globalBefore').clearDatabaseTable;
var constants = require('../../../../helpers/constants.js');
var slots = require('../../../../helpers/slots.js');
var blocksData = require('./processBlocks.json');
var Promise = require('bluebird');

var forkOneScenarios = require('./forks/forkOneScenarios.json');
var forkThreeScenarios = require('./forks/forkThreeScenarios.json');
var forkFiveScenarios = require('./forks/forkFiveScenarios.json');

// Set spies for logger
var debug = sinon.stub(modulesLoader.scope.logger, 'debug');
var info = sinon.stub(modulesLoader.scope.logger, 'info');
var warn = sinon.stub(modulesLoader.scope.logger, 'warn');
var error = sinon.stub(modulesLoader.scope.logger, 'error');

function resetSpiesState () {
	// Reset state of spies
	debug.reset();
	info.reset();
	warn.reset();
	error.reset();
}

function restoreSpiesState () {
	// Restore state of spies
	debug.restore();
	info.restore();
	warn.restore();
	error.restore();
}

describe('blocks/process', function () {

	var blocksProcess;
	var blockLogic;
	var blocks;
	var blocksVerify;
	var accounts;
	var db;
	var rounds;
	// Set delegates to 4
	constants.activeDelegates = 4;
	slots.delegates = 4;

	before(function (done) {
		modulesLoader.initLogic(BlockLogic, modulesLoader.scope, function (err, __blockLogic) {
			if (err) {
				return done(err);
			}
			blockLogic = __blockLogic;

			modulesLoader.initModules([
				{blocks: require('../../../../modules/blocks')},
				{accounts: require('../../../../modules/accounts')},
				{delegates: require('../../../../modules/delegates')},
				{transactions: require('../../../../modules/transactions')},
				{rounds: require('../../../../modules/rounds')},
				{multisignatures: require('../../../../modules/multisignatures')},
        {signatures: require('../../../../modules/signatures')},
        {loader: require('../../../../modules/loader')},
			], [
				{'block': require('../../../../logic/block')},
				{'transaction': require('../../../../logic/transaction')},
				{'account': require('../../../../logic/account')},
				{'peers': require('../../../../logic/peers')},
			], {}, function (err, __modules) {
				if (err) {
					return done(err);
				}
				__modules.blocks.verify.onBind(__modules);
				blocksVerify = __modules.blocks.verify;
				__modules.delegates.onBind(__modules);
				__modules.accounts.onBind(__modules);
				__modules.transactions.onBind(__modules);
				__modules.blocks.chain.onBind(__modules);
				__modules.rounds.onBind(__modules);
				__modules.multisignatures.onBind(__modules);
				__modules.signatures.onBind(__modules);
				__modules.blocks.process.onBind(__modules);
				blocksProcess = __modules.blocks.process;
				blocks = __modules.blocks;
				accounts = __modules.accounts;
				rounds = __modules.rounds;
				db = modulesLoader.scope.db;

				async.series({
					clearTables: function (seriesCb) {
						async.every([
							'blocks where height > 1',
							'trs where "blockId" != \'6524861224470851795\'',
							'mem_accounts where address in (\'2737453412992791987L\', \'2896019180726908125L\')',
							'forks_stat',
							'votes where "transactionId" = \'17502993173215211070\''
						], function (table, seriesCb) {
							clearDatabaseTable(db, modulesLoader.logger, table, seriesCb);
						}, function (err, result) {
							if (err) {
								return setImmediate(err);
							}
							return setImmediate(seriesCb);
						});
					}
				}, function (err) {
					if (err) {
						return done(err);
					}
					done();
				});
 			});
 		});
	});

	afterEach(function () {
		resetSpiesState();
	});

	after(function () {
		restoreSpiesState();
	});

	/* 
	 * Adds a block to blockchain from blocksDataArray, position blockNumber, and logs the	
	 * operation from opeartionType: add, restore.
	 */
	function addBlock (blocksDataArray, operationType, blockNumber) {
		it(['should be ok when', operationType, 'block', blockNumber + 1].join(' '), function (done) {
			if (blockNumber === 0) {
				blocks.lastBlock.set(genesisBlock);
			}
			modulesLoader.scope.sequence.add = function (cb) {

				var fn = Promise.promisify(cb);

				fn().then(function (err, res) {
					expect(err).to.be.undefined;
					expect(res).to.be.undefined;

					if (blocksDataArray[blockNumber].height % slots.delegates !== 0) {
						expect(debug.args[0][0]).to.equal('Block applied correctly with 0 transactions');
						expect(debug.args[1][0]).to.equal('Performing forward tick');
						expect(info.args[0][0]).to.equal([
							'Received new block id:', blocksDataArray[blockNumber].id,
							'height:', blocksDataArray[blockNumber].height,
							'round:',  rounds.calc(blocksDataArray[blockNumber].height),
							'slot:', slots.getSlotNumber(blocksDataArray[blockNumber].timestamp),
							'reward:', blocksDataArray[blockNumber].reward
						].join(' '));
					} else {
						// Round change
						expect(debug.args[0][0]).to.equal('Block applied correctly with 0 transactions');
						expect(debug.args[1][0]).to.equal('Summing round');
						expect(debug.args[1][1]).to.equal(1);
						expect(debug.args[2][0]).to.equal('Performing forward tick');
						expect(info.args[0][0]).to.equal([
							'Received new block id:', blocksDataArray[blockNumber].id,
							'height:', blocksDataArray[blockNumber].height,
							'round:',  rounds.calc(blocksDataArray[blockNumber].height),
							'slot:', slots.getSlotNumber(blocksDataArray[blockNumber].timestamp),
							'reward:', blocksDataArray[blockNumber].reward
						].join(' '));
					}

					done();
				});
			};

			blocksProcess.onReceiveBlock(blocksDataArray[blockNumber]);
		});
	}

	function deleteLastBlock () {

		it('should be ok when deleting last block', function (done) {
			blocks.chain.deleteLastBlock(function (err, cb) {
				if (err) {
					done(err);
				}
				done();
			});
		});
	}

	describe('onReceiveBlock (empty transactions)', function () {

		describe('receiveBlock', function () {

			addBlock(blocksData, 'received', 0);

			describe('validateBlockSlot error - fork 3', function () {

				it('should fail when block generator is not a delegate', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {

						var fn = Promise.Promise.promisify(cb);

						fn().catch(function (err, res) {
							expect(err.message).to.equal('Failed to verify slot: 3556603');
							expect(info.args[0][0]).to.equal([
								'Received new block id:', forkThreeScenarios[0].id,
								'height:', forkThreeScenarios[0].height,
								'round:',  rounds.calc(forkThreeScenarios[0].height),
								'slot:', slots.getSlotNumber(forkThreeScenarios[0].timestamp),
								'reward:', forkThreeScenarios[0].reward
							].join(' '));
							expect(info.args[1][0]).to.equal('Fork');
							expect(info.args[1][1].cause).to.equal(3);
							expect(info.args[1][1].delegate).to.equal(forkThreeScenarios[0].generatorPublicKey);
							expect(info.args[1][1].block.height).to.equal(forkThreeScenarios[0].height);
							expect(info.args[1][1].block.id).to.equal(forkThreeScenarios[0].id);
							expect(info.args[1][1].block.previousBlock).to.equal(forkThreeScenarios[0].previousBlock);
							expect(info.args[1][1].block.timestamp).to.equal(forkThreeScenarios[0].timestamp);
							expect(error.args[0][0]).to.equal('Expected generator: 01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746 Received generator: 03e811dda4f51323ac712cd12299410830d655ddffb104f2c9974d90bf8c583a');
							done();
						});
					};

					blocksProcess.onReceiveBlock(forkThreeScenarios[0]);
				});

				it('should fail when block generator is not the calculated slot delegate', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {

						var fn = Promise.promisify(cb);

						fn().catch(function (err, res) {
							expect(err.message).to.equal('Failed to verify slot: 3556603');
							expect(info.args[0][0]).to.equal([
								'Received new block id:', forkThreeScenarios[1].id,
								'height:', forkThreeScenarios[1].height,
								'round:',  rounds.calc(forkThreeScenarios[1].height),
								'slot:', slots.getSlotNumber(forkThreeScenarios[1].timestamp),
								'reward:', forkThreeScenarios[1].reward
							].join(' '));
							expect(info.args[1][0]).to.equal('Fork');
							expect(info.args[1][1].cause).to.equal(3);
							expect(info.args[1][1].delegate).to.equal(forkThreeScenarios[1].generatorPublicKey);
							expect(info.args[1][1].block.height).to.equal(forkThreeScenarios[1].height);
							expect(info.args[1][1].block.id).to.equal(forkThreeScenarios[1].id);
							expect(info.args[1][1].block.previousBlock).to.equal(forkThreeScenarios[1].previousBlock);
							expect(info.args[1][1].block.timestamp).to.equal(forkThreeScenarios[1].timestamp);
							expect(error.args[0][0]).to.equal('Expected generator: 01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746 Received generator: 684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb');
							done();
						});
					};

					blocksProcess.onReceiveBlock(forkThreeScenarios[1]);
				});
			});
		});

		describe('receiveForkOne', function () {

			describe('timestamp is greather than previous block', function () {

				it('should be ok when last block stands', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {

						var fn = Promise.promisify(cb);

						fn().then(function (err, res) {
							expect(err).to.be.undefined;
							expect(res).to.be.undefined;
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(1);
							expect(info.args[0][1].delegate).to.equal(blocksData[1].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(blocksData[1].height);
							expect(info.args[0][1].block.id).to.equal(blocksData[1].id);
							expect(info.args[0][1].block.previousBlock).to.equal(blocksData[1].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(blocksData[1].timestamp);
							expect(info.args[1][0]).to.equal('Last block stands');
							blocksData[1].previousBlock = previousBlock;
							done();
						});
					};

					var previousBlock = blocksData[1].previousBlock;

					blocksData[1].previousBlock = forkOneScenarios[0].id;
					blocksProcess.onReceiveBlock(blocksData[1]);
				});
			});

			describe('timestamp is lower than previous block', function () {

				addBlock(blocksData, 'received', 1);

				it('should fail when block object normalize', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {

						var fn = Promise.promisify(cb);

						fn().catch(function (err) {
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(1);
							expect(info.args[0][1].delegate).to.equal(forkOneScenarios[0].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(forkOneScenarios[0].height);
							expect(info.args[0][1].block.id).to.equal(forkOneScenarios[0].id);
							expect(info.args[0][1].block.previousBlock).to.equal(forkOneScenarios[0].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(forkOneScenarios[0].timestamp);
							expect(info.args[1][0]).to.equal('Last block and parent loses');
							expect(error.args[0][0]).to.equal('Fork recovery failed');
							expect(error.args[0][1]).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', forkOneScenarios[0].blockSignature].join(' '));
							expect(err.message).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', forkOneScenarios[0].blockSignature].join(' '));
							forkOneScenarios[0].blockSignature = blockSignature;
							done();
						});
					};

					var blockSignature = forkOneScenarios[0].blockSignature;

					forkOneScenarios[0].blockSignature = 'invalid-block-signature';
					blocksProcess.onReceiveBlock(forkOneScenarios[0]);
				});

				it('should fail when block verify receipt', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {

						var fn = Promise.promisify(cb);

						fn().catch(function (err) {
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(1);
							expect(info.args[0][1].delegate).to.equal(forkOneScenarios[0].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(forkOneScenarios[0].height);
							expect(info.args[0][1].block.id).to.equal(forkOneScenarios[0].id);
							expect(info.args[0][1].block.previousBlock).to.equal(forkOneScenarios[0].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(forkOneScenarios[0].timestamp);
							expect(info.args[1][0]).to.equal('Last block and parent loses');
							expect(error.args[0][1]).to.equal('Failed to verify block signature');
							expect(error.args[1][0]).to.equal('Fork recovery failed');
							expect(error.args[1][1]).to.equal('Failed to verify block signature');
							expect(err.message).to.equal('Failed to verify block signature');
							forkOneScenarios[0].blockSignature = blockSignature;
							done();
						});
					};

					var blockSignature = forkOneScenarios[0].blockSignature;

					forkOneScenarios[0].blockSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
					blocksProcess.onReceiveBlock(forkOneScenarios[0]);
				});

				describe('Same round', function () {

					it('should be ok when blocks have same publicKey generator', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().then(function (err, res) {
								expect(err).to.be.undefined;
								expect(res).to.be.undefined;
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(1);
								expect(info.args[0][1].delegate).to.equal(forkOneScenarios[0].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkOneScenarios[0].height);
								expect(info.args[0][1].block.id).to.equal(forkOneScenarios[0].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkOneScenarios[0].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkOneScenarios[0].timestamp);
								expect(info.args[1][0]).to.equal('Last block and parent loses');
								expect(debug.args[0][0]).to.equal('Performing backward tick');
								expect(warn.args[0][0]).to.equal('Deleting last block');
								expect(warn.args[0][1].id).to.equal(blocksData[1].id);
								expect(warn.args[1][0]).to.equal('Deleting last block');
								expect(warn.args[1][1].id).to.equal(blocksData[0].id);
								done();
							});
						};

						blocksProcess.onReceiveBlock(forkOneScenarios[0]);
					});

					addBlock(blocksData, 'restore', 0);
					addBlock(blocksData, 'restore', 1);

					it('should fail when blocks have different publicKey generator and last block generator is invalid', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().catch(function (err) {
								expect(err.message).to.equal('Failed to verify slot: 3556603');
								expect(error.args[0][0]).to.equal('Expected generator: 01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746 Received generator: 0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1');
								expect(error.args[1][0]).to.equal('Fork recovery failed');
								expect(error.args[1][1]).to.equal('Failed to verify slot: 3556603');
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(1);
								expect(info.args[0][1].delegate).to.equal(forkOneScenarios[1].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkOneScenarios[1].height);
								expect(info.args[0][1].block.id).to.equal(forkOneScenarios[1].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkOneScenarios[1].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkOneScenarios[1].timestamp);
								expect(info.args[1][0]).to.equal('Last block and parent loses');
								done();
							});
						};

						blocksProcess.onReceiveBlock(forkOneScenarios[1]);
					});

					it('should be ok when blocks have different publicKey generator and last block generator is valid', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().then(function (err, res) {
								expect(err).to.be.undefined;
								expect(res).to.be.undefined;
								expect(debug.args[0][0]).to.equal('Performing backward tick');
								expect(debug.args[1][0]).to.equal('Performing backward tick');
								expect(warn.args[0][0]).to.equal('Deleting last block');
								expect(warn.args[0][1].id).to.equal(blocksData[1].id);
								expect(warn.args[1][0]).to.equal('Deleting last block');
								expect(warn.args[1][1].id).to.equal(blocksData[0].id);
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(1);
								expect(info.args[0][1].delegate).to.equal(forkOneScenarios[2].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkOneScenarios[2].height);
								expect(info.args[0][1].block.id).to.equal(forkOneScenarios[2].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkOneScenarios[2].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkOneScenarios[2].timestamp);
								expect(info.args[1][0]).to.equal('Last block and parent loses');
								done();
							}).catch(function (err, res) {
								console.log(err,res);
							});
						};

						blocksProcess.onReceiveBlock(forkOneScenarios[2]);
					});
				});

				describe('Round changes', function () {

					addBlock(blocksData, 'restore', 0);
					addBlock(blocksData, 'restore', 1);
					addBlock(blocksData, 'restore', 2);

					it('should fail when block generator not match last block of round generator', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().catch(function (err) {
								expect(err.message).to.equal('Failed to verify slot: 3556604');
								expect(error.args[0][0]).to.equal('Expected generator: 01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746 Received generator: 0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1');
								expect(error.args[1][0]).to.equal('Fork recovery failed');
								expect(error.args[1][1]).to.equal('Failed to verify slot: 3556604');
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(1);
								expect(info.args[0][1].delegate).to.equal(forkOneScenarios[4].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkOneScenarios[4].height);
								expect(info.args[0][1].block.id).to.equal(forkOneScenarios[4].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkOneScenarios[4].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkOneScenarios[4].timestamp);
								expect(info.args[1][0]).to.equal('Last block and parent loses');
								done();
							});
						};

						blocksProcess.onReceiveBlock(forkOneScenarios[4]);
					});

					it('should be ok when block match last block of round generator', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().then(function (err, res) {
								expect(err).to.be.undefined;
								expect(res).to.be.undefined;
								expect(debug.args[0][0]).to.equal('Summing round');
								expect(debug.args[0][1]).to.equal(1);
								expect(debug.args[1][0]).to.equal('Performing backward tick');
								expect(warn.args[0][0]).to.equal('Deleting last block');
								expect(warn.args[0][1].id).to.equal(blocksData[2].id);
								expect(warn.args[1][0]).to.equal('Deleting last block');
								expect(warn.args[1][1].id).to.equal(blocksData[1].id);
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(1);
								expect(info.args[0][1].delegate).to.equal(forkOneScenarios[5].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkOneScenarios[5].height);
								expect(info.args[0][1].block.id).to.equal(forkOneScenarios[5].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkOneScenarios[5].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkOneScenarios[5].timestamp);
								expect(info.args[1][0]).to.equal('Last block and parent loses');
								done();
							});
						};

						blocksProcess.onReceiveBlock(forkOneScenarios[5]);
					});
				});
			});
		});


		describe('receiveForkFive', function () {

			addBlock(blocksData, 'restore', 1);

			describe('timestamp is greather than previous block', function () {

				it('should be ok when last block stands and blocks have same publicKey generator', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {

						var fn = Promise.promisify(cb);

						fn().then(function (err, res) {
							expect(err).to.be.undefined;
							expect(res).to.be.undefined;
							expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
							expect(warn.args[0][1]).to.equal(forkFiveScenarios[0].generatorPublicKey);
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(forkFiveScenarios[0].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(forkFiveScenarios[0].height);
							expect(info.args[0][1].block.id).to.equal(forkFiveScenarios[0].id);
							expect(info.args[0][1].block.previousBlock).to.equal(forkFiveScenarios[0].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(forkFiveScenarios[0].timestamp);
							expect(info.args[1][0]).to.equal('Last block stands');
							forkFiveScenarios[0].timestamp = timestamp;
							done();
						});
					};

					var timestamp = forkFiveScenarios[0].timestamp;

					forkFiveScenarios[0].timestamp = blocksData[1].timestamp + 1;
					blocksProcess.onReceiveBlock(forkFiveScenarios[0]);
				});

				it('should be ok when last block stands and blocks have different publicKey generator', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {

						var fn = Promise.promisify(cb);

						fn().then(function (err, res) {
							expect(err).to.be.undefined;
							expect(res).to.be.undefined;
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(forkFiveScenarios[2].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(forkFiveScenarios[2].height);
							expect(info.args[0][1].block.id).to.equal(forkFiveScenarios[2].id);
							expect(info.args[0][1].block.previousBlock).to.equal(forkFiveScenarios[2].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(forkFiveScenarios[2].timestamp);
							expect(info.args[1][0]).to.equal('Last block stands');
							done();
						});
					};

					blocksProcess.onReceiveBlock(forkFiveScenarios[2]);
				});
			});

			describe('timestamp is lower than previous block', function () {

				it('should fail when block object normalize', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {

						var fn = Promise.promisify(cb);

						fn().catch(function (err) {
							expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
							expect(warn.args[0][1]).to.equal(forkFiveScenarios[0].generatorPublicKey);
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(forkFiveScenarios[0].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(forkFiveScenarios[0].height);
							expect(info.args[0][1].block.id).to.equal(forkFiveScenarios[0].id);
							expect(info.args[0][1].block.previousBlock).to.equal(forkFiveScenarios[0].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(forkFiveScenarios[0].timestamp);
							expect(info.args[1][0]).to.equal('Last block loses');
							expect(error.args[0][0]).to.equal('Fork recovery failed');
							expect(error.args[0][1]).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', forkFiveScenarios[0].blockSignature].join(' '));
							expect(err.message).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', forkFiveScenarios[0].blockSignature].join(' '));
							forkFiveScenarios[0].blockSignature = blockSignature;
							done();
						});
					};

					var blockSignature = forkFiveScenarios[0].blockSignature;

					forkFiveScenarios[0].blockSignature = 'invalid-block-signature';
					blocksProcess.onReceiveBlock(forkFiveScenarios[0]);
				});

				it('should fail when block verify receipt', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {

						var fn = Promise.promisify(cb);

						fn().catch(function (err) {
							expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
							expect(warn.args[0][1]).to.equal(forkFiveScenarios[0].generatorPublicKey);
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(forkFiveScenarios[0].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(forkFiveScenarios[0].height);
							expect(info.args[0][1].block.id).to.equal(forkFiveScenarios[0].id);
							expect(info.args[0][1].block.previousBlock).to.equal(forkFiveScenarios[0].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(forkFiveScenarios[0].timestamp);
							expect(info.args[1][0]).to.equal('Last block loses');
							expect(error.args[0][1]).to.equal('Failed to verify block signature');
							expect(error.args[1][0]).to.equal('Fork recovery failed');
							expect(error.args[1][1]).to.equal('Failed to verify block signature');
							expect(err.message).to.equal('Failed to verify block signature');
							forkFiveScenarios[0].blockSignature = blockSignature;
							done();
						});
					};

					var blockSignature = forkFiveScenarios[0].blockSignature;

					forkFiveScenarios[0].blockSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
					blocksProcess.onReceiveBlock(forkFiveScenarios[0]);
				});

				describe('Same round', function () {

					it('should fail when blocks have different generator and last block generator is invalid', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().catch(function (err) {
								expect(err.message).to.equal('Failed to verify slot: 3556603');
								expect(error.args[0][0]).to.equal('Expected generator: 01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746 Received generator: 0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1');
								expect(error.args[1][0]).to.equal('Fork recovery failed');
								expect(error.args[1][1]).to.equal('Failed to verify slot: 3556603');
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(5);
								expect(info.args[0][1].delegate).to.equal(forkFiveScenarios[1].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkFiveScenarios[1].height);
								expect(info.args[0][1].block.id).to.equal(forkFiveScenarios[1].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkFiveScenarios[1].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkFiveScenarios[1].timestamp);
								expect(info.args[1][0]).to.equal('Last block loses');
								done();
							});
						};

						blocksProcess.onReceiveBlock(forkFiveScenarios[1]);
					});

					it('should be ok when last block loses and blocks have same publicKey generator', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().then(function (err, res) {
								expect(err).to.be.undefined;
								expect(res).to.be.undefined;
								expect(debug.args[0][0]).to.equal('Performing backward tick');
								expect(debug.args[1][0]).to.equal('Block applied correctly with 0 transactions');
								expect(debug.args[2][0]).to.equal('Performing forward tick');
								expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
								expect(warn.args[0][1]).to.equal(forkFiveScenarios[0].generatorPublicKey);
								expect(warn.args[1][0]).to.equal('Deleting last block');
								expect(warn.args[1][1].id).to.equal(blocksData[1].id);
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(5);
								expect(info.args[0][1].delegate).to.equal(forkFiveScenarios[0].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkFiveScenarios[0].height);
								expect(info.args[0][1].block.id).to.equal(forkFiveScenarios[0].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkFiveScenarios[0].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkFiveScenarios[0].timestamp);
								expect(info.args[1][0]).to.equal('Last block loses');
								expect(info.args[2][0]).to.equal([
									'Received new block id:', forkFiveScenarios[0].id,
									'height:', forkFiveScenarios[0].height,
									'round:',  rounds.calc(forkFiveScenarios[0].height),
									'slot:', slots.getSlotNumber(forkFiveScenarios[0].timestamp),
									'reward:', forkFiveScenarios[0].reward
								].join(' '));
								done();
							});
						};

						blocksProcess.onReceiveBlock(forkFiveScenarios[0]);
					});

					deleteLastBlock();
					addBlock(forkFiveScenarios, 'previous generator missed round', 2);

					it('should be ok when last block loses and blocks have different publicKey generator', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().then(function (err, res) {
								expect(err).to.be.undefined;
								expect(res).to.be.undefined;
								expect(debug.args[0][0]).to.equal('Performing backward tick');
								expect(debug.args[1][0]).to.equal('Block applied correctly with 0 transactions');
								expect(debug.args[2][0]).to.equal('Performing forward tick');
								expect(debug.args[3][0]).to.equal('Performing round snapshot...');
								expect(warn.args[0][0]).to.equal('Deleting last block');
								expect(warn.args[0][1].id).to.equal(forkFiveScenarios[2].id);
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(5);
								expect(info.args[0][1].delegate).to.equal(forkFiveScenarios[0].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkFiveScenarios[0].height);
								expect(info.args[0][1].block.id).to.equal(forkFiveScenarios[0].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkFiveScenarios[0].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkFiveScenarios[0].timestamp);
								expect(info.args[1][0]).to.equal('Last block loses');
								expect(info.args[2][0]).to.equal([
									'Received new block id:', forkFiveScenarios[0].id,
									'height:', forkFiveScenarios[0].height,
									'round:',  rounds.calc(forkFiveScenarios[0].height),
									'slot:', slots.getSlotNumber(forkFiveScenarios[0].timestamp),
									'reward:', forkFiveScenarios[0].reward
								].join(' '));
								done();
							});
						};

						blocksProcess.onReceiveBlock(forkFiveScenarios[0]);
					});
				});

				describe('Round changes', function () {

					deleteLastBlock();
					addBlock(blocksData, 'restore', 1);
					addBlock(blocksData, 'restore', 2);

					it('should fail when last block loses and block generator not match last block of round generator', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().catch(function (err) {
								expect(err.message).to.equal('Failed to verify slot: 3556604');
								expect(error.args[0][0]).to.equal('Expected generator: 03e811dda4f51323ac712cd12299410830d655ddffb104f2c9974d90bf8c583a Received generator: 0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1');
								expect(error.args[1][0]).to.equal('Fork recovery failed');
								expect(error.args[1][1]).to.equal('Failed to verify slot: 3556604');
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(5);
								expect(info.args[0][1].delegate).to.equal(forkFiveScenarios[3].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkFiveScenarios[3].height);
								expect(info.args[0][1].block.id).to.equal(forkFiveScenarios[3].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkFiveScenarios[3].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkFiveScenarios[3].timestamp);
								expect(info.args[1][0]).to.equal('Last block loses');
								done();
							});
						};

						blocksProcess.onReceiveBlock(forkFiveScenarios[3]);
					});

					it('should be ok when blocks have same publicKey generator', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().then(function (err, res) {
								expect(err).to.be.undefined;
								expect(res).to.be.undefined;
								expect(debug.args[0][0]).to.equal('Summing round');
								expect(debug.args[0][1]).to.equal(1);
								expect(debug.args[1][0]).to.equal('Performing backward tick');
								expect(debug.args[2][0]).to.equal('Restoring mem_round snapshot...');
								expect(debug.args[3][0]).to.equal('Restoring mem_accounts.vote snapshot...');
								expect(debug.args[4][0]).to.equal('Block applied correctly with 0 transactions');
								expect(debug.args[5][0]).to.equal('Summing round');
								expect(debug.args[5][1]).to.equal(1);
								expect(debug.args[6][0]).to.equal('Performing forward tick');
								expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
								expect(warn.args[0][1]).to.equal(forkFiveScenarios[4].generatorPublicKey);
								expect(warn.args[1][0]).to.equal('Deleting last block');
								expect(warn.args[1][1].id).to.equal(blocksData[2].id);
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(5);
								expect(info.args[0][1].delegate).to.equal(forkFiveScenarios[4].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(forkFiveScenarios[4].height);
								expect(info.args[0][1].block.id).to.equal(forkFiveScenarios[4].id);
								expect(info.args[0][1].block.previousBlock).to.equal(forkFiveScenarios[4].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(forkFiveScenarios[4].timestamp);
								expect(info.args[1][0]).to.equal('Last block loses');
								expect(info.args[2][0]).to.equal([
									'Received new block id:', forkFiveScenarios[4].id,
									'height:', forkFiveScenarios[4].height,
									'round:',  rounds.calc(forkFiveScenarios[4].height),
									'slot:', slots.getSlotNumber(forkFiveScenarios[4].timestamp),
									'reward:', forkFiveScenarios[4].reward
								].join(' '));
								done();
							});
						};

						blocksProcess.onReceiveBlock(forkFiveScenarios[4]);
					});

					deleteLastBlock();
					addBlock(forkFiveScenarios, 'previous generator missed round', 5);

					it('should be ok when last block loses and block match last block of round generator', function (done) {
						modulesLoader.scope.sequence.add = function (cb) {

							var fn = Promise.promisify(cb);

							fn().then(function (err, res) {
								expect(err).to.be.undefined;
								expect(res).to.be.undefined;
								expect(debug.args[0][0]).to.equal('Summing round');
								expect(debug.args[0][1]).to.equal(1);
								expect(debug.args[1][0]).to.equal('Performing backward tick');
								expect(debug.args[2][0]).to.equal('Restoring mem_round snapshot...');
								expect(debug.args[3][0]).to.equal('Restoring mem_accounts.vote snapshot...');
								expect(debug.args[4][0]).to.equal('Block applied correctly with 0 transactions');
								expect(debug.args[5][0]).to.equal('Summing round');
								expect(debug.args[5][1]).to.equal(1);
								expect(debug.args[6][0]).to.equal('Performing forward tick');
								expect(warn.args[0][0]).to.equal('Deleting last block');
								expect(warn.args[0][1].id).to.equal(forkFiveScenarios[5].id);
								expect(info.args[0][0]).to.equal('Fork');
								expect(info.args[0][1].cause).to.equal(5);
								expect(info.args[0][1].delegate).to.equal(blocksData[2].generatorPublicKey);
								expect(info.args[0][1].block.height).to.equal(blocksData[2].height);
								expect(info.args[0][1].block.id).to.equal(blocksData[2].id);
								expect(info.args[0][1].block.previousBlock).to.equal(blocksData[2].previousBlock);
								expect(info.args[0][1].block.timestamp).to.equal(blocksData[2].timestamp);
								expect(info.args[1][0]).to.equal('Last block loses');
								expect(info.args[2][0]).to.equal([
									'Received new block id:', blocksData[2].id,
									'height:', blocksData[2].height,
									'round:',  rounds.calc(blocksData[2].height),
									'slot:', slots.getSlotNumber(blocksData[2].timestamp),
									'reward:', blocksData[2].reward
								].join(' '));
								done();
							});
						};

						blocksProcess.onReceiveBlock(blocksData[2]);
					});
				});
			});
		});

		describe('skipped blocks', function () {

			it('should fail when block already processed', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {

					var fn = Promise.promisify(cb);

					fn().then(function (err, res) {
						expect(err).to.be.undefined;
						expect(res).to.be.undefined;
						expect(debug.args[0][0]).to.equal('Block already processed');
						expect(debug.args[0][1]).to.equal(blocksData[2].id);
						done();
					});
				};

				blocksProcess.onReceiveBlock(blocksData[2]);
			});

			it('should fail when discarded block', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {

					var fn = Promise.promisify(cb);

					fn().then(function (err, res) {
						expect(err).to.be.undefined;
						expect(res).to.be.undefined;
						expect(warn.args[0][0]).to.equal([
							'Discarded block that does not match with current chain:', forkOneScenarios[0].id,
							'height:', forkOneScenarios[0].height,
							'round:',  rounds.calc(forkOneScenarios[0].height),
							'slot:', slots.getSlotNumber(forkOneScenarios[0].timestamp),
							'generator:', forkOneScenarios[0].generatorPublicKey
						].join(' '));
						done();
					});
				};

				blocksProcess.onReceiveBlock(forkOneScenarios[0]);
			});
		});
	});
});
