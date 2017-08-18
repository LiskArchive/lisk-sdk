'use strict';

var expect = require('chai').expect;
var async = require('async');

var modulesLoader = require('../../../common/initModule').modulesLoader;
var BlockLogic = require('../../../../logic/block.js');
var exceptions = require('../../../../helpers/exceptions.js');
var clearDatabaseTable = require('../../../common/globalBefore').clearDatabaseTable;

var crypto = require('crypto');
var bson = require('../../../../helpers/bson.js');

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
var block1;
var transactionsBlock1 = [
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

var block2;
var transactionsBlock2 = [
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

var block3;

function createBlock (blocksModule, blockLogic, secret, timestamp, transactions, previousBlock) {
	var keypair = blockLogic.scope.ed.makeKeypair(crypto.createHash('sha256').update(secret, 'utf8').digest());
	blocksModule.lastBlock.set(previousBlock);
	var newBlock = blockLogic.create({
		keypair: keypair,
		timestamp: timestamp,
		previousBlock: blocksModule.lastBlock.get(),
		transactions: transactions
	});
	//newBlock.id = blockLogic.getId(newBlock);
	return newBlock;
}

describe('blocks/verify', function () {

	var blocksVerify;
	var blocks;
	var blockLogic;
	var accounts;
	var delegates;

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
				__modules.transport.onBind(__modules);
				blocks = __modules.blocks;
				blocksVerify = __modules.blocks.verify;
				accounts = __modules.accounts;
				delegates = __modules.delegates;

				done();
			});
		});
	});

	describe('verifyBlock() for valid block', function () {

		it('should be ok', function (done) {
			blocks.lastBlock.set(previousBlock);
			
			blocksVerify.verifyBlock(validBlock, function (err) {
				expect(err).to.be.null;
				done();
			});
		});
		
		it('should be ok when block is invalid but block id is excepted for having invalid block reward', function (done) {
			exceptions.blockRewards.push(blockRewardInvalid.id);
			
			blocksVerify.verifyBlock(blockRewardInvalid, function (err) {
				expect(err).to.be.null;
				done();
			});
		});
	});

	describe('verifyBlock() for invalid block', function () {
		
		describe('base validations', function () {

			it('should fail when block version != 0', function (done) {
				var version = validBlock.version;
				validBlock.version = 99;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid block version');
					validBlock.version = version;
					done();
				});
			});

			it('should fail when block timestamp is less than previous block timestamp', function (done) {
				var timestamp = validBlock.timestamp;
				validBlock.timestamp = 32578350;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid block timestamp');
					validBlock.timestamp  = timestamp;
					done();
				});
			});
			
			it('should fail when previousBlock property is missing', function (done) {
				var previousBlock = validBlock.previousBlock;
				delete validBlock.previousBlock;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid previous block');
					validBlock.previousBlock = previousBlock;
					done();
				});
			});

			it('should fail when previousBlock value is invalid (fork:1)', function (done) {
				var prevBlock = validBlock.previousBlock;
				validBlock.previousBlock = '10937893559311260102';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal(['Invalid previous block:', validBlock.previousBlock, 'expected:', previousBlock.id].join(' '));
					validBlock.previousBlock = prevBlock;
					done();
				});
			});

			it('should fail when payload length greater than maxPayloadLength constant value', function (done) {
				var payloadLength = validBlock.payloadLength;
				validBlock.payloadLength = 1024 * 1024 * 2;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Payload length is too long');
					validBlock.payloadLength = payloadLength;
					done();
				});
			});

			it('should fail when transactions length is not equal to numberOfTransactions property', function (done) {
				validBlock.numberOfTransactions = validBlock.transactions.length + 1;
				
				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Included transactions do not match block transactions count');
					validBlock.numberOfTransactions = validBlock.transactions.length;
					done();
				});
			});

			it('should fail when transactions length greater than maxTxsPerBlock constant value', function (done) {
				var transactions = validBlock.transactions;
				validBlock.transactions = new Array(26);
				validBlock.numberOfTransactions = validBlock.transactions.length;
				
				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Number of transactions exceeds maximum per block');
					validBlock.transactions = transactions;
					validBlock.numberOfTransactions = transactions.length;
					done();
				});
			});
		});

		describe('transaction validations', function () {

			it('should fail when a transaction is of an unknown type', function (done) {
				var trsType = validBlock.transactions[0].type;
				validBlock.transactions[0].type = 555;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Unknown transaction type ' + validBlock.transactions[0].type);
					validBlock.transactions[0].type = trsType;
					done();
				});
			});

			it('should fail when a transaction is duplicated', function (done) {
				var secondTrs = validBlock.transactions[1];
				validBlock.transactions[1] = validBlock.transactions[0];

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Encountered duplicate transaction: ' + validBlock.transactions[1].id);
					validBlock.transactions[1] = secondTrs;
					done();
				});
			});

			it('should fail when payload hash is invalid', function (done) {
				var payloadHash = validBlock.payloadHash;
				validBlock.payloadHash = 'invalidpayloadhash';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid payload hash');
					validBlock.payloadHash = payloadHash;
					done();
				});
			});

			it('should fail when summed transaction amounts do not match totalAmount property', function (done) {
				var totalAmount = validBlock.totalAmount;
				validBlock.totalAmount = 99;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid total amount');
					validBlock.totalAmount = totalAmount;
					done();
				});
			});

			it('should fail when summed transaction fees do not match totalFee property', function (done) {
				var totalFee = validBlock.totalFee;
				validBlock.totalFee = 99;

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Invalid total fee');
					validBlock.totalFee = totalFee;
					done();
				});
			});
		});

		describe('signature validations', function () {

			it('should fail when blockSignature property is not a hex string', function (done) {
				var blockSignature = validBlock.blockSignature;
				validBlock.blockSignature = 'invalidblocksignature';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('TypeError: Invalid hex string');
					validBlock.blockSignature = blockSignature;
					done();
				});
			});

			it('should fail when blockSignature property is an invalid hex string', function (done) {
				var blockSignature = validBlock.blockSignature;
				validBlock.blockSignature = 'bfaaabdc8612e177f1337d225a8a5af18cf2534f9e41b66c114850aa50ca2ea2621c4b2d34c4a8b62ea7d043e854c8ae3891113543f84f437e9d3c9cb24c0e05';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Failed to verify block signature');
					validBlock.blockSignature = blockSignature;
					done();
				});
			});

			it('should fail when generatorPublicKey property is not a hex string', function (done) {
				var generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey = 'invalidblocksignature';

				var check = blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('TypeError: Invalid hex string');
					validBlock.generatorPublicKey = generatorPublicKey;
					done();
				});
			});		

			it('should fail when generatorPublicKey property is an invalid hex string', function (done) {
				var generatorPublicKey = validBlock.generatorPublicKey;
				validBlock.generatorPublicKey = '948b8b509579306694c00db2206ddb1517bfeca2b0dc833ec1c0f81e9644871b';

				blocksVerify.verifyBlock(validBlock, function (err) {
					expect(err).to.equal('Failed to verify block signature');
					validBlock.generatorPublicKey = generatorPublicKey;
					done();
				});
			});
		});
		
		describe('setBlockId validations', function () {

			it('should reset block id when block id is an invalid alpha-numeric string value', function (done) {
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

			it('should reset block id when block id is an invalid numeric string value', function (done) {
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

			it('should reset block id when block id is an invalid integer value', function (done) {
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

			it('should reset block id when block id is a valid integer value', function (done) {
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
		});

		describe('blockReward validations', function () {

			it('should fail when block reward is invalid', function (done) {
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
		
		it('should clear database', function (done) {
			async.every([
				'blocks where height > 1',
				'trs where "blockId" != \'6524861224470851795\'',
				'mem_accounts where address in (\'2737453412992791987L\', \'2896019180726908125L\')',
				'forks_stat',
				'votes where "transactionId" = \'17502993173215211070\''
			], function (table, seriesCb) {
				clearDatabaseTable(modulesLoader.db, modulesLoader.logger, table, seriesCb);
			}, function (err, result) {
				if (err) {
					return done(err);
				}
				delegates.generateDelegateList(done);
			});
		});

		it('should generate account', function (done) {
			accounts.setAccountAndGet(testAccount.account, function (err, newaccount) {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(testAccount.account.address);
				done();
			});
		});

		it('should generate block 1', function (done) {
			var secret = 'lend crime turkey diary muscle donkey arena street industry innocent network lunar';
			
			block1 = createBlock(blocks, blockLogic, secret, 32578370, transactionsBlock1, previousBlock1);
			expect(block1.version).to.equal(0);
			expect(block1.timestamp).to.equal(32578370);
			expect(block1.numberOfTransactions).to.equal(1);
			expect(block1.reward).to.equal(0);
			expect(block1.totalFee).to.equal(10000000);
			expect(block1.totalAmount).to.equal(10000000000000000);
			expect(block1.payloadLength).to.equal(117);
			expect(block1.transactions).to.deep.equal(transactionsBlock1);
			expect(block1.previousBlock).to.equal(previousBlock1.id);
			done();
		});

		it('should be ok when process block 1', function (done) {
			blocksVerify.processBlock(block1, true, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage[0]).to.equal('newBlock');
				onMessage[1] = bson.deserialize(onMessage[1]);
				expect(onMessage[1].version).to.be.undefined;
				expect(onMessage[1].numberOfTransactions).to.be.undefined;
				expect(onMessage[2]).to.be.true;
				expect(onMessage[3]).to.equal('transactionsSaved');
				expect(onMessage[4]).to.deep.equal(block1.transactions);
				modulesLoader.scope.bus.clearMessages();
				done();
			}, true);
		});
	});

	describe('processBlock() for invalid block {broadcast: true, saveBlock: true}', function () {
		
		it('should fail when process block 1 again (checkExists)', function (done) {
			blocks.lastBlock.set(previousBlock1);

			blocksVerify.processBlock(block1, true, function (err, result) {
				expect(err).to.equal(['Block', block1.id, 'already exists'].join(' '));
				done();
				modulesLoader.scope.bus.clearMessages();
			}, true);
		});
	});
	
	// Receives a block from network, save it locally.
	describe('processBlock() for invalid block {broadcast: false, saveBlock: true}', function () {
		
		var invalidBlock2;

		it('should generate block 2 with invalid generator slot', function (done) {
			var secret = 'latin swamp simple bridge pilot become topic summer budget dentist hollow seed';
			
			block2 = createBlock(blocks, blockLogic, secret, 33772882, transactionsBlock2, block1);
			expect(block2.version).to.equal(0);
			expect(block2.timestamp).to.equal(33772882);
			expect(block2.numberOfTransactions).to.equal(1);
			expect(block2.reward).to.equal(0);
			expect(block2.totalFee).to.equal(10000000);
			expect(block2.totalAmount).to.equal(100000000);
			expect(block2.payloadLength).to.equal(117);
			expect(block2.transactions).to.deep.equal(transactionsBlock2);
			expect(block2.previousBlock).to.equal(block1.id);
			done();
		});

		describe('normalizeBlock validations', function () {

			it('should fail when timestamp property is missing', function (done) {
				block2 = blocksVerify.deleteBlockProperties(block2);
				var timestamp = block2.timestamp;
				delete block2.timestamp;

				blocksVerify.processBlock(block2, false, function (err, result) {
					if (err) {
						expect(err).equal('Failed to validate block schema: Missing required property: timestamp');
						block2.timestamp = timestamp;
						done();
					}
				}, true);
			});

			it('should fail when transactions property is missing', function (done) {
				var transactions = block2.transactions;
				delete block2.transactions;

				blocksVerify.processBlock(block2, false, function (err, result) {
					if (err) {
						expect(err).equal('Included transactions do not match block transactions count');
						block2.transactions = transactions;
						done();
					}
				}, true);
			});

			it('should fail when transaction type property is missing', function (done) {
				var trsType = block2.transactions[0].type;
				delete block2.transactions[0].type;

				blocksVerify.processBlock(block2, false, function (err, result) {
					if (err) {
						expect(err).equal('Unknown transaction type undefined');
						block2.transactions[0].type = trsType;
						done();
					}
				}, true);
			});

			it('should fail when transaction timestamp property is missing', function (done) {
				var trsTimestamp = block2.transactions[0].timestamp;
				delete block2.transactions[0].timestamp;

				blocksVerify.processBlock(block2, false, function (err, result) {
					if (err) {
						expect(err).equal('Failed to validate transaction schema: Missing required property: timestamp');
						block2.transactions[0].timestamp = trsTimestamp;
						done();
					}
				}, true);
			});
		});

		it('should fail when block generator is invalid (fork:3)', function (done) {
			blocksVerify.processBlock(block2, false, function (err, result) {
				if (err) {
					expect(err).equal('Failed to verify slot: 3377288');
					done();
				}
			}, true);
		});

		it('should generate block 2 with valid generator slot and processed trs', function (done) {
			var secret = 'latin swamp simple bridge pilot become topic summer budget dentist hollow seed';
			
			block2 = createBlock(blocks, blockLogic, secret, 33772862, transactionsBlock1, block1);
			expect(block2.version).to.equal(0);
			expect(block2.timestamp).to.equal(33772862);
			expect(block2.numberOfTransactions).to.equal(1);
			expect(block2.reward).to.equal(0);
			expect(block2.totalFee).to.equal(10000000);
			expect(block2.totalAmount).to.equal(10000000000000000);
			expect(block2.payloadLength).to.equal(117);
			expect(block2.transactions).to.deep.equal(transactionsBlock1);
			expect(block2.previousBlock).to.equal(block1.id);
			done();
		});

		it('should fail when transaction is already confirmed (fork:2)', function (done) {
			block2 = blocksVerify.deleteBlockProperties(block2);

			blocksVerify.processBlock(block2, false, function (err, result) {
				if (err) {
					expect(err).to.equal(['Transaction is already confirmed:', transactionsBlock1[0].id].join(' '));
					done();
				}
			}, true);
		});

		it('should be ok when search block id into forked list', function (done) {
			expect(blocksVerify.forks.get(block2.id)).to.not.equal(-1);
			done();
		});
	});

	describe('processBlock() for valid block {broadcast: false, saveBlock: true}', function () {

		it('should generate block 2 with valid generator slot', function (done) {
			var secret = 'latin swamp simple bridge pilot become topic summer budget dentist hollow seed';
			
			block2 = createBlock(blocks, blockLogic, secret, 33772862, transactionsBlock2, block1);
			expect(block2.version).to.equal(0);
			expect(block2.timestamp).to.equal(33772862);
			expect(block2.numberOfTransactions).to.equal(1);
			expect(block2.reward).to.equal(0);
			expect(block2.totalFee).to.equal(10000000);
			expect(block2.totalAmount).to.equal(100000000);
			expect(block2.payloadLength).to.equal(117);
			expect(block2.transactions).to.deep.equal(transactionsBlock2);
			expect(block2.previousBlock).to.equal(block1.id);
			done();
		});

		it('should be ok when process block 2', function (done) {
			blocks.lastBlock.set(block1);

			blocksVerify.processBlock(block2, false, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage[0]).to.equal('transactionsSaved');
				expect(onMessage[1][0].id).to.equal(block2.transactions[0].id);
				modulesLoader.scope.bus.clearMessages();
				done();
			}, true);
		});

		it('should fail when process block 2 again (checkExists)', function (done) {
			blocks.lastBlock.set(block1);

			blocksVerify.processBlock(block2, false, function (err, result) {
				expect(err).to.equal(['Block', block2.id, 'already exists'].join(' '));
				done();
			}, true);
		});
	});

	// Sends a block to network, don't save it locally.
	describe('processBlock() for valid block {broadcast: true, saveBlock: false}', function () {

		it('should generate account', function (done) {
			accounts.setAccountAndGet(userAccount.account, function (err, newaccount) {
				if (err) {
					return done(err);
				}
				expect(newaccount.address).to.equal(userAccount.account.address);
				done();
			});
		});

		it('should generate block 3', function (done) {
			var secret = 'term stable snap size half hotel unique biology amateur fortune easily tribe';
			
			block3 = createBlock(blocks, blockLogic, secret, 33942637, [], block2);
			expect(block3.version).to.equal(0);
			done();
		});

		it('should be ok when broadcast block 3', function (done) {
			blocksVerify.processBlock(block3, true, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage[0]).to.equal('newBlock');
				onMessage[1] = bson.deserialize(onMessage[1]);
				expect(onMessage[1].version).to.be.undefined;
				expect(onMessage[1].numberOfTransactions).to.be.undefined;
				expect(onMessage[1].totalAmount).to.be.undefined;
				expect(onMessage[1].totalFee).to.be.undefined;
				expect(onMessage[1].payloadLength).to.be.undefined;
				expect(onMessage[1].reward).to.be.undefined;
				expect(onMessage[1].transactions).to.be.undefined;
				expect(onMessage[2]).to.be.true;
				expect(onMessage[3]).to.be.undefined; // transactionsSaved
				modulesLoader.scope.bus.clearMessages();
				done();
			}, false);
		});

		it('should be ok when broadcast block 3 again (checkExists)', function (done) {
			blocks.lastBlock.set(block2);
			
			blocksVerify.processBlock(block3, true, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage[0]).to.equal('newBlock');
				onMessage[1] = bson.deserialize(onMessage[1]);
				expect(onMessage[1].version).to.be.undefined;
				expect(onMessage[1].numberOfTransactions).to.be.undefined;
				expect(onMessage[1].totalAmount).to.be.undefined;
				expect(onMessage[1].totalFee).to.be.undefined;
				expect(onMessage[1].payloadLength).to.be.undefined;
				expect(onMessage[1].reward).to.be.undefined;
				expect(onMessage[1].transactions).to.be.undefined;
				expect(onMessage[2]).to.be.true;
				expect(onMessage[3]).to.be.undefined; // transactionsSaved
				modulesLoader.scope.bus.clearMessages();
				done();
			}, false);
		});
	});

	// Receives a block from network, don't save it locally.
	describe('processBlock() for valid block {broadcast: false, saveBlock: false}', function () {

		it('should be ok when receive block 3', function (done) {
			blocks.lastBlock.set(block2);
			block3 = blocksVerify.deleteBlockProperties(block3);

			blocksVerify.processBlock(block3, false, function (err, result) {
				if (err) {
					return done(err);
				}
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage).to.be.an('array').that.is.empty;
				done();
			}, false);
		});

		it('should be ok when receive block 3 again (checkExists)', function (done) {
			blocks.lastBlock.set(block2);
			block3 = blocksVerify.deleteBlockProperties(block3);

			blocksVerify.processBlock(block3, false, function (err, result) {
				expect(result).to.be.undefined;
				var onMessage = modulesLoader.scope.bus.getMessages();
				expect(onMessage).to.be.an('array').that.is.empty;
				done();
			}, false);
		});
	});
});
