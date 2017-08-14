'use strict';

var node = require('../node.js');
var http = require('../common/httpCommunication.js');
var modulesLoader = require('../common/initModule').modulesLoader;

var block = {
	blockHeight: 0,
	id: 0,
	generatorPublicKey: '',
	totalAmount: 0,
	totalFee: 0
};

var testBlocksUnder101 = false;

describe('GET /api/blocks/getBroadhash', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getBroadhash', function (err, res) {
			node.expect(res.body).to.have.property('broadhash').to.be.a('string');
			done();
		});
	});
});

describe('GET /api/blocks/getEpoch', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getEpoch', function (err, res) {
			node.expect(res.body).to.have.property('epoch').to.be.a('string');
			done();
		});
	});
});

describe('GET /api/blocks/getHeight', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getHeight', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			if (res.body.success && res.body.height != null) {
				node.expect(res.body).to.have.property('height').to.be.above(0);
				block.blockHeight = res.body.height;

				if (res.body.height > 100) {
					testBlocksUnder101 = true;
				}
			}
			done();
		});
	});
});

describe('GET /api/blocks/getFee', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getFee', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('fee');
			node.expect(res.body.fee).to.equal(node.fees.transactionFee);
			done();
		});
	});
});

describe('GET /api/blocks/getfees', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getFees', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('fees');
			node.expect(res.body.fees.send).to.equal(node.fees.transactionFee);
			node.expect(res.body.fees.vote).to.equal(node.fees.voteFee);
			node.expect(res.body.fees.dapp).to.equal(node.fees.dappRegistrationFee);
			node.expect(res.body.fees.secondsignature).to.equal(node.fees.secondPasswordFee);
			node.expect(res.body.fees.delegate).to.equal(node.fees.delegateRegistrationFee);
			node.expect(res.body.fees.multisignature).to.equal(node.fees.multisignatureRegistrationFee);
			done();
		});
	});
});

describe('GET /api/blocks/getNethash', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getNethash', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('nethash').to.be.a('string');
			node.expect(res.body.nethash).to.equal(node.config.nethash);
			done();
		});
	});
});

describe('GET /api/blocks/getMilestone', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getMilestone', function (err, res) {
			node.expect(res.body).to.have.property('milestone').to.be.a('number');
			done();
		});
	});
});

describe('GET /api/blocks/getReward', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getReward', function (err, res) {
			node.expect(res.body).to.have.property('reward').to.be.a('number');
			done();
		});
	});
});

describe('GET /api/blocks/getSupply', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getSupply', function (err, res) {
			node.expect(res.body).to.have.property('supply').to.be.a('number');
			done();
		});
	});
});

describe('GET /api/blocks/getStatus', function () {

	it('should be ok', function (done) {
		http.get('/api/blocks/getStatus', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('broadhash').to.be.a('string');
			node.expect(res.body).to.have.property('epoch').to.be.a('string');
			node.expect(res.body).to.have.property('height').to.be.a('number');
			node.expect(res.body).to.have.property('fee').to.be.a('number');
			node.expect(res.body).to.have.property('milestone').to.be.a('number');
			node.expect(res.body).to.have.property('nethash').to.be.a('string');
			node.expect(res.body).to.have.property('reward').to.be.a('number');
			node.expect(res.body).to.have.property('supply').to.be.a('number');
			done();
		});
	});
});

describe('GET /blocks (cache)', function () {

	var cache;

	before(function (done) {
		node.config.cacheEnabled = true;
		done();
	});

	before(function (done) {
		modulesLoader.initCache(function (err, __cache) {
			cache = __cache;
			node.expect(err).to.not.exist;
			node.expect(__cache).to.be.an('object');
			return done(err, __cache);
		});
	});

	after(function (done) {
		cache.quit(done);
	});

	afterEach(function (done) {
		cache.flushDb(function (err, status) {
			node.expect(err).to.not.exist;
			node.expect(status).to.equal('OK');
			done(err, status);
		});
	});

	it('cache blocks by the url and parameters when response is a success', function (done) {
		var url, params;
		url = '/api/blocks?';
		params = 'height=' + block.blockHeight;
		http.get(url + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			node.expect(res.body).to.have.property('count').to.equal(1);
			var response = res.body;
			cache.getJsonForKey(url + params, function (err, res) {
				node.expect(err).to.not.exist;
				node.expect(res).to.eql(response);
				done();
			});
		});
	});

	it('should not cache if response is not a success', function (done) {
		var url, params;
		url = '/api/blocks?';
		params = 'height=' + -1000;
		http.get(url + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			cache.getJsonForKey(url + params, function (err, res) {
				node.expect(err).to.not.exist;
				node.expect(res).to.eql(null);
				done();
			});
		});
	});

	it('should remove entry from cache on new block', function (done) {
		var url, params;
		url = '/api/blocks?';
		params = 'height=' + block.blockHeight;
		http.get(url + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			node.expect(res.body).to.have.property('count').to.equal(1);
			var response = res.body;
			cache.getJsonForKey(url + params, function (err, res) {
				node.expect(err).to.not.exist;
				node.expect(res).to.eql(response);
				node.onNewBlock(function (err) {
					node.expect(err).to.not.exist;
					cache.getJsonForKey(url + params, function (err, res) {
						node.expect(err).to.not.exist;
						node.expect(res).to.eql(null);
						done();
					});
				});
			});
		});
	});
});

