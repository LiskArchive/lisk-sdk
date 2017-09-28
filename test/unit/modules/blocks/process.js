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

var forkOneScenarios = [
	{
		'id': '7534227321230411012',
		'version': 0,
		'timestamp': 35566034,
		'height': 4,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746',
		'generatorId': '2581762640681118072L',
		'blockSignature': 'ece34388285d63c030c94c696fa0122a3954c442633eb1ba5fbf71b06ed2d32cff406fe38daa8fdbb79c40a488d5a2cac4926592043d1fab3f03a8d44ddde602',
		'transactions': []
	},
	{
		'id': '2161998821711735087',
		'version': 0,
		'timestamp': 35566034,
		'height': 4,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1',
		'generatorId': '17110047919889272525L',
		'blockSignature': 'b0040270fe25b22aa7f2004f14b94eb987511eb36acc0cacd025692d113d11db61a9d2bab19f79cd8129b81359f32515f6bf43483374de0ca137945cec4c950f',
		'transactions': []
	},
	{
		'id': '13256639310355104827',
		'version': 0,
		'timestamp': 35566015,
		'height': 4,
		'previousBlock': '6524861224470851795',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '031e27beab583e2c94cb3167d128fc1a356c1ae88adfcfaa2334abffa3ae0b4c',
		'generatorId': '11004588490103196952L',
		'blockSignature': '5d01ceb6a85943bbcd763b2a6ac90e0ec51a82b00469314ef193b4396e2be06eb70f1f7296422d4eaa03ad464d00e36dd742b7b7e878a56eb4da9cadc2982d0a',
		'transactions': []
	},
	{
		'id': '10926931574281732446',
		'version': 0,
		'timestamp': 35566044,
		'height': 5,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '03e811dda4f51323ac712cd12299410830d655ddffb104f2c9974d90bf8c583a',
		'generatorId': '11506830473925742632L',
		'blockSignature': '3fac1aed675e35ec7e60878f32d18e39295d37a364be4bfd412d2576fad3d5fd128f1b0e4ba30f7ae90333a5f7c74a226ba1a59f65319f6a77d60252a12f4007',
		'transactions': []
	},
	{
		'id': '2237733427461633785',
		'version': 0,
		'timestamp': 35566044,
		'height': 5,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1',
		'generatorId': '17110047919889272525L',
		'blockSignature': '4a7e8b5d7884a63a4f81dcf8022653003a8e169fb9393e7f408f591a5a86553625bd67e52e151cdc586670d0cc7c949487e1a4b2999413f3608f18e385cb5f09',
		'transactions': []
	},
	{
		'id': '15780158931460205205',
		'version': 0,
		'timestamp': 35566025,
		'height': 5,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1',
		'generatorId': '17110047919889272525L',
		'blockSignature': 'cf903495ecfc5856f86982ad4932621278116b8f78f069be8232777f614619fd77fe2e7f8828c4773f7cd8b1248029c1731615d2cfd1b18228c1d6b2fd0b0b0c',
		'transactions': []
	}
];

var forkThreeScenarios = [
	{
		'id': '11404057301523722164',
		'version': 0,
		'timestamp': 35566035,
		'height': 3,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '03e811dda4f51323ac712cd12299410830d655ddffb104f2c9974d90bf8c583a',
		'generatorId': '11506830473925742632L',
		'blockSignature': '5e1e51601c0303d0be6b5b1278e65dd69337fd214f230e6181130812a6b6f0f70debe4662ee3f82911ecb20d0d5292334126b496713c2d78272155882ae70c04',
		'transactions': []
	},
	{
		'id': '1994488132345507931',
		'version': 0,
		'timestamp': 35566035,
		'height': 3,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
		'generatorId': '2581762640681118072L',
		'blockSignature': '399d31e64ce8cbf985acce3304712a08b1a148829cdaaf19fdec1e5dc70346137bce814fd24584d68c15695122c45a3b1ce60da4174e1b2aea1ffb0d73226d0e',
		'transactions': []
	}
];

