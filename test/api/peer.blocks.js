'use strict';

var node = require('./../node.js');
var genesisblock = require('../../genesisBlock.json');

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

describe('GET /peer/blocks', function () {

	it('using valid headers should be ok', function (done) {
		node.get('/peer/blocks')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('blocks').that.is.an('array');
				res.body.blocks.forEach(function (block) {
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

describe('GET /peer/blocks/common', function () {

	it('using incorrect nethash in headers should fail', function (done) {
		node.get('/peer/blocks/common')
			.set('nethash', 'incorrect')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body.expected).to.equal(node.config.nethash);
				done();
			});
	});

	it('using no params should fail', function (done) {
		node.get('/peer/blocks/common')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.equal('Missing required property: ids: #/');
				done();
			});
	});

	it('using ids == "";"";"" should fail', function (done) {
		node.get('/peer/blocks/common?ids="";"";""')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.equal('Invalid block id sequence');
				done();
			});
	});

	it('using ids == \'\',\'\',\'\' should fail', function (done) {
		node.get('/peer/blocks/common?ids=\'\',\'\',\'\'')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.equal('Invalid block id sequence');
				done();
			});
	});

	it('using ids == "","","" should fail', function (done) {
		node.get('/peer/blocks/common?ids="","",""')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.equal('Invalid block id sequence');
				done();
			});
	});

	it('using ids == one,two,three should fail', function (done) {
		node.get('/peer/blocks/common?ids=one,two,three')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.equal('Invalid block id sequence');
				done();
			});
	});

	it('using ids == "1","2","3" should be ok and return null common block', function (done) {
		node.get('/peer/blocks/common?ids="1","2","3"')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('common').to.be.null;
				done();
			});
	});

	it('using ids == \'1\',\'2\',\'3\' should be ok and return null common block', function (done) {
		node.get('/peer/blocks/common?ids=\'1\',\'2\',\'3\'')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('common').to.be.null;
				done();
			});
	});

	it('using ids == 1,2,3 should be ok and return null common block', function (done) {
		node.get('/peer/blocks/common?ids=1,2,3')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('common').to.be.null;
				done();
			});
	});

	it('using ids which include genesisblock.id should be ok', function (done) {
		node.get('/peer/blocks/common?ids=' + [genesisblock.id.toString(),'2','3'].join(','))
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('common').to.be.an('object');
				node.expect(res.body.common).to.have.property('height').that.is.a('number');
				node.expect(res.body.common).to.have.property('id').that.is.a('string');
				node.expect(res.body.common).to.have.property('previousBlock').that.is.null;
				node.expect(res.body.common).to.have.property('timestamp').that.is.equal(0);
				done();
			});
	});
});

describe('POST /peer/blocks', function () {

	it('using incorrect nethash in headers should fail', function (done) {
		node.post('/peer/blocks', { dummy: 'dummy' })
			.set('nethash', 'incorrect')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body.expected).to.equal(node.config.nethash);
				done();
			});
	});

	it('using no block should fail', function (done) {
		node.post('/peer/blocks')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.contain('Failed to validate block schema');
				done();
			});
	});

	it('using invalid block schema should fail', function (done) {
		var blockSignature = genesisblock.blockSignature;
		genesisblock.blockSignature = null;

		node.post('/peer/blocks', { block: genesisblock })
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.contain('Failed to validate block schema');
				genesisblock.blockSignature = blockSignature;
				done();
			});
	});

	it('using valid block schema should be ok', function (done) {
		node.post('/peer/blocks', { block: testBlock })
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('blockId').to.equal('2807833455815592401');
				done();
			});
	});
});
