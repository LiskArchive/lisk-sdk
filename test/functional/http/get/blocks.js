'use strict';

var node = require('../../../node.js');
var http = require('../../../common/httpCommunication.js');
var modulesLoader = require('../../../common/modulesLoader');

var block = {
	blockHeight: 1,
	id: 0,
	generatorPublicKey: '',
	totalAmount: 0,
	totalFee: 0
};

var testBlocksUnder101 = false;

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
