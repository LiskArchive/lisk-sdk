'use strict';

var test = require('../functional.js');

var expect = require('chai').expect;

var ws = require('../../common/ws/communication');

var genesisblock = require('../../data/genesisBlock.json');
var verify = require('../../../modules/blocks/verify');
var bson = require('../../../helpers/bson');

describe('WS transport blocks', function () {

	var testBlock = {
		id: '2807833455815592401',
		version: 0,
		timestamp: 39997040,
		height: 1258,
		previousBlock: '3863141986505461614',
		numberOfTransactions: 0,
		transactions: [],
		totalAmount: 0,
		totalFee: 0,
		reward: 0,
		payloadLength: 0,
		payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
		generatorPublicKey: 'bf9f5cfc548d29983cc0dfa5c4ec47c66c31df0f87aa669869678996902ab47f',
		generatorId: '9950029393097476480L',
		blockSignature: 'd54ac91d2f712f408e16ff5057f7ceaa2e3a1ad4bde759e1025b16ec48bdd8ea1d3adaf5e8b94ef205f9f365f6ebae0f178a3cb3f6354c28e74ba7a05fce600c',
		confirmations: 2,
		totalForged: '0'
	};

	describe('blocks', function () {

		it('using valid headers should be ok', function (done) {
			ws.call('blocks', null, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				expect(res).to.have.property('blocks').that.is.an('array');
				res.blocks.forEach(function (block) {
					expect(block).to.have.property('b_id').that.is.a('string');
					expect(block).to.have.property('b_version').that.is.a('number');
					expect(block).to.have.property('b_timestamp').that.is.a('number');
					expect(block).to.have.property('b_height').that.is.a('number');
					expect(block).to.have.property('b_previousBlock');
					expect(block).to.have.property('b_numberOfTransactions').that.is.a('number');
					expect(block).to.have.property('b_totalAmount').that.is.a('string');
					expect(block).to.have.property('b_totalFee').that.is.a('string');
					expect(block).to.have.property('b_reward').that.is.a('string');
					expect(block).to.have.property('b_payloadLength').that.is.a('number');
					expect(block).to.have.property('b_payloadHash').that.is.a('string');
					expect(block).to.have.property('b_generatorPublicKey').that.is.a('string');
					expect(block).to.have.property('b_blockSignature').that.is.a('string');
					expect(block).to.have.property('t_id');
					expect(block).to.have.property('t_rowId');
					expect(block).to.have.property('t_type');
					expect(block).to.have.property('t_timestamp');
					expect(block).to.have.property('t_senderPublicKey');
					expect(block).to.have.property('t_senderAddress');
					expect(block).to.have.property('t_recipientAddress');
					expect(block).to.have.property('t_amount');
					expect(block).to.have.property('t_fee');
					expect(block).to.have.property('t_signature');
					expect(block).to.have.property('t_signSignature');
					expect(block).to.have.property('s_publicKey');
					expect(block).to.have.property('d_username');
					expect(block).to.have.property('v_votes');
					expect(block).to.have.property('m_min');
					expect(block).to.have.property('m_lifetime');
					expect(block).to.have.property('m_keysgroup');
					expect(block).to.have.property('dapp_name');
					expect(block).to.have.property('dapp_description');
					expect(block).to.have.property('dapp_tags');
					expect(block).to.have.property('dapp_type');
					expect(block).to.have.property('dapp_link');
					expect(block).to.have.property('dapp_category');
					expect(block).to.have.property('dapp_icon');
					expect(block).to.have.property('in_dappId');
					expect(block).to.have.property('ot_dappId');
					expect(block).to.have.property('ot_outTransactionId');
					expect(block).to.have.property('t_requesterPublicKey');
					expect(block).to.have.property('t_signatures');
				});
				done();
			});
		});
	});

	describe('blocksCommon', function () {

		it('using no params should fail', function (done) {
			ws.call('blocksCommon', function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				expect(res).to.be.undefined;
				expect(err).to.equal('Missing required property: ids: ');
				done();
			});
		});

		it('using ids == "";"";"" should fail', function (done) {
			ws.call('blocksCommon', {ids: '"";"";""'}, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				expect(err).to.equal('Invalid block id sequence');
				done();
			});
		});

		it('using ids == \'\',\'\',\'\' should fail', function (done) {
			ws.call('blocksCommon',  {ids: '\'\',\'\',\'\''}, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				expect(err).to.equal('Invalid block id sequence');
				done();
			});
		});

		it('using ids == "","","" should fail', function (done) {
			ws.call('blocksCommon', {ids: '"","",""'}, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				expect(err).to.equal('Invalid block id sequence');
				done();
			});
		});

		it('using ids == one,two,three should fail', function (done) {
			ws.call('blocksCommon', {ids: 'one,two,three'}, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				expect(err).to.equal('Invalid block id sequence');
				done();
			});
		});

		it('using ids == "1","2","3" should be ok and return null common block', function (done) {
			ws.call('blocksCommon', {ids: '"1","2","3"'}, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				expect(res).to.have.property('common').to.be.null;
				done();
			});
		});

		it('using ids == \'1\',\'2\',\'3\' should be ok and return null common block', function (done) {
			ws.call('blocksCommon', {ids: '\'1\',\'2\',\'3\''}, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				expect(res).to.have.property('common').to.be.null;
				done();
			});
		});

		it('using ids == 1,2,3 should be ok and return null common block', function (done) {
			ws.call('blocksCommon', {ids: '1,2,3'}, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				expect(res).to.have.property('common').to.be.null;
				done();
			});
		});

		it('using ids which include genesisblock.id should be ok', function (done) {
			ws.call('blocksCommon', {ids: [genesisblock.id.toString(),'2','3'].join(',')}, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));

				expect(res).to.have.property('common').to.be.an('object');
				expect(res.common).to.have.property('height').that.is.a('number');
				expect(res.common).to.have.property('id').that.is.a('string');
				expect(res.common).to.have.property('previousBlock').that.is.null;
				expect(res.common).to.have.property('timestamp').that.is.equal(0);
				done();
			});
		});
	});

	describe('postBlock', function () {

		it('using no block should fail', function (done) {
			ws.call('postBlock', function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				expect(err).to.contain('Failed to validate block schema');
				done();
			});
		});

		it('using invalid block schema should fail', function (done) {
			var blockSignature = genesisblock.blockSignature;
			genesisblock.blockSignature = null;
			genesisblock = verify.prototype.deleteBlockProperties(genesisblock);

			ws.call('postBlock', { block: bson.serialize(genesisblock) }, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				expect(err).to.contain('Failed to validate block schema');
				genesisblock.blockSignature = blockSignature;
				done();
			});
		});

		it('using valid block schema should be ok', function (done) {
			testBlock.transactions.forEach(function (transaction) {
				if (transaction.asset && transaction.asset.delegate) {
					transaction.asset.delegate.publicKey = transaction.senderPublicKey;
				}
			});
			ws.call('postBlock', { block: bson.serialize(testBlock) }, function (err, res) {
				test.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
				expect(res).to.have.property('blockId').to.equal('2807833455815592401');
				done();
			});
		});
	});
});
