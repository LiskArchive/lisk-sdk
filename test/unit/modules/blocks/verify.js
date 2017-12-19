'use strict';

var expect = require('chai').expect;
var async = require('async');
var sinon = require('sinon');
var _ = require('lodash');
var rewire = require('rewire');

var constants = require('../../../../helpers/constants.js');
var slots = require('../../../../helpers/slots');
var modulesLoader = require('../../../common/initModule').modulesLoader;
var BlockLogic = require('../../../../logic/block.js');
var exceptions = require('../../../../helpers/exceptions.js');
var clearDatabaseTable = require('../../../common/globalBefore').clearDatabaseTable;

var crypto = require('crypto');

var previousBlock = {
	blockSignature: '696f78bed4d02faae05224db64e964195c39f715471ebf416b260bc01fa0148f3bddf559127b2725c222b01cededb37c7652293eb1a81affe2acdc570266b501',
	generatorPublicKey:'86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
	height: 488,
	id: '11850828211026019525',
	numberOfTransactions: 0,
	payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	payloadLength: 0,
	previousBlock: '8805727971083409014',
	relays: 1,
	reward: 0,
	timestamp: 32578360,
	totalAmount: 0,
	totalFee: 0,
	transactions: [],
	version: 0,
};

var validBlock = {
	blockSignature: '56d63b563e00332ec31451376f5f2665fcf7e118d45e68f8db0b00db5963b56bc6776a42d520978c1522c39545c9aff62a7d5bdcf851bf65904b2c2158870f00',
	generatorPublicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
	numberOfTransactions: 2,
	payloadHash: 'be0df321b1653c203226add63ac0d13b3411c2f4caf0a213566cbd39edb7ce3b',
	payloadLength: 494,
	previousBlock: '11850828211026019525',
	height: 489,
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
	height: 1,
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
	blockSignature: '696f78bed4d02faae05224db64e964195c39f715471ebf416b260bc01fa0148f3bddf559127b2725c222b01cededb37c7652293eb1a81affe2acdc570266b501',
	generatorPublicKey: '86499879448d1b0215d59cbf078836e3d7d9d2782d56a2274a568761bff36f19',
	height: 488,
	id: '6524861224470851795',
	numberOfTransactions:0,
	payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
	payloadLength: 0,
	previousBlock: '8805727971083409014',
	relays: 1,
	reward: 0,
	timestamp: 32578360,
	totalAmount: 0,
	totalFee: 0,
	transactions: [],
	version: 0,
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
	// newBlock.id = blockLogic.getId(newBlock);
	return newBlock;
}

