'use strict';

var expect = require('chai').expect;
var async = require('async');
var sinon  = require('sinon');

var modulesLoader = require('../../../common/initModule').modulesLoader;
var BlockLogic = require('../../../../logic/block.js');
var VoteLogic = require('../../../../logic/vote.js');
var genesisBlock = require('../../../../genesisBlock.json');
var clearDatabaseTable = require('../../../common/globalBefore').clearDatabaseTable;
var slots = require('../../../../helpers/slots.js');
var blocksData = require('./processBlocks.json');
var promisify = require('promisify-any');

var testAccount = [{
	account: {
		username: 'test_process_1',
		isDelegate: 1,
		address: '2737453412992791987L',
		publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		balance: 5300000000000000,
	},
	secret: 'message crash glance horror pear opera hedgehog monitor connect vague chuckle advice',
},{
	account: {
		username: 'test_process_2',
		isDelegate: 0,
		address: '2896019180726908125L',
		publicKey: '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
		balance: 3500000000000000,
	},
	secret: 'joy ethics cruise churn ozone asset quote renew dutch erosion seed pioneer',
}];

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

        //done();
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

	describe('onReceiveBlock (empty transactions)', function () {

		describe('no forks', function () {
			
			it('should be ok when generate account 1', function (done) {
				accounts.setAccountAndGet(testAccount[0].account, function (err, newaccount) {
					if (err) {
						return done(err);
					}
					expect(newaccount.address).to.equal(testAccount[0].account.address);
					done();
				});
			});
			
			it('should be ok when generate account 2', function (done) {
				accounts.setAccountAndGet(testAccount[1].account, function (err, newaccount) {
					if (err) {
						return done(err);
					}
					expect(newaccount.address).to.equal(testAccount[1].account.address);
					done();
				});
			});
	
			it('should be ok when received block', function (done) {
				blocks.lastBlock.set(genesisBlock);
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
					fn().then(function (err, res) {
						expect(err).to.be.undefined;
						expect(res).to.be.undefined;
						expect(debug.args[0][0]).to.equal('Block applied correctly with 0 transactions');
						expect(debug.args[1][0]).to.equal('Performing forward tick');
						expect(info.args[0][0]).to.equal([
							'Received new block id:', blocksData[0].id,
							'height:', blocksData[0].height,
							'round:',  rounds.calc(blocksData[0].height),
							'slot:', slots.getSlotNumber(blocksData[0].timestamp),
							'reward:', blocksData[0].reward
						].join(' '));
						done();
					});
				};
				blocksProcess.onReceiveBlock(blocksData[0]);
			});
	
			it('should fail when block already processed', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
					fn().then(function (err, res) {
						expect(err).to.be.undefined;
						expect(res).to.be.undefined;
						expect(debug.args[0][0]).to.equal('Block already processed');
						expect(debug.args[0][1]).to.equal(blocksData[0].id);
						done();
					});
				};
				blocksProcess.onReceiveBlock(blocksData[0]);
			});
	
			it('should fail when discarded block', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
					fn().then(function (err, res) {
						expect(err).to.be.undefined;
						expect(res).to.be.undefined;
						expect(warn.args[0][0]).to.equal([
							'Discarded block that does not match with current chain:', blocksData[2].id,
							'height:', blocksData[2].height,
							'round:',  rounds.calc(blocksData[2].height),
							'slot:', slots.getSlotNumber(blocksData[2].timestamp),
							'generator:', blocksData[2].generatorPublicKey
						].join(' '));
						done();
					});
				};
				blocksProcess.onReceiveBlock(blocksData[2]);
			});
		});
		
		describe('fork 3', function () {

			it('should fail when block generator is not a delegate', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
					fn().then(function (err, res) {
						expect(info.args[0][0]).to.equal('Fork');
						expect(info.args[0][1].cause).to.equal(3);
						expect(info.args[0][1].delegate).to.equal(blocksData[6].generatorPublicKey);
						expect(info.args[0][1].block.height).to.equal(blocksData[6].height);
						expect(info.args[0][1].block.id).to.equal(blocksData[6].id);
						expect(info.args[0][1].block.previousBlock).to.equal(blocksData[6].previousBlock);
						expect(info.args[0][1].block.timestamp).to.equal(blocksData[6].timestamp);
						expect(error.args[0][0]).to.equal('Expected generator: a796e9c0516a40ccd0eee7a32fdc2dc297fee40a9c76fef9c1bb0cf41ae69750 Received generator: 684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb');
						done();
					});
				};
				blocksProcess.onReceiveBlock(blocksData[6]);
			});

			it('should fail when block generator is not the calculated slot delegate', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
					fn().then(function (err, res) {
						expect(info.args[0][0]).to.equal('Fork');
						expect(info.args[0][1].cause).to.equal(3);
						expect(info.args[0][1].delegate).to.equal(blocksData[7].generatorPublicKey);
						expect(info.args[0][1].block.height).to.equal(blocksData[7].height);
						expect(info.args[0][1].block.id).to.equal(blocksData[7].id);
						expect(info.args[0][1].block.previousBlock).to.equal(blocksData[7].previousBlock);
						expect(info.args[0][1].block.timestamp).to.equal(blocksData[7].timestamp);
						expect(error.args[0][0]).to.equal('Expected generator: a796e9c0516a40ccd0eee7a32fdc2dc297fee40a9c76fef9c1bb0cf41ae69750 Received generator: 47b9b07df72d38c19867c6a8c12429e6b8e4d2be48b27cd407da590c7a2af0dc');
						done();
					});
				};
				blocksProcess.onReceiveBlock(blocksData[7]);
			});
		});

		describe('receiveForkOne', function () {
	
			it('should be ok when last block stands', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
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
				blocksData[1].previousBlock = blocksData[2].id;
				blocksProcess.onReceiveBlock(blocksData[1]);
			});
	
			it('should be ok when received block', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
					fn().then(function (err, res) {
						expect(err).to.be.undefined;
						expect(res).to.be.undefined;
						expect(debug.args[0][0]).to.equal('Block applied correctly with 0 transactions');
						expect(debug.args[1][0]).to.equal('Performing forward tick');
						expect(info.args[0][0]).to.equal([
							'Received new block id:', blocksData[1].id,
							'height:', blocksData[1].height,
							'round:',  rounds.calc(blocksData[1].height),
							'slot:', slots.getSlotNumber(blocksData[1].timestamp),
							'reward:', blocksData[1].reward
						].join(' '));
						done();
					});
				};
				blocksProcess.onReceiveBlock(blocksData[1]);
			});
	
			it('should fail when block object normalize', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
					fn().catch(function (err) {
						expect(info.args[0][0]).to.equal('Fork');
						expect(info.args[0][1].cause).to.equal(1);
						expect(info.args[0][1].delegate).to.equal(blocksData[2].generatorPublicKey);
						expect(info.args[0][1].block.height).to.equal(blocksData[2].height);
						expect(info.args[0][1].block.id).to.equal(blocksData[2].id);
						expect(info.args[0][1].block.previousBlock).to.equal(blocksData[2].previousBlock);
						expect(info.args[0][1].block.timestamp).to.equal(blocksData[2].timestamp);
						expect(info.args[1][0]).to.equal('Last block and parent loses');
						expect(error.args[0][0]).to.equal('Fork recovery failed');
						expect(error.args[0][1]).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', blocksData[2].blockSignature].join(' '));
						expect(err.message).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', blocksData[2].blockSignature].join(' '));
						blocksData[2].blockSignature = blockSignature;
						done();
					});
				};
				var blockSignature = blocksData[2].blockSignature;
				blocksData[2].blockSignature = 'invalid-block-signature';
				blocksProcess.onReceiveBlock(blocksData[2]);
			});
	
			it('should fail when block verify receipt', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
					fn().catch(function (err) {
						expect(info.args[0][0]).to.equal('Fork');
						expect(info.args[0][1].cause).to.equal(1);
						expect(info.args[0][1].delegate).to.equal(blocksData[2].generatorPublicKey);
						expect(info.args[0][1].block.height).to.equal(blocksData[2].height);
						expect(info.args[0][1].block.id).to.equal(blocksData[2].id);
						expect(info.args[0][1].block.previousBlock).to.equal(blocksData[2].previousBlock);
						expect(info.args[0][1].block.timestamp).to.equal(blocksData[2].timestamp);
						expect(info.args[1][0]).to.equal('Last block and parent loses');
						expect(error.args[0][1]).to.equal('Failed to verify block signature');
						expect(error.args[1][0]).to.equal('Fork recovery failed');
						expect(error.args[1][1]).to.equal('Failed to verify block signature');
						expect(err.message).to.equal('Failed to verify block signature');
						blocksData[2].blockSignature = blockSignature;
						done();
					});
				};
				var blockSignature = blocksData[2].blockSignature;
				blocksData[2].blockSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
				blocksProcess.onReceiveBlock(blocksData[2]);
			});
	
			it('should be ok when last block and parent loses', function (done) {
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
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
						expect(info.args[0][1].delegate).to.equal(blocksData[2].generatorPublicKey);
						expect(info.args[0][1].block.height).to.equal(blocksData[2].height);
						expect(info.args[0][1].block.id).to.equal(blocksData[2].id);
						expect(info.args[0][1].block.previousBlock).to.equal(blocksData[2].previousBlock);
						expect(info.args[0][1].block.timestamp).to.equal(blocksData[2].timestamp);
						expect(info.args[1][0]).to.equal('Last block and parent loses');
						done();
					});
				};
				blocksProcess.onReceiveBlock(blocksData[2]);
			});
		});
	
		describe('receiveForkFive', function () {
	
			it('should be ok when received block', function (done) {
				blocks.lastBlock.set(genesisBlock);
				modulesLoader.scope.sequence.add = function (cb) {
					var fn = promisify(cb);
					fn().then(function (err, res) {
						expect(err).to.be.undefined;
						expect(res).to.be.undefined;
						expect(debug.args[0][0]).to.equal('Block applied correctly with 0 transactions');
						expect(debug.args[1][0]).to.equal('Performing forward tick');
						expect(info.args[0][0]).to.equal([
							'Received new block id:', blocksData[3].id,
							'height:', blocksData[3].height,
							'round:',  rounds.calc(blocksData[3].height),
							'slot:', slots.getSlotNumber(blocksData[3].timestamp),
							'reward:', blocksData[3].reward
						].join(' '));
						done();
					});
				};
				blocksProcess.onReceiveBlock(blocksData[3]);
			});
	
			describe('Delegate forging on multiple nodes', function () {
	
				it('should be ok when last block stands', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {
						var fn = promisify(cb);
						fn().then(function (err, res) {
							expect(err).to.be.undefined;
							expect(res).to.be.undefined;
							expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
							expect(warn.args[0][1]).to.equal(blocksData[4].generatorPublicKey);
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(blocksData[4].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(blocksData[4].height);
							expect(info.args[0][1].block.id).to.equal(blocksData[4].id);
							expect(info.args[0][1].block.previousBlock).to.equal(blocksData[4].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(blocksData[4].timestamp);
							expect(info.args[1][0]).to.equal('Last block stands');
							done();
						});
					};
					blocksProcess.onReceiveBlock(blocksData[4]);
				});
	
				it('should fail when block object normalize', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {
						var fn = promisify(cb);
						fn().catch(function (err) {
							expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
							expect(warn.args[0][1]).to.equal(blocksData[5].generatorPublicKey);
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(blocksData[5].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(blocksData[5].height);
							expect(info.args[0][1].block.id).to.equal(blocksData[5].id);
							expect(info.args[0][1].block.previousBlock).to.equal(blocksData[5].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(blocksData[5].timestamp);
							expect(info.args[1][0]).to.equal('Last block loses');
							expect(error.args[0][0]).to.equal('Fork recovery failed');
							expect(error.args[0][1]).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', blocksData[5].blockSignature].join(' '));
							expect(err.message).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', blocksData[5].blockSignature].join(' '));
							blocksData[5].blockSignature = blockSignature;
							done();
						});
					};
					var blockSignature = blocksData[5].blockSignature;
					blocksData[5].blockSignature = 'invalid-block-signature';
					blocksProcess.onReceiveBlock(blocksData[5]);
				});
		
				it('should fail when block verify receipt', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {
						var fn = promisify(cb);
						fn().catch(function (err) {
							expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
							expect(warn.args[0][1]).to.equal(blocksData[5].generatorPublicKey);
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(blocksData[5].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(blocksData[5].height);
							expect(info.args[0][1].block.id).to.equal(blocksData[5].id);
							expect(info.args[0][1].block.previousBlock).to.equal(blocksData[5].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(blocksData[5].timestamp);
							expect(info.args[1][0]).to.equal('Last block loses');
							expect(error.args[0][1]).to.equal('Failed to verify block signature');
							expect(error.args[1][0]).to.equal('Fork recovery failed');
							expect(error.args[1][1]).to.equal('Failed to verify block signature');
							expect(err.message).to.equal('Failed to verify block signature');
							blocksData[5].blockSignature = blockSignature;
							done();
						});
					};
					var blockSignature = blocksData[5].blockSignature;
					blocksData[5].blockSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
					blocksProcess.onReceiveBlock(blocksData[5]);
				});
				
				it('should be ok when last block loses', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {
						var fn = promisify(cb);
						fn().then(function (err, res) {
							expect(err).to.be.undefined;
							expect(res).to.be.undefined;
							expect(debug.args[0][0]).to.equal('Performing backward tick');
							expect(debug.args[1][0]).to.equal('Block applied correctly with 0 transactions');
							expect(debug.args[2][0]).to.equal('Performing forward tick');
							expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
							expect(warn.args[0][1]).to.equal(blocksData[5].generatorPublicKey);
							expect(warn.args[1][0]).to.equal('Deleting last block');
							expect(warn.args[1][1].id).to.equal(blocksData[3].id);
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(blocksData[5].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(blocksData[5].height);
							expect(info.args[0][1].block.id).to.equal(blocksData[5].id);
							expect(info.args[0][1].block.previousBlock).to.equal(blocksData[5].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(blocksData[5].timestamp);
							expect(info.args[1][0]).to.equal('Last block loses');
							expect(info.args[2][0]).to.equal([
								'Received new block id:', blocksData[5].id,
								'height:', blocksData[5].height,
								'round:',  rounds.calc(blocksData[5].height),
								'slot:', slots.getSlotNumber(blocksData[5].timestamp),
								'reward:', blocksData[5].reward
							].join(' '));
							done();
						});
					};
					blocksProcess.onReceiveBlock(blocksData[5]);
				});
			});
	
			describe('Delegate not forging on multiple nodes', function () {
	
				it('should be ok when last block stands', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {
						var fn = promisify(cb);
						fn().then(function (err, res) {
							expect(err).to.be.undefined;
							expect(res).to.be.undefined;
							expect(warn.args[0][0]).to.equal('Delegate forging on multiple nodes');
							expect(warn.args[0][1]).to.equal(blocksData[4].generatorPublicKey);
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(blocksData[4].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(blocksData[4].height);
							expect(info.args[0][1].block.id).to.equal(blocksData[4].id);
							expect(info.args[0][1].block.previousBlock).to.equal(blocksData[4].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(blocksData[4].timestamp);
							expect(info.args[1][0]).to.equal('Last block stands');
							done();
						});
					};
					blocksProcess.onReceiveBlock(blocksData[4]);
				});
	
				it('should fail when block object normalize', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {
						var fn = promisify(cb);
						fn().catch(function (err, res) {
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(blocksData[0].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(blocksData[0].height);
							expect(info.args[0][1].block.id).to.equal(blocksData[0].id);
							expect(info.args[0][1].block.previousBlock).to.equal(blocksData[0].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(blocksData[0].timestamp);
							expect(info.args[1][0]).to.equal('Last block loses');
							expect(error.args[0][0]).to.equal('Fork recovery failed');
							expect(error.args[0][1]).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', blocksData[0].blockSignature].join(' '));
							expect(err.message).to.equal(['Failed to validate block schema: Object didn\'t pass validation for format signature:', blocksData[0].blockSignature].join(' '));
							blocksData[0].blockSignature = blockSignature;
							done();
						});
					};
					var blockSignature = blocksData[0].blockSignature;
					blocksData[0].blockSignature = 'invalid-block-signature';
					blocksProcess.onReceiveBlock(blocksData[0]);
				});
		
				it('should fail when block verify receipt', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {
						var fn = promisify(cb);
						fn().catch(function (err) {
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(blocksData[0].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(blocksData[0].height);
							expect(info.args[0][1].block.id).to.equal(blocksData[0].id);
							expect(info.args[0][1].block.previousBlock).to.equal(blocksData[0].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(blocksData[0].timestamp);
							expect(info.args[1][0]).to.equal('Last block loses');
							expect(error.args[0][1]).to.equal('Failed to verify block signature');
							expect(error.args[1][0]).to.equal('Fork recovery failed');
							expect(error.args[1][1]).to.equal('Failed to verify block signature');
							expect(err.message).to.equal('Failed to verify block signature');
							blocksData[0].blockSignature = blockSignature;
							done();
						});
					};
					var blockSignature = blocksData[0].blockSignature;
					blocksData[0].blockSignature = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
					blocksProcess.onReceiveBlock(blocksData[0]);
				});
	
				it('should be ok when last block loses', function (done) {
					modulesLoader.scope.sequence.add = function (cb) {
						var fn = promisify(cb);
						fn().then(function (err, res) {
							expect(err).to.be.undefined;
							expect(res).to.be.undefined;
							expect(debug.args[0][0]).to.equal('Performing backward tick');
							expect(debug.args[1][0]).to.equal('Block applied correctly with 0 transactions');
							expect(debug.args[2][0]).to.equal('Performing forward tick');
							expect(warn.args[0][0]).to.equal('Deleting last block');
							expect(warn.args[0][1].id).to.equal(blocksData[5].id);
							expect(info.args[0][0]).to.equal('Fork');
							expect(info.args[0][1].cause).to.equal(5);
							expect(info.args[0][1].delegate).to.equal(blocksData[0].generatorPublicKey);
							expect(info.args[0][1].block.height).to.equal(blocksData[0].height);
							expect(info.args[0][1].block.id).to.equal(blocksData[0].id);
							expect(info.args[0][1].block.previousBlock).to.equal(blocksData[0].previousBlock);
							expect(info.args[0][1].block.timestamp).to.equal(blocksData[0].timestamp);
							expect(info.args[1][0]).to.equal('Last block loses');
							expect(info.args[2][0]).to.equal([
								'Received new block id:', blocksData[0].id,
								'height:', blocksData[0].height,
								'round:',  rounds.calc(blocksData[0].height),
								'slot:', slots.getSlotNumber(blocksData[0].timestamp),
								'reward:', blocksData[0].reward
							].join(' '));
							done();
						});
					};
					blocksProcess.onReceiveBlock(blocksData[0]);
				});
			});
		});
	});
});
