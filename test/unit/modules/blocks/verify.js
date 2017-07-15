'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var sinon = require('sinon');

var modulesLoader = require('../../../common/initModule').modulesLoader;
var BlockLogic = require('../../../../logic/block.js');
var exceptions = require('../../../../helpers/exceptions.js');
var crypto = require('crypto');
var BSON = require('bson');

var bson = new BSON();

var previousBlock = {
	blockSignature:'696f78bed4d02faae05224db64e964195c39f715471ebf416b260bc01fa0148f3bddf559127b2725c222b01cededb37c7652293eb1a81affe2acdc570266b501',
	generatorPublicKey:'86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
	height:488,
	id:'11850828211026019525',
	numberOfTransactions:0,
	payloadHash:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	payloadLength:0,
	previousBlock:'8805727971083409014',
	relays:1,
	reward:0,
	timestamp:32578360,
	totalAmount:0,
	totalFee:0,
	transactions: [],
	version:0,
};

var validBlock = {
	blockSignature: '56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
	generatorPublicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
	numberOfTransactions: 2,
	payloadHash: 'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
	payloadLength: 494,
	previousBlock: '11850828211026019525',
	reward: 0,
	timestamp: 32578370,
	totalAmount: 10000000000000000,
	totalFee: 0,
	transactions: [
		{
			'type': 0,
			'amount': 10000000000000000,
			'fee': 0,
			'timestamp': 0,
			'recipientId': '16313739661670634666L',
			'senderId': '1085993630748340485L',
			'senderPublicKey': 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			'signature': 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
			'id': '1465651642158264047'
		},
		{
			'type': 3,
			'amount': 0,
			'fee': 0,
			'timestamp': 0,
			'recipientId': '16313739661670634666L',
			'senderId': '16313739661670634666L',
			'senderPublicKey': 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			'asset': {
				'votes': [
					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					'-5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819'
				]
			},
			'signature': '9f9446b527e93f81d3fb8840b02fcd1454e2b6276d3c19bd724033a01d3121dd2edb0aff61d48fad29091e222249754e8ec541132032aefaeebc312796f69e08',
			'id': '9314232245035524467'
		}
	],
	version: 0,
	id: '884740302254229983'
};

var blockRewardInvalid = {
	blockSignature: 'd06c1a17c701e55aef78cefb8ce17340411d9a1a7b3bd9b6c66f815dfd7546e2ca81b3371646fcead908db57a6492e1d6910eafa0a96060760a2796aff637401',
	generatorPublicKey: '904c294899819cce0283d8d351cb10febfa0e9f0acd90a820ec8eb90a7084c37',
	numberOfTransactions: 2,
	payloadHash: 'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
	payloadLength: 494,
	previousBlock: '11850828211026019525',
	reward: 35,
	timestamp: 32578370,
	totalAmount: 10000000000000000,
	totalFee: 0,
	transactions: [
		{
			'type': 0,
			'amount': 10000000000000000,
			'fee': 0,
			'timestamp': 0,
			'recipientId': '16313739661670634666L',
			'senderId': '1085993630748340485L',
			'senderPublicKey': 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
			'signature': 'd8103d0ea2004c3dea8076a6a22c6db8bae95bc0db819240c77fc5335f32920e91b9f41f58b01fc86dfda11019c9fd1c6c3dcbab0a4e478e3c9186ff6090dc05',
			'id': '1465651642158264047'
		},
		{
			'type': 3,
			'amount': 0,
			'fee': 0,
			'timestamp': 0,
			'recipientId': '16313739661670634666L',
			'senderId': '16313739661670634666L',
			'senderPublicKey': 'c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f',
			'asset': {
				'votes': [
					'+9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
					'+141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
					'-3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
					'-5d28e992b80172f38d3a2f9592cad740fd18d3c2e187745cd5f7badf285ed819'
				]
			},
			'signature': '9f9446b527e93f81d3fb8840b02fcd1454e2b6276d3c19bd724033a01d3121dd2edb0aff61d48fad29091e222249754e8ec541132032aefaeebc312796f69e08',
			'id': '9314232245035524467'
		}
	],
	version: 0,
	id: '15635779876149546284'
};