var forkFiveScenarios = [
	{
		'id': '7534227321230411012',
		'version': 0,
		'timestamp': 35566034,
		'height': 3,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '01389197bbaf1afb0acd47bbfeabb34aca80fb372a8f694a1c0716b3398db746',
		'generatorId': '2581762640681118072L',
		'blockSignature': 'ece34388285d63c030c94c696fa0122a3954c442633eb1ba5fbf71b06ed2d32cff406fe38daa8fdbb79c40a488d5a2cac4926592043d1fab3f03a8d44ddde602',
		'transactions': []
	},
	{
		'id': '2161998821711735087',
		'version': 0,
		'timestamp': 35566034,
		'height': 3,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1',
		'generatorId': '17110047919889272525L',
		'blockSignature': 'b0040270fe25b22aa7f2004f14b94eb987511eb36acc0cacd025692d113d11db61a9d2bab19f79cd8129b81359f32515f6bf43483374de0ca137945cec4c950f',
		'transactions': []
	},
	{
		'id': '10926931574281732446',
		'version': 0,
		'timestamp': 35566044,
		'height': 3,
		'previousBlock': '6031210250236390844',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '03e811dda4f51323ac712cd12299410830d655ddffb104f2c9974d90bf8c583a',
		'generatorId': '11506830473925742632L',
		'blockSignature': '3fac1aed675e35ec7e60878f32d18e39295d37a364be4bfd412d2576fad3d5fd128f1b0e4ba30f7ae90333a5f7c74a226ba1a59f65319f6a77d60252a12f4007',
		'transactions': []
	},
	{
		'id': '16056852016774003157',
		'version': 0,
		'timestamp': 35566044,
		'height': 4,
		'previousBlock': '5306579532562076080',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '0186d6cbee0c9b1a9783e7202f57fc234b1d98197ada1cc29cfbdf697a636ef1',
		'generatorId': '17110047919889272525L',
		'blockSignature': '6ab68499289da80618f4e4b01f40c90d72c2bb3a6ca1785c44b03507140c7c86a4d580c4f60d0fd58a18ea9e125ca6061c2493b2d4cb9d5f1b6735e927f8d301',
		'transactions': []
	},
	{
		'id': '10809124178179825767',
		'version': 0,
		'timestamp': 35566044,
		'height': 4,
		'previousBlock': '5306579532562076080',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '03e811dda4f51323ac712cd12299410830d655ddffb104f2c9974d90bf8c583a',
		'generatorId': '11506830473925742632L',
		'blockSignature': 'f0ab0aae9d57cc37b00e530d35ab5612a04b8f894c45bed2e1c8efc3d05723b72e2d0313ea8b4129fd58627a38847720c19fb172d68ce2d5e625fd5b0156110e',
		'transactions': []
	},
	{
		'id': '11989800390883044151',
		'version': 0,
		'timestamp': 35566055,
		'height': 4,
		'previousBlock': '5306579532562076080',
		'numberOfTransactions': 0,
		'totalAmount': 0,
		'totalFee': 0,
		'reward': 0,
		'payloadLength': 0,
		'payloadHash': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		'generatorPublicKey': '031e27beab583e2c94cb3167d128fc1a356c1ae88adfcfaa2334abffa3ae0b4c',
		'generatorId': '11004588490103196952L',
		'blockSignature': '15436564bb46222bfe462f92e3a4c1d932ae5b9cbef9b181b2c2652217346acfaa28676f749f39d9af60651ee04bb431e3d64ad6487924e642c988beaf902601',
		'transactions': []
	}
];
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

	function toBlockchain (blocksDataArray, operationType, blockNumber) {
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

			toBlockchain(blocksData, 'received', 0);

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

				toBlockchain(blocksData, 'received', 1);

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

					toBlockchain(blocksData, 'restore', 0);
					toBlockchain(blocksData, 'restore', 1);

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

					toBlockchain(blocksData, 'restore', 0);
					toBlockchain(blocksData, 'restore', 1);
					toBlockchain(blocksData, 'restore', 2);

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

			toBlockchain(blocksData, 'restore', 1);

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
					toBlockchain(forkFiveScenarios, 'previous generator missed round', 2);

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
					toBlockchain(blocksData, 'restore', 1);
					toBlockchain(blocksData, 'restore', 2);

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
					toBlockchain(forkFiveScenarios, 'previous generator missed round', 5);

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