describe('GET /blocks', function () {

	function getBlocks (params, done) {
		http.get('/api/blocks?' + params, done);
	}

	it('using height should be ok', function (done) {
		getBlocks('height=' + block.blockHeight, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			node.expect(res.body).to.have.property('count').to.equal(1);
			node.expect(res.body.blocks.length).to.equal(1);
			node.expect(res.body.blocks[0]).to.have.property('previousBlock');
			node.expect(res.body.blocks[0]).to.have.property('totalAmount');
			node.expect(res.body.blocks[0]).to.have.property('totalFee');
			node.expect(res.body.blocks[0]).to.have.property('generatorId');
			node.expect(res.body.blocks[0]).to.have.property('confirmations');
			node.expect(res.body.blocks[0]).to.have.property('blockSignature');
			node.expect(res.body.blocks[0]).to.have.property('numberOfTransactions');
			node.expect(res.body.blocks[0].height).to.equal(block.blockHeight);
			block.id = res.body.blocks[0].id;
			block.generatorPublicKey = res.body.blocks[0].generatorPublicKey;
			block.totalAmount = res.body.blocks[0].totalAmount;
			block.totalFee = res.body.blocks[0].totalFee;
			done();
		});
	});

	it('using height < 100 should be ok', function (done) {
		if (!testBlocksUnder101) {
			return this.skip();
		}

		getBlocks('height=' + 10, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('count');
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			node.expect(res.body.blocks.length).to.equal(1);
			node.expect(res.body.blocks[0]).to.have.property('previousBlock');
			node.expect(res.body.blocks[0]).to.have.property('totalAmount');
			node.expect(res.body.blocks[0]).to.have.property('totalFee');
			node.expect(res.body.blocks[0]).to.have.property('generatorId');
			node.expect(res.body.blocks[0]).to.have.property('confirmations');
			node.expect(res.body.blocks[0]).to.have.property('blockSignature');
			node.expect(res.body.blocks[0]).to.have.property('numberOfTransactions');
			node.expect(res.body.blocks[0].height).to.equal(10);
			block.id = res.body.blocks[0].id;
			block.generatorPublicKey = res.body.blocks[0].generatorPublicKey;
			block.totalAmount = res.body.blocks[0].totalAmount;
			block.totalFee = res.body.blocks[0].totalFee;
			done();
		});
	});

	it('using generatorPublicKey should be ok', function (done) {
		getBlocks('generatorPublicKey=' + block.generatorPublicKey, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			for (var i = 0; i < res.body.blocks.length; i++) {
				node.expect(res.body.blocks[i].generatorPublicKey).to.equal(block.generatorPublicKey);
			}
			done();
		});
	});

	it('using totalFee should be ok', function (done) {
		getBlocks('totalFee=' + block.totalFee, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			for (var i = 0; i < res.body.blocks.length; i++) {
				node.expect(res.body.blocks[i].totalFee).to.equal(block.totalFee);
			}
			done();
		});
	});

	it('using totalAmount should be ok', function (done) {
		getBlocks('totalAmount=' + block.totalAmount, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			for (var i = 0; i < res.body.blocks.length; i++) {
				node.expect(res.body.blocks[i].totalAmount).to.equal(block.totalAmount);
			}
			done();
		});
	});

	it('using previousBlock should be ok', function (done) {
		if (block.id === null) {
			return this.skip();
		}

		var previousBlock = block.id;

		node.onNewBlock(function (err) {
			getBlocks('previousBlock=' + block.id, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('blocks').that.is.an('array');
				node.expect(res.body.blocks).to.have.length(1);
				node.expect(res.body.blocks[0].previousBlock).to.equal(previousBlock);
				done();
			});
		});
	});

	it('using orderBy == "height:asc" should be ok', function (done) {
		getBlocks('orderBy=' + 'height:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			for (var i = 0; i < res.body.blocks.length; i++) {
				if (res.body.blocks[i + 1] != null) {
					node.expect(res.body.blocks[i].height).to.be.below(res.body.blocks[i + 1].height);
				}
			}
			done();
		});
	});

	it('using orderBy == "height:desc" should be ok', function (done) {
		getBlocks('orderBy=' + 'height:desc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			for (var i = 0; i < res.body.blocks.length; i++) {
				if (res.body.blocks[i + 1] != null) {
					node.expect(res.body.blocks[i].height).to.be.above(res.body.blocks[i + 1].height);
				}
			}
			done();
		});
	});

	it('should be ordered by "height:desc" by default', function (done) {
		getBlocks('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('blocks').that.is.an('array');
			for (var i = 0; i < res.body.blocks.length; i++) {
				if (res.body.blocks[i + 1] != null) {
					node.expect(res.body.blocks[i].height).to.be.above(res.body.blocks[i + 1].height);
				}
			}
			done();
		});
	});
});

describe('GET /api/blocks/get?id=', function () {

	function getBlocks (id, done) {
		http.get('/api/blocks/get?id=' + id, done);
	}

	it('using genesisblock id should be ok', function (done) {
		getBlocks('6524861224470851795', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('block').to.be.a('object');
			node.expect(res.body.block).to.have.property('id').to.be.a('string');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		getBlocks('9928719876370886655', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.be.a('string');
			done();
		});
	});

	it('using no id should fail', function (done) {
		getBlocks('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.be.a('string');
			done();
		});
	});
});