var validBlockReward1 = {
	blockSignature: 'b626ff71d01ec0ce1f700253f11ea708c6d505e8613f94d42f4e21572d062ce8732169b14c515c201bbc0d21cf57329ea8ffc65608b263f8d54a985af8bb2e09',
	generatorPublicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
	numberOfTransactions: 1,
	payloadHash: '215020db61a29a640397e39a2766fc467f7d12c95e814a5f6b150d562e6088ad',
	payloadLength: 117,
	previousBlock: '6524861224470851795',
	reward: 999,
	timestamp: 32578370,
	totalAmount: 10000000000000000,
	totalFee: 10000000,
	transactions: [
		{
			'type': 0,
			'amount': 10000000000000000,
			'fee': 10000000,
			'timestamp': 33514086,
			'recipientId': '16313739661670634666L',
			'senderId': '2737453412992791987L',
			'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
			'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
			'id': '7249285091378090017'
		}
	],
	version: 0,
	id: '2783858589203451895'
};

var testAccount = {
	account: {
		username: 'test_verify',
		isDelegate: 1,
		address: '2737453412992791987L',
		publicKey: 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		balance: 5300000000000000000,
	},
	secret: 'message crash glance horror pear opera hedgehog monitor connect vague chuckle advice',
};

var userAccount = {
	account: {
		username: 'test_verify_user',
		isDelegate: 0,
		address: '2896019180726908125L',
		publicKey: '684a0259a769a9bdf8b82c5fe3054182ba3e936cf027bb63be231cd25d942adb',
		balance: 0,
	},
	secret: 'joy ethics cruise churn ozone asset quote renew dutch erosion seed pioneer',
};
var previousBlock1 = {
	blockSignature:'696f78bed4d02faae05224db64e964195c39f715471ebf416b260bc01fa0148f3bddf559127b2725c222b01cededb37c7652293eb1a81affe2acdc570266b501',
	generatorPublicKey:'86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
	height:488,
	id:'6524861224470851795',
	numberOfTransactions:0,
	payloadHash:'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	payloadLength:0,
	previousBlock:'8805727971083409014',
	relays:1,
	reward:0,
	timestamp:32578360,
	totalAmount:0,
	totalFee:0,
	transactions: [],
	version:0,
};
var validBlock1;
var transactionsValidBlock1 =	[
	{
		'type': 0,
		'amount': 10000000000000000,
		'fee': 10000000,
		'timestamp': 33514086,
		'recipientId': '16313739661670634666L',
		'senderId': '2737453412992791987L',
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'signature': '57bc34c092189e6520b1fcb5b8a1e911d5aed56910ae75d8bbf6145b780dce539949ba86a0ae8d6a33b3a2a68ce8c16eb39b448b4e53f5ca8b04a0da3b438907',
		'id': '7249285091378090017'
	}
];

var validBlock2;
var transactionsValidBlock2 = [
	{
		'type': 0,
		'amount': 100000000,
		'fee': 10000000,
		'timestamp': 33772862,
		'recipientId': '16313739661670634666L',
		'senderId': '2737453412992791987L',
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'signature': 'd2b2cb8d09169bf9f22ef123361036ae096ad71155fc3afddc7f22d4118b56a949fb82ff12fd6e6a05f411fe7e9e7877f71989959f895a6de94c193fe078f80b',
		'id': '15250193673472372402'
	}
];

var validBlock3;
var transactionsValidBlock3 = [
	{
		'type': 0,
		'amount': 100000000,
		'fee': 10000000,
		'timestamp': 33942637,
		'recipientId': '2896019180726908125L',
		'senderId': '2737453412992791987L',
		'senderPublicKey': 'c76a0e680e83f47cf07c0f46b410f3b97e424171057a0f8f0f420c613da2f7b5',
		'signature': '2e2fb92c17716f2e239148fc990cb712b76639301c945050b621d7568c781f1ad49991b173fff9e7fc8348818ac606d4069cf78ce2b873d86f48da37a4bf5f07',
		'id': '5602023031121962294'
	}
];

function createBlock (blocksModule, blockLogic, secret, timestamp, transactions, previousBlock) {
	var keypair = blockLogic.scope.ed.makeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
	blocksModule.lastBlock.set(previousBlock);
	var newBLock = blockLogic.create({
		keypair: keypair,
		timestamp: timestamp,
		previousBlock: blocksModule.lastBlock.get(),
		transactions: transactions
	});
	newBLock.id = blockLogic.getId(newBLock);
	return newBLock;
}

