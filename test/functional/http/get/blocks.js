'use strict';

var node = require('../../../node.js');
var http = require('../../../common/httpCommunication.js');
var modulesLoader = require('../../../common/modulesLoader');

// Testnet genesis block data
var block = {
	blockHeight: 1,
	id: '6524861224470851795',
	generatorPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
	totalAmount: 10000000000000000,
	totalFee: 0
};

var testBlocksUnder101 = false;

describe.skip('GET /blocks (cache)', function () {

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

	describe('id', function () {

		it('using genesisblock id should return the result', function (done) {
			getBlocks('id=6524861224470851795', function (err, res) {
				node.expect(res.body).to.have.property('blocks').to.be.an('array').that.have.nested.property('0.id').equal('6524861224470851795');
				done();
			});
		});

		it('using unknown id should return empty blocks array', function (done) {
			getBlocks('id=9928719876370886655', function (err, res) {
				node.expect(res.body).to.have.property('blocks').to.be.an('array').and.to.be.empty;
				done();
			});
		});
	});

	describe('height', function () {

		it('using height should be ok', function (done) {
			getBlocks('height=' + block.blockHeight, function (err, res) {
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('blocks').that.is.an('array');
				node.expect(res.body).to.have.property('count').to.equal(1);
				node.expect(res.body.blocks.length).to.equal(1);
				node.expect(res.body.blocks[0]).to.have.property('id');
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
	});

	describe('generatorPublicKey', function () {

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
	});

	describe('orderBy', function () {

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

	describe('limit', function () {

		it('using string limit should fail', function (done) {
			var limit = 'one';
			var params = 'limit=' + limit;

			http.get('/api/blocks?' + params, function (err, res) {
				node.expect(res.body).to.have.property('error').to.equal('Expected type integer but found type string');
				done();
			});
		});

		it('using limit = -1 should fail', function (done) {
			var limit = -1;
			var params = 'limit=' + limit;

			http.get('/api/blocks?' + params, function (err, res) {
				node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 1');
				done();
			});
		});

		it('using limit = 0 should fail', function (done) {
			var limit = 0;
			var params = 'limit=' + limit;

			http.get('/api/blocks?' + params, function (err, res) {
				node.expect(res.body).to.have.property('error').to.equal('Value 0 is less than minimum 1');
				done();
			});
		});

		it('using limit = 1 should be ok', function (done) {
			var limit = 1;
			var params = 'limit=' + limit;

			http.get('/api/blocks?' + params, function (err, res) {
				node.expect(res.body).to.have.property('blocks').that.is.an('array').and.have.a.lengthOf.at.most(limit);
				done();
			});
		});

		it('using limit = 100 should be ok', function (done) {
			var limit = 100;
			var params = 'limit=' + limit;

			http.get('/api/blocks?' + params, function (err, res) {
				node.expect(res.body).to.have.property('blocks').that.is.an('array').and.have.a.lengthOf.at.most(limit);
				done();
			});
		});

		it('using limit > 100 should fail', function (done) {
			var limit = 101;
			var params = 'limit=' + limit;

			http.get('/api/blocks?' + params, function (err, res) {
				node.expect(res.body).to.have.property('error').to.equal('Value 101 is greater than maximum 100');
				done();
			});
		});
	});

	describe('offset', function () {

		it('using string offset should fail', function (done) {
			var offset = 'one';
			var params = 'offset=' + offset;

			http.get('/api/blocks?' + params, function (err, res) {
				node.expect(res.body).to.have.property('error').to.equal('Expected type integer but found type string');
				done();
			});
		});

		it('using offset = -1 should fail', function (done) {
			var offset = -1;
			var params = 'offset=' + offset;

			http.get('/api/blocks?' + params, function (err, res) {
				node.expect(res.body).to.have.property('error').to.equal('Value -1 is less than minimum 0');
				done();
			});
		});

		it('using offset = 1 should be ok', function (done) {
			var offset = 1;
			var params = 'offset=' + offset;

			node.onNewBlock(function () {
				http.get('/api/blocks?' + params, function (err, res) {
					node.expect(res.body).to.have.property('blocks').to.be.an('array').that.have.nested.property('0.height').to.be.above(1);
					done();
				});
			});
		});
	});
});
