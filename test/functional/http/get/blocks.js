'use strict';

var node = require('../../../node.js');
var modulesLoader = require('../../../common/modulesLoader');

var getBlocksPromise = require('../../../common/apiHelpers').getBlocksPromise;
var onNewBlockPromise = node.Promise.promisify(node.onNewBlock);

describe('GET /api/blocks', function () {

	// Testnet genesis block data
	var block = {
		blockHeight: 1,
		id: '6524861224470851795',
		generatorPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
		totalAmount: 10000000000000000,
		totalFee: 0
	};

	var testBlocksUnder101 = false;

	function expectValidNonEmptyBlocks (res) {
		node.expect(res.statusCode).equal(200);
		node.expect(res).to.have.nested.property('body.blocks').that.is.an('array').and.is.not.empty;
		node.expect(res).to.have.nested.property('body.blocks.0.id').to.be.a('string');
		node.expect(res).to.have.nested.property('body.blocks.0.totalAmount').to.be.a('number');
		node.expect(res).to.have.nested.property('body.blocks.0.totalFee').to.be.a('number');
		node.expect(res).to.have.nested.property('body.blocks.0.generatorId').to.be.a('string');
		node.expect(res).to.have.nested.property('body.blocks.0.blockSignature').to.be.a('string');
		node.expect(res).to.have.nested.property('body.blocks.0.height').to.be.a('number').and.to.be.at.least(1);
		if (res.body.blocks[0].height === 1) {
			node.expect(res).to.have.nested.property('body.blocks.0.previousBlock').to.be.null;
		} else {
			node.expect(res).to.have.nested.property('body.blocks.0.previousBlock').to.be.a('string');
		}
	}

	describe('from (cache)', function () {

		var cache;
		var url = '/api/blocks?';
		var getJsonForKeyPromise;

		before(function (done) {
			node.config.cacheEnabled = true;
			modulesLoader.initCache(function (err, __cache) {
				cache = __cache;
				getJsonForKeyPromise = node.Promise.promisify(cache.getJsonForKey);
				node.expect(err).to.not.exist;
				node.expect(__cache).to.be.an('object');
				return done(err);
			});
		});

		afterEach(function (done) {
			cache.flushDb(function (err, status) {
				node.expect(err).to.not.exist;
				node.expect(status).to.equal('OK');
				done(err);
			});
		});

		after(function (done) {
			cache.quit(done);
		});

		it('cache blocks by the url and parameters when response is a success', function () {
			var params = [
				'height=' + block.blockHeight
			];

			return getBlocksPromise(params).then(function (res) {
				node.expect(res).to.have.nested.property('body.blocks').that.is.an('array');
				// Check key in cache after, 0, 10, 100 ms, and if value exists in any of this time period we respond with success
				return node.Promise.all([0, 10, 100].map(function (delay) {
					return node.Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(url + params.join('&'));
					});
				})).then(function (responses) {
					node.expect(responses).to.deep.include(res.body);
				});
			});
		});

		it('should not cache if response is not a success', function () {
			var height = -1000;
			var params = [
				'height=' + height
			];

			return getBlocksPromise(params).then(function (res) {
				node.expect(res).to.have.nested.property('body.message').to.equal('Value ' + height + ' is less than minimum 1');
				return getJsonForKeyPromise(url + params.join('&')).then(function (response) {
					node.expect(response).to.eql(null);
				});
			});
		});

		it('should remove entry from cache on new block', function () {
			var auxResponse;
			var params = [
				'height=' + block.blockHeight
			];
			
			return getBlocksPromise(params)
				.then(function (res) {
					expectValidNonEmptyBlocks(res);
					auxResponse = res.body;
					// Check key in cache after, 0, 10, 100 ms, and if value exists in any of this time period we respond with success
					return node.Promise.all([0, 10, 100].map(function (delay) {
						return node.Promise.delay(delay).then(function () {
							return getJsonForKeyPromise(url + params.join('&'));
						});
					})).then(function (responses) {
						node.expect(responses).to.deep.include(auxResponse);
					});
				})
				.then(function () {
					return onNewBlockPromise();
				})
				.then(function () {
					return getJsonForKeyPromise(url + params.join('&'));
				})
				.then(function (result) {
					node.expect(result).to.eql(null);
				});
		});
	});

	describe('?', function () {

		describe('id', function () {

			it('using genesisblock id should return the result', function () {
				var id = '6524861224470851795';
				var params = [
					'id=' + id
				];

				return getBlocksPromise(params).then(function (res){
					expectValidNonEmptyBlocks(res);
					node.expect(res).to.have.nested.property('body.blocks').to.be.an('array').that.have.nested.property('0.id').equal(id);
				});
			});

			it('using unknown id should return empty blocks array', function () {
				var id = '9928719876370886655';
				var params = [
					'id=' + id
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res.statusCode).equal(200);
					node.expect(res).to.have.nested.property('body.blocks').to.be.an('array').and.to.be.empty;
				});
			});
		});

		describe('height', function () {

			it('using correct params should be ok', function () {
				var params = [
					'height=' + block.blockHeight
				];

				return getBlocksPromise(params).then(function (res){
					expectValidNonEmptyBlocks(res);
					node.expect(res).to.have.nested.property('body.blocks.0.height').to.be.a('number').equal(block.blockHeight);
				});
			});

			it('using < 100 should be ok', function () {
				if (!testBlocksUnder101) {
					return this.skip();
				}
				var params = [
					'height=' + 10
				];

				return getBlocksPromise(params).then(function (res) {
					expectValidNonEmptyBlocks(res.body);
					node.expect(res).to.have.nested.property('body.blocks.0.height').to.be.a('number').equal(10);
				});
			});
		});

		describe('generatorPublicKey', function () {

			it('using correct params should be ok', function () {
				var params = [
					'generatorPublicKey=' + block.generatorPublicKey
				];

				return getBlocksPromise(params).then(function (res) {
					expectValidNonEmptyBlocks(res);
					for (var i = 0; i < res.body.blocks.length; i++) {
						node.expect(res.body.blocks[i].generatorPublicKey).to.equal(block.generatorPublicKey);
					}
				});
			});
		});

		describe('totalFee', function () {

			it('using correct params should be ok', function () {
				var params = [
					'totalFee=' + block.totalFee
				];

				return getBlocksPromise(params).then(function (res) {
					expectValidNonEmptyBlocks(res);
					for (var i = 0; i < res.body.blocks.length; i++) {
						node.expect(res.body.blocks[i].totalFee).to.equal(block.totalFee);
					}
				});
			});
		});

		describe('sort', function () {

			it('using "height:asc" should be ok', function () {
				var params = [
					'sort=' + 'height:asc'
				];

				return getBlocksPromise(params).then(function (res) {
					expectValidNonEmptyBlocks(res);
					for (var i = 0; i < res.body.blocks.length; i++) {
						if (res.body.blocks[i + 1] != null) {
							node.expect(res.body.blocks[i].height).to.be.below(res.body.blocks[i + 1].height);
						}
					}
				});
			});

			it('using "height:desc" should be ok', function () {
				var params = [
					'sort=' + 'height:desc'
				];

				return getBlocksPromise(params).then(function (res) {
					expectValidNonEmptyBlocks(res);
					for (var i = 0; i < res.body.blocks.length; i++) {
						if (res.body.blocks[i + 1] != null) {
							node.expect(res.body.blocks[i].height).to.be.above(res.body.blocks[i + 1].height);
						}
					}
				});
			});

			it('using empty params should sort results by descending height', function () {
				var params = [];

				return getBlocksPromise(params).then(function (res) {
					for (var i = 0; i < res.body.blocks.length; i++) {
						if (res.body.blocks[i + 1] != null) {
							node.expect(res.body.blocks[i].height).to.be.above(res.body.blocks[i + 1].height);
						}
					}
				});
			});
		});

		describe('limit', function () {

			it('using string should return bad request response', function () {
				var limit = 'one';
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res.statusCode).equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Expected type integer but found type string');
				});
			});

			it('using -1 should return bad request response', function () {
				var limit = -1;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res.statusCode).equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Value -1 is less than minimum 1');
				});
			});

			it('using 0 should return bad request response', function () {
				var limit = 0;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res.statusCode).equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Value 0 is less than minimum 1');
				});
			});

			it('using 1 should be ok', function () {
				var limit = 1;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					expectValidNonEmptyBlocks(res);
					node.expect(res).to.have.nested.property('body.blocks').that.is.an('array').and.have.a.lengthOf.at.most(limit);
				});
			});

			it('using 100 should be ok', function () {
				var limit = 100;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res) {
					expectValidNonEmptyBlocks(res);
					node.expect(res).to.have.nested.property('body.blocks').that.is.an('array').and.have.a.lengthOf.at.most(limit);
				});
			});

			it('using > 100 should return bad request response', function () {
				var limit = 101;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res.statusCode).equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Value 101 is greater than maximum 100');
				});
			});
		});

		describe('offset', function () {

			it('using string should return bad request response', function () {
				var offset = 'one';
				var params = [
					'offset=' + offset
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res.statusCode).equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Expected type integer but found type string');
				});
			});

			it('using -1 should return bad request response', function () {
				var offset = -1;
				var params = [
					'offset=' + offset
				];

				return getBlocksPromise(params).then(function (res) {
					node.expect(res.statusCode).equal(400);
					node.expect(res).to.have.nested.property('body.message').to.equal('Value -1 is less than minimum 0');
				});
			});

			it('using 1 should be ok', function () {
				var offset = 1;
				var params = [
					'offset=' + offset
				];

				return getBlocksPromise(params).then(function (res) {
					expectValidNonEmptyBlocks(res);
					node.expect(res).to.have.nested.property('body.blocks').to.be.an('array').that.have.nested.property('0.height').to.be.above(1);
				});
			});
		});
	});
});