function deleteBlockProperties (block) {
	// see modules/blocks/verify.js for deleted fields reference.
	delete block.version;
	delete block.numberOfTransactions;
	return;
}

describe('blocks/verify', function () {

	var blocksVerify;
	var blocks;
	var blockLogic;
	var accounts;
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
				{transport: require('../../../../modules/transport')},
				{system: require('../../../../modules/system')},
			], [
				{'block': require('../../../../logic/block')},
				{'transaction': require('../../../../logic/transaction')},
				{'account': require('../../../../logic/account')},
			], {}, function (err, __modules) {
				if (err) {
					return done(err);
				}
				__modules.blocks.verify.onBind(__modules);
				__modules.delegates.onBind(__modules);
				__modules.transactions.onBind(__modules);
				__modules.blocks.chain.onBind(__modules);
				__modules.rounds.onBind(__modules);
				__modules.transport.onBind(__modules);
				blocks = __modules.blocks;
				blocksVerify = __modules.blocks.verify;
				accounts = __modules.accounts;
				done();
			});
		});
	});

	describe('verifyBlock() for valid block', function () {

		it('should verify a valid block', function (done) {
			blocks.lastBlock.set(previousBlock);
			
			blocksVerify.verifyBlock(validBlock, function (err) {
				expect(err).to.be.null;
				done();
			});
		});
		
		it('block with uncommon rewards should pass verification when id in exceptions', function (done) {
			exceptions.blockRewards.push(blockRewardInvalid.id);
			
			blocksVerify.verifyBlock(blockRewardInvalid, function (err) {
				expect(err).to.be.null;
				done();
			});
		});
	});

	describe('verifyBlock() for invalid block', function () {
		
		describe('baseValidations', function () {

			it('block version should fail when version != 0', function (done) {
				var version = validBlock.version;
				validBlock.version = 99;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid block version');
					validBlock.version = version;
					done();
				});
			});

			it('block timestamp should fail when value is less than previous block timestamp', function (done) {
				var timestamp = validBlock.timestamp;
				validBlock.timestamp = 32578350;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid block timestamp');
					validBlock.timestamp  = timestamp;
					done();
				});
			});
			
			it('previous block should fail for missed previousBlock field', function (done) {
				var previousBlock = validBlock.previousBlock;
				delete validBlock.previousBlock;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid previous block');
					validBlock.previousBlock = previousBlock;
					done();
				});
			});

			it('previous block should fail for invalid previousBlock value (fork:1)', function (done) {
				var prevBlock = validBlock.previousBlock;
				validBlock.previousBlock = '10937893559311260102';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal(['Invalid previous block:', validBlock.previousBlock, 'expected:', previousBlock.id].join(' '));
					validBlock.previousBlock = prevBlock;
					done();
				});
			});

			it('payload length should fail when is greater than maxPayloadLength constant value', function (done) {
				var payloadLength = validBlock.payloadLength;
				validBlock.payloadLength = 1024 * 1024 * 2;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Payload length is too high');
					validBlock.payloadLength = payloadLength;
					done();
				});
			});

			it('transactions check should fail when numberOfTransactions is not transactions length', function (done) {
				validBlock.numberOfTransactions = validBlock.transactions.length + 1;
				
				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid number of transactions');
					validBlock.numberOfTransactions = validBlock.transactions.length;
					done();
				});
			});

			it('transactions length should fail when is greater than maxTxsPerBlock constant value', function (done) {
				var transactions = validBlock.transactions;
				validBlock.transactions = new Array(26);
				validBlock.numberOfTransactions = validBlock.transactions.length;
				
				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Transactions length is too high');
					validBlock.transactions = transactions;
					validBlock.numberOfTransactions = transactions.length;
					done();
				});
			});

		});

		describe('advanceValidations', function () {
			// transactions
		
			it('transactions getBytes() should fail for unknown transaction type', function (done) {
				var trsType = validBlock.transactions[0].type;
				validBlock.transactions[0].type = 555;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Unknown transaction type ' + validBlock.transactions[0].type);
					validBlock.transactions[0].type = trsType;
					done();
				});
			});

			it('transactions check should fail for duplicated transaction', function (done) {
				var secodTrs = validBlock.transactions[1];
				validBlock.transactions[1] = validBlock.transactions[0];

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Encountered duplicate transaction: ' + validBlock.transactions[1].id);
					validBlock.transactions[1] = secodTrs;
					done();
				});
			});

			it('payloadHash should fail for invalid payload hash', function (done) {
				var payloadHash = validBlock.payloadHash;
				validBlock.payloadHash = 'invalidpayloadhash';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid payload hash');
					validBlock.payloadHash = payloadHash;
					done();
				});
			});

			it('calculated trs total ammount should fail for invalid block totalAmount', function (done) {
				var totalAmount = validBlock.totalAmount;
				validBlock.totalAmount = 99;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid total amount');
					validBlock.totalAmount = totalAmount;
					done();
				});
			});

			it('calculated trs total fee should fail for invalid block totalFee', function (done) {
				var totalFee = validBlock.totalFee;
				validBlock.totalFee = 99;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid total fee');
					validBlock.totalFee = totalFee;
					done();
				});
			});

			// signature
			it('block signature should fail when blockSignature is no hex', function (done) {
				var blockSignature = validBlock.blockSignature;
				validBlock.blockSignature = 'invalidblocksignature';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('TypeError: Invalid hex string');
					validBlock.blockSignature = blockSignature;
					done();
				});
			});

			it('verify block signature should fail for invalid blockSignature hex', function (done) {
				var blockSignature = validBlock.blockSignature;
				validBlock.blockSignature = 'bfaaabdc8612e177f1337d225a8a5af18cf2534f9e41b66c114850aa50ca2ea2621c4b2d34c4a8b62ea7d043e854c8ae3891113543f84f437e9d3c9cb24c0e05';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Failed to verify block signature');
					validBlock.blockSignature = blockSignature;
					done();
				});
			});

			it('verify block signature should fail when generatorPublicKey is no hex', function (done) {
				var generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey = 'invalidblocksignature';

				var check = blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('TypeError: Invalid hex string');
					validBlock.generatorPublicKey = generatorPublicKey;
					done();
				});
			});		

			it('verify block signature should fail for invalid generatorPublicKey hex', function (done) {
				var generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey = '948b8b509579306694c00db2206ddb1517bfeca2b0dc833ec1c0f81e9644871b';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Failed to verify block signature');
					validBlock.generatorPublicKey = generatorPublicKey;
					done();
				});
			});
		});

		describe('blockIdGeneration and expectedReward', function () {
			// blockIdGeneration
			it('should generate valid block id for not number id value', function (done) {
				var blockId = validBlock.id;
				validBlock.id = 'invalid-block-id';

				blocksVerify.verifyBlock(validBlock, function (err, result) {
					if (err) {
						return done(err);
					}
					expect(validBlock.id).to.equal(blockId);
					done();
				});
			});

			it('should generate valid block id for invalid block id string-number value', function (done) {
				var blockId = validBlock.id;
				validBlock.id = '11850828211026019526';

				blocksVerify.verifyBlock(validBlock, function (err, result) {
					if (err) {
						return done(err);
					}
					expect(validBlock.id).to.equal(blockId);
					done();
				});
			});

			it('should generate valid block id for invalid block id int-number value', function (done) {
				var blockId = validBlock.id;
				validBlock.id = 11850828211026019526;

				blocksVerify.verifyBlock(validBlock, function (err, result) {
					if (err) {
						return done(err);
					}
					expect(validBlock.id).to.equal(blockId);
					done();
				});
			});

			it('should generate valid block id for valid block id int-number value', function (done) {
				var blockId = validBlock.id;
				validBlock.id = 11850828211026019525;

				blocksVerify.verifyBlock(validBlock, function (err, result) {
					if (err) {
						return done(err);
					}
					expect(validBlock.id).to.equal(blockId);
					done();
				});
			});

			// expectedReward
			it('calculate expected reward should fail for invalid block reward', function (done) {

				exceptions.blockRewards.pop();
				blocksVerify.verifyBlock(blockRewardInvalid, function (err) {
					expect(err).to.equal(['Invalid block reward:', blockRewardInvalid.reward, 'expected:', validBlock.reward].join(' '));
					done();
				});
			});
		});

	});
	// Sends a block to network, save it locally.
	describe('processBlock() for valid block {broadcast: true, saveBlock: true}', function () {
		
		it('should generate new account', function (done) {
			accounts.setAccountAndGet(testAccount.account, function (err, newaccount) {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(testAccount.account.address);
				done();
			});
		});

		it('should create a block 1', function (done) {
			var secret = 'famous weapon poverty blast announce observe discover prosper mystery adapt tuna office';
			
			validBlock1 = createBlock(blocks, blockLogic, secret, 32578370, transactionsValidBlock1, previousBlock1);
			expect(validBlock1.version).to.equal(0);
			done();
		});

		it('should processBlock ok', function (done) {

			blocksVerify.processBlock(validBlock1, true, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage[0]).to.equal('newBlock');
				onMessage[1] = bson.deserialize(onMessage[1]);
				expect(onMessage[1].version).to.be.undefined;
				expect(onMessage[1].numberOfTransactions).to.be.undefined;
				expect(onMessage[1].id).to.equal(validBlock1.id);
				expect(onMessage[2]).to.be.true;
				expect(onMessage[3]).to.equal('transactionsSaved');
				expect(onMessage[4][0].id).to.equal(validBlock1.transactions[0].id);
				modulesLoader.scope.bus.clearMessages();
				done();
			}, true);
		});
	});

	describe('processBlock() for invalid block {broadcast: true, saveBlock: true}', function () {
		
		it('process same block again should fail (checkExists)', function (done) {
			blocks.lastBlock.set(previousBlock1);

			blocksVerify.processBlock(validBlock1, true, function (err, result) {
				expect(err).to.equal(['Block', validBlock1.id, 'already exists'].join(' '));
				done();
				modulesLoader.scope.bus.clearMessages();
			}, true);
		});
	});
	
	// Receives a block from network, save it locally.
	describe('processBlock() for invalid block {broadcast: false, saveBlock: true}', function () {
		
		var invalidBlock2;

		it('should generate valid block2', function (done) {
			var secret = 'flip relief play educate address plastic doctor fix must frown oppose segment';
			validBlock2 = createBlock(blocks, blockLogic, secret, 33772862, transactionsValidBlock2, validBlock1);
			expect(validBlock2.version).to.equal(0);
			deleteBlockProperties(validBlock2);

			done();
		});
	
		it('normalizeBlock should fail (block schema: timestamp)', function (done) {
			invalidBlock2 = JSON.parse(JSON.stringify(validBlock2));
			delete invalidBlock2.timestamp;

			blocksVerify.processBlock(invalidBlock2, false, function (err, result) {
				if (err) {
					expect(err).equal('Failed to validate block schema: Missing required property: timestamp');
					done();
				}
			}, true);
		});

		it('normalizeBlock should fail (block schema: transactions)', function (done) {
			invalidBlock2.timestamp = validBlock2.timestamp;
			delete invalidBlock2.transactions;
			deleteBlockProperties(invalidBlock2);

			blocksVerify.processBlock(invalidBlock2, false, function (err, result) {
				if (err) {
					expect(err).equal('Failed to validate block schema: Missing required property: transactions');
					done();
				}
			}, true);
		});

		it('normalizeBlock should fail (transaction schema: type)', function (done) {
			invalidBlock2.transactions = JSON.parse(JSON.stringify(validBlock2.transactions));
			delete invalidBlock2.transactions[0].type;
			deleteBlockProperties(invalidBlock2);

			blocksVerify.processBlock(invalidBlock2, false, function (err, result) {
				if (err) {
					expect(err).equal('Unknown transaction type undefined');
					done();
				}
			}, true);
		});

		it('normalizeBlock should fail (transaction schema: timestamp)', function (done) {
			invalidBlock2.transactions[0].type = validBlock2.transactions[0].type;
			delete invalidBlock2.transactions[0].timestamp;
			deleteBlockProperties(invalidBlock2);

			blocksVerify.processBlock(invalidBlock2, false, function (err, result) {
				if (err) {
					expect(err).equal('Failed to validate transaction schema: Missing required property: timestamp');
					done();
				}
			}, true);
		});

		it('validateBlockSlot should fail (fork: 3)', function (done) {
			invalidBlock2.transactions[0].timestamp = validBlock2.transactions[0].timestamp;
			invalidBlock2.generatorPublicKey = 'invalid-public-key';
			deleteBlockProperties(invalidBlock2);

			blocksVerify.processBlock(invalidBlock2, false, function (err, result) {
				if (err) {
					expect(err).equal('Failed to validate block schema: Object didn\'t pass validation for format publicKey: invalid-public-key');
					done();
				}
			}, true);
		});

		it('checkTransactions should fail (trs in table)', function (done) {
			var secret = 'fortune project stable road outside spoil team quantum journey fall cloud great';
			validBlock2.height = 489;
			var invalidBlock3 = createBlock(blocks, blockLogic, secret, 33772874, transactionsValidBlock1, validBlock2);
			deleteBlockProperties(invalidBlock3);

			blocksVerify.processBlock(invalidBlock3, false, function (err, result) {
				if (err) {
					expect(err).to.equal(['Transaction is already confirmed:', transactionsValidBlock1[0].id].join(' '));
					done();
				}
			}, true);
		});
	});

	describe('processBlock() for valid block {broadcast: false, saveBlock: true}', function () {

		it('should be ok', function (done) {
			blocks.lastBlock.set(validBlock1);

			blocksVerify.processBlock(validBlock2, false, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage[0]).to.equal('transactionsSaved');
				expect(onMessage[1][0].id).to.equal(validBlock2.transactions[0].id);
				modulesLoader.scope.bus.clearMessages();
				done();
			}, true);
		});

		it('process same block again should fail (checkExists)', function (done) {
			blocks.lastBlock.set(validBlock1);
			deleteBlockProperties(validBlock2);

			blocksVerify.processBlock(validBlock2, false, function (err, result) {
				expect(err).to.equal(['Block', validBlock2.id, 'already exists'].join(' '));
				done();
			}, true);
		});
	});

	// Sends a block to network, don't save it locally.
	describe('processBlock() for valid block {broadcast: true, saveBlock: false}', function () {

		it('should generate a new account (user)', function (done) {
			accounts.setAccountAndGet(userAccount.account, function (err, newaccount) {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(userAccount.account.address);
				done();
			});
		});
		it('should generate valid block3', function (done) {
			var secret = 'flavor type stone episode capable usage save sniff notable liar gas someone';
			validBlock3 = createBlock(blocks, blockLogic, secret, 33942637, transactionsValidBlock3, validBlock2);
			expect(validBlock3.version).to.equal(0);
			done();
		});

		it('processBlock() should broadcast block3', function (done) {

			blocksVerify.processBlock(validBlock3, true, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage[0]).to.equal('newBlock');
				onMessage[1] = bson.deserialize(onMessage[1]);
				expect(onMessage[1].version).to.be.undefined;
				expect(onMessage[1].numberOfTransactions).to.be.undefined;
				expect(onMessage[1].id).to.equal(validBlock3.id);
				expect(onMessage[2]).to.be.true;
				expect(onMessage[3]).to.be.undefined; // transactionsSaved
				modulesLoader.scope.bus.clearMessages();
				done();
			}, false);
		});

		it('processBlock() broadcast block3 again should be ok (checkExists)', function (done) {
			blocks.lastBlock.set(validBlock2);
			
			blocksVerify.processBlock(validBlock3, true, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage[0]).to.equal('newBlock');
				onMessage[1] = bson.deserialize(onMessage[1]);
				expect(onMessage[1].version).to.be.undefined;
				expect(onMessage[1].numberOfTransactions).to.be.undefined;
				expect(onMessage[1].id).to.equal(validBlock3.id);
				expect(onMessage[2]).to.be.true;
				expect(onMessage[3]).to.be.undefined; // transactionsSaved
				modulesLoader.scope.bus.clearMessages();
				done();
			}, false);
		});

	});

	// Receives a block from network, don't save it locally.
	describe('processBlock() for valid block {broadcast: false, saveBlock: false}', function () {

		it('processBlock() should receive block3', function (done) {
			blocks.lastBlock.set(validBlock2);
			deleteBlockProperties(validBlock3);

			blocksVerify.processBlock(validBlock3, false, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage).to.be.an('array').that.is.empty;
				done();
			}, false);
		});

		it('processBlock() receive block3 again should be ok (checkExists)', function (done) {
			blocks.lastBlock.set(validBlock2);
			deleteBlockProperties(validBlock3);

			blocksVerify.processBlock(validBlock3, false, function (err, result) {
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage).to.be.an('array').that.is.empty;
				done();
			}, false);
		});
	});
});