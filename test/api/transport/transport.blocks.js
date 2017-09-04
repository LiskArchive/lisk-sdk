'use strict';

var node = require('../../node.js');
var ws = require('../../common/wsCommunication');

var genesisblock = require('../../genesisBlock.json');
var verify = require('../../../modules/blocks/verify.js');
var bson = require('../../../helpers/bson.js');

describe('blocks', function () {

	it('using valid headers should be ok', function (done) {
		ws.call('blocks', null, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			node.expect(res).to.have.property('blocks').that.is.an('array');
			res.blocks.forEach(function (block) {
				node.expect(block).to.have.property('b_id').that.is.a('string');
				node.expect(block).to.have.property('b_version').that.is.a('number');
				node.expect(block).to.have.property('b_timestamp').that.is.a('number');
				node.expect(block).to.have.property('b_height').that.is.a('number');
				node.expect(block).to.have.property('b_previousBlock');
				node.expect(block).to.have.property('b_numberOfTransactions').that.is.a('number');
				node.expect(block).to.have.property('b_totalAmount').that.is.a('string');
				node.expect(block).to.have.property('b_totalFee').that.is.a('string');
				node.expect(block).to.have.property('b_reward').that.is.a('string');
				node.expect(block).to.have.property('b_payloadLength').that.is.a('number');
				node.expect(block).to.have.property('b_payloadHash').that.is.a('string');
				node.expect(block).to.have.property('b_generatorPublicKey').that.is.a('string');
				node.expect(block).to.have.property('b_blockSignature').that.is.a('string');
				node.expect(block).to.have.property('t_id');
				node.expect(block).to.have.property('t_rowId');
				node.expect(block).to.have.property('t_type');
				node.expect(block).to.have.property('t_timestamp');
				node.expect(block).to.have.property('t_senderPublicKey');
				node.expect(block).to.have.property('t_senderId');
				node.expect(block).to.have.property('t_recipientId');
				node.expect(block).to.have.property('t_amount');
				node.expect(block).to.have.property('t_fee');
				node.expect(block).to.have.property('t_signature');
				node.expect(block).to.have.property('t_signSignature');
				node.expect(block).to.have.property('s_publicKey');
				node.expect(block).to.have.property('d_username');
				node.expect(block).to.have.property('v_votes');
				node.expect(block).to.have.property('m_min');
				node.expect(block).to.have.property('m_lifetime');
				node.expect(block).to.have.property('m_keysgroup');
				node.expect(block).to.have.property('dapp_name');
				node.expect(block).to.have.property('dapp_description');
				node.expect(block).to.have.property('dapp_tags');
				node.expect(block).to.have.property('dapp_type');
				node.expect(block).to.have.property('dapp_link');
				node.expect(block).to.have.property('dapp_category');
				node.expect(block).to.have.property('dapp_icon');
				node.expect(block).to.have.property('in_dappId');
				node.expect(block).to.have.property('ot_dappId');
				node.expect(block).to.have.property('ot_outTransactionId');
				node.expect(block).to.have.property('t_requesterPublicKey');
				node.expect(block).to.have.property('t_signatures');
			});
			done();
		});
	});
});

describe('blocksCommon', function () {

	it('using no params should fail', function (done) {
		ws.call('blocksCommon', function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			node.expect(res).to.be.undefined;
			node.expect(err).to.equal('Missing required property: ids: #/');
			done();
		});
	});

	it('using ids == "";"";"" should fail', function (done) {
		ws.call('blocksCommon', {ids: '"";"";""'}, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			node.expect(err).to.equal('Invalid block id sequence');
			done();
		});
	});

	it('using ids == \'\',\'\',\'\' should fail', function (done) {
		ws.call('blocksCommon',  {ids: '\'\',\'\',\'\''}, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			
			node.expect(err).to.equal('Invalid block id sequence');
			done();
		});
	});

	it('using ids == "","","" should fail', function (done) {
		ws.call('blocksCommon', {ids: '"","",""'}, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			node.expect(err).to.equal('Invalid block id sequence');
			done();
		});
	});

	it('using ids == one,two,three should fail', function (done) {
		ws.call('blocksCommon', {ids: 'one,two,three'}, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			node.expect(err).to.equal('Invalid block id sequence');
			done();
		});
	});

	it('using ids == "1","2","3" should be ok and return null common block', function (done) {
		ws.call('blocksCommon', {ids: '"1","2","3"'}, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			
			node.expect(res).to.have.property('common').to.be.null;
			done();
		});
	});

	it('using ids == \'1\',\'2\',\'3\' should be ok and return null common block', function (done) {
		ws.call('blocksCommon', {ids: '\'1\',\'2\',\'3\''}, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			
			node.expect(res).to.have.property('common').to.be.null;
			done();
		});
	});

	it('using ids == 1,2,3 should be ok and return null common block', function (done) {
		ws.call('blocksCommon', {ids: '1,2,3'}, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			
			node.expect(res).to.have.property('common').to.be.null;
			done();
		});
	});

	it('using ids which include genesisblock.id should be ok', function (done) {
		ws.call('blocksCommon', {ids: [genesisblock.id.toString(),'2','3'].join(',')}, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			
			node.expect(res).to.have.property('common').to.be.an('object');
			node.expect(res.common).to.have.property('height').that.is.a('number');
			node.expect(res.common).to.have.property('id').that.is.a('string');
			node.expect(res.common).to.have.property('previousBlock').that.is.null;
			node.expect(res.common).to.have.property('timestamp').that.is.equal(0);
			done();
		});
	});
});

describe('postBlock', function () {
	
	it('using no block should fail', function (done) {
		ws.call('postBlock', function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			node.expect(err).to.contain('Failed to validate block schema');
			done();
		});
	});

	it('using invalid block schema should fail', function (done) {
		var blockSignature = genesisblock.blockSignature;
		genesisblock.blockSignature = null;
		genesisblock = verify.prototype.deleteBlockProperties(genesisblock);

		ws.call('postBlock', { block: bson.serialize(genesisblock) }, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			node.expect(err).to.contain('Failed to validate block schema');
			genesisblock.blockSignature = blockSignature;
			done();
		});
	});

	it('using valid block schema should be ok', function (done) {
		genesisblock.transactions.forEach(function (transaction) {
			if (transaction.asset && transaction.asset.delegate) {
				transaction.asset.delegate.publicKey = transaction.senderPublicKey;
			}
		});
		ws.call('postBlock', { block: bson.serialize(genesisblock) }, function (err, res) {
			node.debug('> Error / Response:'.grey, JSON.stringify(err), JSON.stringify(res));
			node.expect(res).to.have.property('blockId').to.equal('6524861224470851795');
			done();
		});
	});
});
