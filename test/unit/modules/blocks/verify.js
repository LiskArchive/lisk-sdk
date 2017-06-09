'use strict';

var chai = require('chai');
var expect = require('chai').expect;

var express = require('express');
var sinon = require('sinon');

var modulesLoader = require('../../../common/initModule').modulesLoader;
var BlockLogic = require('../../../../logic/block.js');
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
};

describe('blocks/verify', function () {

	var blocksVerify;
	var blocks;
	var blockLogic;

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
				{transactions: require('../../../../modules/transactions')}
			], [
				{'block': require('../../../../logic/block')},
				{'transaction': require('../../../../logic/transaction')}
			], {}, function (err, __blocks) {
				if (err) {
					return done(err);
				}
				__blocks.blocks.verify.onBind(__blocks);
				blocks = __blocks.blocks;
				blocksVerify = __blocks.blocks.verify;
				done();
			});
		});
	});

	describe('verifyBlock() for valid block', function () {
		var ready = [];

		it('should be ok', function (done) {
			blocks.lastBlock.set(previousBlock);
			
			var check = blocksVerify.verifyBlock(validBlock);
			expect(check).to.equal('verified');
			done();
		});
	});

	describe('verifyBlock() for invalid block', function () {

		var invalidBlock = JSON.parse(JSON.stringify(validBlock));
		var invalidPreviousBlock = JSON.parse(JSON.stringify(previousBlock));

		it('verify block signature should fail (invalid blockSignature: no hex)', function (done) {
			invalidBlock.blockSignature = 'invalidblocksignature';

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('TypeError: Invalid hex string');
			done();
		});		

		it('verify block signature should fail (invalid blockSignature: hex)', function (done) {
			invalidBlock.blockSignature = 'bfaaabdc8612e177f1337d225a8a5af18cf2534f9e41b66c114850aa50ca2ea2621c4b2d34c4a8b62ea7d043e854c8ae3891113543f84f437e9d3c9cb24c0e05';

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('Failed to verify block signature');
			done();
		});

		it('verify block signature should fail (invalid generatorPublicKey: no hex)', function (done) {
			invalidBlock.blockSignature = validBlock.blockSignature;
			invalidBlock.generatorPublicKey = 'invalidblocksignature';

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('TypeError: Invalid hex string');
			done();
		});		

		it('verify block signature should fail (invalid generatorPublicKey: hex)', function (done) {
			invalidBlock.generatorPublicKey = '948b8b509579306694c00db2206ddb1517bfeca2b0dc833ec1c0f81e9644871b';

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('Failed to verify block signature');
			done();
		});

		it('calculate expected rewards should fail (invalid reward)', function (done) {
			invalidBlock.reward = 555;

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal(['Invalid block reward:', invalidBlock.reward, 'expected:', validBlock.reward].join(' '));
			done();
		});

		it('total fee should fail (invalid total fee)', function (done) {
			invalidBlock.totalFee = 555;

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('Invalid total fee');
			done();
		});
		
		it('payloadHash should fail (invalid payload hash)', function (done) {
			invalidBlock.payloadHash = 'invalidpayloadhash';

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('Invalid payload hash');
			done();
		});

		it('transactions check should fail (duplicate transaction)', function (done) {
			invalidBlock.transactions[1] = invalidBlock.transactions[0];

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('Encountered duplicate transaction: ' + invalidBlock.transactions[1].id);
			done();
		});

		it('transactions check should fail (getBytes(): Unknown transaction type)', function (done) {
			invalidBlock.transactions[0].type = 555;

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('Unknown transaction type ' + invalidBlock.transactions[0].type);
			done();
		});

		it('transactions check should fail (length is too high)', function (done) {
			invalidBlock.transactions[0].type = validBlock.transactions[0].type;
			invalidBlock.transactions = new Array(26);
			invalidBlock.numberOfTransactions = invalidBlock.transactions.length;
			
			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('Transactions length is too high');
			done();
		});

		it('transactions check should fail (number of transactions)', function (done) {
			invalidBlock.transactions = validBlock.transactions;
			
			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('Invalid number of transactions');
			done();
		});

		it('payload length should fail (too high)', function (done) {
			invalidBlock.payloadLength = 1024 * 1024 * 2;

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal('Payload length is too high');
			done();
		});

		it('previous block should fail (fork:1)', function (done) {
			invalidBlock.previousBlock = '10937893559311260102';
			invalidBlock.id = '10937893559311260102';

			var check = blocksVerify.verifyBlock(invalidBlock);
			expect(check).to.equal(['Invalid previous block:', invalidBlock.previousBlock, 'expected:', previousBlock.id].join(' '));
			done();
		});

		it('previous block should fail', function (done) {
			delete invalidPreviousBlock.previousBlock;
			invalidPreviousBlock.timestamp = 32578380;
			blocks.lastBlock.set(previousBlock);

			var check = blocksVerify.verifyBlock(invalidPreviousBlock);
			expect(check).to.equal('Invalid previous block');
			done();
		});

		it('block timestamp should fail', function (done) {
			invalidPreviousBlock.timestamp = 32578350;

			var check = blocksVerify.verifyBlock(invalidPreviousBlock);
			expect(check).to.equal('Invalid block timestamp');
			done();
		});

		it('block version should fail', function (done) {
			invalidPreviousBlock.version = 555;

			var check = blocksVerify.verifyBlock(invalidPreviousBlock);
			expect(check).to.equal('Invalid block version');
			done();
		});
	});
});