describe.skip('blocks/verify', function () {

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

	function testValid (functionName) {
		it('should be ok', function () {
			blocks.lastBlock.set(previousBlock);

			var result = blocksVerify[functionName](validBlock);

			expect(result.verified).to.be.true;
			expect(result.errors).to.be.an('array').that.is.empty;
		});

		it('should be ok when block is invalid but block id is excepted for having invalid block reward', function () {
			exceptions.blockRewards.push(blockRewardInvalid.id);

			var result = blocksVerify[functionName](blockRewardInvalid);

			expect(result.verified).to.be.true;
			expect(result.errors).to.be.an('array').that.is.empty;
		});
	}

	function testSetHeight (functionName) {
		it('should set height from lastBlock', function () {
			blocks.lastBlock.set(previousBlock);

			var result = blocksVerify[functionName](validBlock);

			expect(result.verified).to.be.true;
			expect(result.errors).to.be.an('array').that.is.empty;
			expect(validBlock.height).to.equal(previousBlock.height + 1);
		});
	}

	function testVerifySignature (functionName) {
		it('should fail when blockSignature property is not a hex string', function () {
			var blockSignature = validBlock.blockSignature;
			validBlock.blockSignature = 'invalidBlockSignature';

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(3);

			expect(result.errors[0]).to.equal('TypeError: Invalid hex string');
			expect(result.errors[1]).to.equal('Failed to verify block signature');
			expect(result.errors[2]).to.equal('TypeError: Invalid hex string');

			validBlock.blockSignature = blockSignature;
		});

		it('should fail when blockSignature property is an invalid hex string', function () {
			var blockSignature = validBlock.blockSignature;
			validBlock.blockSignature = 'bfaaabdc8612e177f1337d225a8a5af18cf2534f9e41b66c114850aa50ca2ea2621c4b2d34c4a8b62ea7d043e854c8ae3891113543f84f437e9d3c9cb24c0e05';

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(1);
			expect(result.errors[0]).to.equal('Failed to verify block signature');

			validBlock.blockSignature = blockSignature;
		});

		it('should fail when generatorPublicKey property is not a hex string', function () {
			var generatorPublicKey = validBlock.generatorPublicKey;
			validBlock.generatorPublicKey = 'invalidBlockSignature';

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(3);
			expect(result.errors[0]).to.equal('TypeError: Invalid hex string');
			expect(result.errors[1]).to.equal('Failed to verify block signature');
			expect(result.errors[2]).to.equal('TypeError: Invalid hex string');

			validBlock.generatorPublicKey = generatorPublicKey;
		});

		it('should fail when generatorPublicKey property is an invalid hex string', function () {
			var generatorPublicKey = validBlock.generatorPublicKey;
			validBlock.generatorPublicKey = '948b8b509579306694c00db2206ddb1517bfeca2b0dc833ec1c0f81e9644871b';

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(1);
			expect(result.errors[0]).to.equal('Failed to verify block signature');

			validBlock.generatorPublicKey = generatorPublicKey;
		});
	}

	function testPreviousBlock (functionName) {
		it('should fail when previousBlock property is missing', function () {
			var previousBlock = validBlock.previousBlock;
			delete validBlock.previousBlock;

			var result = blocksVerify[functionName](validBlock);

			expect(result.verified).to.be.false;
			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal('Invalid previous block');
			expect(result.errors[1]).to.equal('Failed to verify block signature');

			validBlock.previousBlock = previousBlock;
		});
	}

	function testVerifyVersion (functionName) {
		it('should fail when block version != 0', function () {
			var version = validBlock.version;
			validBlock.version = 99;

			var result = blocksVerify[functionName](validBlock);

			expect(result.verified).to.be.false;
			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal('Invalid block version');
			expect(result.errors[1]).to.equal('Failed to verify block signature');

			validBlock.version = version;
		});
	}

	function testVerifyReward (functionName) {
		it('should fail when block reward is invalid', function () {
			validBlock.reward = 99;

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal(['Invalid block reward:', 99, 'expected:', 0].join(' '));

			validBlock.reward = 0;
		});
	}

	function testVerifyId (functionName) {
		it('should reset block id when block id is an invalid alpha-numeric string value', function () {
			var blockId = '884740302254229983';
			validBlock.id = 'invalid-block-id';

			var result = blocksVerify[functionName](validBlock);

			expect(validBlock.id).to.equal(blockId);
			expect(validBlock.id).to.not.equal('invalid-block-id');
		});

		it('should reset block id when block id is an invalid numeric string value', function () {
			var blockId = '884740302254229983';
			validBlock.id = '11850828211026019526';

			var result = blocksVerify[functionName](validBlock);

			expect(validBlock.id).to.equal(blockId);
			expect(validBlock.id).to.not.equal('11850828211026019526');
		});

		it('should reset block id when block id is an invalid integer value', function () {
			var blockId = '884740302254229983';
			validBlock.id = 11850828211026019526;

			var result = blocksVerify[functionName](validBlock);

			expect(validBlock.id).to.equal(blockId);
			expect(validBlock.id).to.not.equal(11850828211026019526);
		});

		it('should reset block id when block id is a valid integer value', function () {
			var blockId = '884740302254229983';
			validBlock.id = 11850828211026019525;

			var result = blocksVerify[functionName](validBlock);

			expect(validBlock.id).to.equal(blockId);
			expect(validBlock.id).to.not.equal(11850828211026019525);
		});
	}

	function testVerifyPayload (functionName) {
		it('should fail when payload length greater than maxPayloadLength constant value', function () {
			var payloadLength = validBlock.payloadLength;
			validBlock.payloadLength = 1024 * 1024 * 2;

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal('Payload length is too long');
			expect(result.errors[1]).to.equal('Failed to verify block signature');

			validBlock.payloadLength = payloadLength;
		});

		it('should fail when transactions length is not equal to numberOfTransactions property', function () {
			validBlock.numberOfTransactions = validBlock.transactions.length + 1;

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal('Included transactions do not match block transactions count');
			expect(result.errors[1]).to.equal('Failed to verify block signature');

			validBlock.numberOfTransactions = validBlock.transactions.length;
		});

		it('should fail when transactions length greater than maxTxsPerBlock constant value', function () {
			var transactions = validBlock.transactions;
			validBlock.transactions = new Array(26);
			validBlock.numberOfTransactions = validBlock.transactions.length;

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(4);
			expect(result.errors[0]).to.equal('Invalid total amount');
			expect(result.errors[1]).to.equal('Invalid payload hash');
			expect(result.errors[2]).to.equal('Number of transactions exceeds maximum per block');
			expect(result.errors[3]).to.equal('Failed to verify block signature');

			validBlock.transactions = transactions;
			validBlock.numberOfTransactions = transactions.length;
		});

		it('should fail when a transaction is of an unknown type', function () {
			var trsType = validBlock.transactions[0].type;
			validBlock.transactions[0].type = 555;

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal('Invalid payload hash');
			expect(result.errors[1]).to.equal('Unknown transaction type ' + validBlock.transactions[0].type);

			validBlock.transactions[0].type = trsType;
		});

		it('should fail when a transaction is duplicated', function () {
			var secondTrs = validBlock.transactions[1];
			validBlock.transactions[1] = validBlock.transactions[0];

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(3);
			expect(result.errors[0]).to.equal('Invalid total amount');
			expect(result.errors[1]).to.equal('Invalid payload hash');
			expect(result.errors[2]).to.equal('Encountered duplicate transaction: ' + validBlock.transactions[1].id);

			validBlock.transactions[1] = secondTrs;
		});

		it('should fail when payload hash is invalid', function () {
			var payloadHash = validBlock.payloadHash;
			validBlock.payloadHash = 'invalidPayloadHash';

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal('Invalid payload hash');
			expect(result.errors[1]).to.equal('Failed to verify block signature');

			validBlock.payloadHash = payloadHash;
		});

		it('should fail when summed transaction amounts do not match totalAmount property', function () {
			var totalAmount = validBlock.totalAmount;
			validBlock.totalAmount = 99;

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal('Invalid total amount');
			expect(result.errors[1]).to.equal('Failed to verify block signature');

			validBlock.totalAmount = totalAmount;
		});

		it('should fail when summed transaction fees do not match totalFee property', function () {
			var totalFee = validBlock.totalFee;
			validBlock.totalFee = 99;

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal('Invalid total fee');
			expect(result.errors[1]).to.equal('Failed to verify block signature');

			validBlock.totalFee = totalFee;
		});
	}

	function testVerifyForkOne (functionName) {
		it('should fail when previousBlock value is invalid', function () {
			var previousBlock = blocks.lastBlock.get().id;
			validBlock.previousBlock = '10937893559311260102';

			var result = blocksVerify[functionName](validBlock);

			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal(['Invalid previous block:', validBlock.previousBlock, 'expected:', previousBlock].join(' '));
			expect(result.errors[1]).to.equal('Failed to verify block signature');

			validBlock.previousBlock = previousBlock;
		});
	}

	function testVerifyBlockSlot (functionName) {
		it('should fail when block timestamp is less than previousBlock timestamp', function () {
			var timestamp = validBlock.timestamp;
			validBlock.timestamp = 32578350;

			var result = blocksVerify[functionName](validBlock);

			expect(result.verified).to.be.false;
			expect(result.errors).to.be.an('array').with.lengthOf(2);
			expect(result.errors[0]).to.equal('Invalid block timestamp');
			expect(result.errors[1]).to.equal('Failed to verify block signature');

			validBlock.timestamp  = timestamp;
		});
	}

	describe('verifyReceipt() when block is valid', testValid.bind(null, 'verifyReceipt'));

	describe('verifyReceipt() when block is invalid', function () {

		describe('calling setHeight()', testSetHeight.bind(null, 'verifyReceipt'));

		describe('calling verifySignature()', testVerifySignature.bind(null, 'verifyReceipt'));

		describe('calling verifyPreviousBlock()', testPreviousBlock.bind(null, 'verifyReceipt'));

		describe('calling verifyVersion()', testVerifyVersion.bind(null, 'verifyReceipt'));

		describe('calling verifyReward()', testVerifyReward.bind(null, 'verifyReceipt'));

		describe('calling verifyId()', testVerifyId.bind(null, 'verifyReceipt'));

		describe('calling verifyPayload()', testVerifyPayload.bind(null, 'verifyReceipt'));

		describe.skip('calling verifyForkOne()', testVerifyForkOne);

		describe.skip('calling verifyBlockSlot()', testVerifyBlockSlot);
	});

	describe('verifyBlock() when block is valid', testValid.bind(null, 'verifyBlock'));

	describe('verifyBlock() when block is invalid', function () {

		describe('calling setHeight()', testSetHeight.bind(null, 'verifyBlock'));

		describe('calling verifySignature()', testVerifySignature.bind(null, 'verifyBlock'));

		describe('calling verifyPreviousBlock()', testPreviousBlock.bind(null, 'verifyBlock'));

		describe('calling verifyVersion()', testVerifyVersion.bind(null, 'verifyBlock'));

		describe('calling verifyReward()', testVerifyReward.bind(null, 'verifyBlock'));

		describe('calling verifyId()', testVerifyId.bind(null, 'verifyBlock'));

		describe('calling verifyPayload()', testVerifyPayload.bind(null, 'verifyBlock'));

		describe('calling verifyForkOne()', testVerifyForkOne.bind(null, 'verifyBlock'));

		describe('calling verifyBlockSlot()', testVerifyBlockSlot.bind(null, 'verifyBlock'));
	});

	describe('__private', function () {

		var blockVerify;

		before(function () {
			blockVerify = rewire('../../../../modules/blocks/verify.js');
		});

		describe('verifyBlockSlotWindow', function () {

			var verifyBlockSlotWindow;
			var result;

			before(function () {
				verifyBlockSlotWindow = blockVerify.__get__('__private.verifyBlockSlotWindow');
			});

			beforeEach(function () {
				result = {
					errors: []
				};
			});

			describe('for current slot number', function () {

				var dummyBlock;

				before(function () {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber())
					};
				});

				it('should return empty result.errors array', function () {
					expect(verifyBlockSlotWindow(dummyBlock, result).errors).to.have.length(0);
				});
			});

			describe('for slot number ' + constants.blockSlotWindow + ' slots in the past', function () {

				var dummyBlock;

				before(function () {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber() - constants.blockSlotWindow)
					};
				});

				it('should return empty result.errors array', function () {
					expect(verifyBlockSlotWindow(dummyBlock, result).errors).to.have.length(0);
				});
			});

			describe('for slot number in the future', function () {

				var dummyBlock;

				before(function () {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber() + 1)
					};
				});

				it('should call callback with error = Block slot is in the future ', function () {
					expect(verifyBlockSlotWindow(dummyBlock, result).errors).to.include.members(['Block slot is in the future']);
				});
			});

			describe('for slot number ' + (constants.blockSlotWindow + 1) + ' slots in the past', function () {

				var dummyBlock;

				before(function () {
					dummyBlock = {
						timestamp: slots.getSlotTime(slots.getSlotNumber() - (constants.blockSlotWindow + 1))
					};
				});

				it('should call callback with error = Block slot is too old', function () {
					expect(verifyBlockSlotWindow(dummyBlock, result).errors).to.include.members(['Block slot is too old']);
				});
			});
		});

		describe('onBlockchainReady', function () {

			var onBlockchainReady;

			before(function () {
				var db = modulesLoader.db;
				blockVerify.__set__('library', {
					db: db
				});
				onBlockchainReady = blockVerify.prototype.onBlockchainReady;
			});

			it('should set the __private.lastNBlockIds variable', function () {
				return onBlockchainReady().then(function () {
					var lastNBlockIds = blockVerify.__get__('__private.lastNBlockIds');
					expect(lastNBlockIds).to.be.an('array').and.to.have.length.below(constants.blockSlotWindow + 1);
					_.each(lastNBlockIds, function (value) {
						expect(value).to.be.a('string');
					});
				});
			});
		});

		describe('onNewBlock', function () {

			describe('with lastNBlockIds', function () {

				var lastNBlockIds;

				before(function () {
					lastNBlockIds = blockVerify.__get__('__private.lastNBlockIds');
				});

				describe('when onNewBlock function is called once', function () {

					var dummyBlock;

					before(function () {
						dummyBlock = {
							id: '123123123'
						};

						blockVerify.prototype.onNewBlock(dummyBlock);
					});

					it('should include block in lastNBlockIds queue', function () {
						expect(lastNBlockIds).to.include.members([dummyBlock.id]);
					});
				});

				describe('when onNewBlock function is called ' + constants.blockSlotWindow + 'times', function () {

					var blockIds = [];

					before(function () {
						_.map(_.range(0, constants.blockSlotWindow), function () {
							var randomId = Math.floor(Math.random() * 100000000000).toString();
							blockIds.push(randomId);
							var dummyBlock = {
								id: randomId
							};

							blockVerify.prototype.onNewBlock(dummyBlock);
						});
					});

					it('should include blockId in lastNBlockIds queue', function () {
						expect(lastNBlockIds).to.include.members(blockIds);
					});
				});

				describe('when onNewBlock function is called ' + (constants.blockSlotWindow * 2) + ' times', function () {

					var recentNBlockIds;
					var olderThanNBlockIds;

					before(function () {
						var blockIds = [];
						_.map(_.range(0, constants.blockSlotWindow * 2), function () {
							var randomId = Math.floor(Math.random() * 100000000000).toString();
							blockIds.push(randomId);
							var dummyBlock = {
								id: randomId
							};

							blockVerify.prototype.onNewBlock(dummyBlock);
						});

						recentNBlockIds = blockIds.filter(function (value, index) {
							return blockIds.length - 1 - index < constants.blockSlotWindow;
						});

						olderThanNBlockIds = blockIds.filter(function (value, index) {
							return blockIds.length - 1 - index >= constants.blockSlotWindow;
						});
					});

					it('should maintain last ' + constants.blockSlotWindow + ' blockIds in lastNBlockIds queue', function () {
						expect(lastNBlockIds).to.include.members(recentNBlockIds);
						expect(lastNBlockIds).to.not.include.members(olderThanNBlockIds);
					});
				});
			});
		});

		describe('verifyAgainstLastNBlockIds', function () {

			var verifyAgainstLastNBlockIds;
			var result = {
				verified: true,
				errors: []
			};

			before(function () {
				verifyAgainstLastNBlockIds = blockVerify.__get__('__private.verifyAgainstLastNBlockIds');
			});

			afterEach(function () {
				result = {
					verified: true,
					errors: []
				};
			});

			describe('when __private.lastNBlockIds', function () {

				var lastNBlockIds;

				before(function () {
					lastNBlockIds = blockVerify.__get__('__private.lastNBlockIds');
				});

				describe('contains block id', function () {

					var dummyBlockId = '123123123123';

					before(function () {
						lastNBlockIds.push(dummyBlockId);
					});

					it('should return result with error = Block already exists in chain', function () {
						expect(verifyAgainstLastNBlockIds({id: dummyBlockId}, result).errors).to.include.members(['Block already exists in chain']);
					});
				});

				describe('does not contain block id', function () {

					it('should return result with no errors', function () {
						expect(verifyAgainstLastNBlockIds({id: '1231231234'}, result).errors).to.have.length(0);
					});
				});
			});
		});
	});
});
