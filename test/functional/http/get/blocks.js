'use strict';

var node = require('../../../node.js');
var http = require('../../../common/httpCommunication.js');
var modulesLoader = require('../../../common/modulesLoader');

var getTransactionsPromise = require('../../../common/apiHelpers').getTransactionsPromise;
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

	describe('/ from (cache)', function () {

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
				node.expect(res).to.have.property('blocks').that.is.an('array');
				return getJsonForKeyPromise(url + params.join('&')).then(function (response) {
					node.expect(res).to.eql(response);
				});
			});
		});

		it('should not cache if response is not a success', function () {
			var height = -1000;
			var params = [
				'height=' + height
			];

			return getBlocksPromise(params).then(function (res) {
				node.expect(res).to.have.property('message').to.equal('Value ' + height + ' is less than minimum 1');
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
					node.expect(res).to.have.property('blocks').that.is.an('array');
					auxResponse = res;
					return getJsonForKeyPromise(url + params.join('&'));
				})
				.then(function (response) {
					node.expect(auxResponse).to.eql(response);
					return onNewBlockPromise();
				})
				.then(function (response) {
					return getJsonForKeyPromise(url + params.join('&'));
				})
				.then(function (result) {
					node.expect(result).to.eql(null);
				});
		});
	});

	describe('/', function () {

		describe('id', function () {

			it('using genesisblock id should return the result', function () {
				var id = '6524861224470851795';
				var params = [
					'id=' + id
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('blocks').to.be.an('array').that.have.nested.property('0.id').equal(id);
				});
			});

			it('using unknown id should return empty blocks array', function () {
				var id = '9928719876370886655';
				var params = [
					'id=' + id
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('blocks').to.be.an('array').and.to.be.empty;
				});
			});
		});

		describe('height', function () {

			it('using correct params should be ok', function () {
				var params = [
					'height=' + block.blockHeight
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('blocks').that.is.an('array');
					node.expect(res.blocks.length).to.equal(1);
					node.expect(res.blocks[0]).to.have.property('id');
					node.expect(res.blocks[0]).to.have.property('previousBlock');
					node.expect(res.blocks[0]).to.have.property('totalAmount');
					node.expect(res.blocks[0]).to.have.property('totalFee');
					node.expect(res.blocks[0]).to.have.property('generatorId');
					node.expect(res.blocks[0]).to.have.property('confirmations');
					node.expect(res.blocks[0]).to.have.property('blockSignature');
					node.expect(res.blocks[0]).to.have.property('numberOfTransactions');
					node.expect(res.blocks[0].height).to.equal(block.blockHeight);
					block.id = res.blocks[0].id;
					block.generatorPublicKey = res.blocks[0].generatorPublicKey;
					block.totalAmount = res.blocks[0].totalAmount;
					block.totalFee = res.blocks[0].totalFee;
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
					node.expect(res).to.have.property('blocks').that.is.an('array');
					node.expect(res.blocks.length).to.equal(1);
					node.expect(res.blocks[0]).to.have.property('previousBlock');
					node.expect(res.blocks[0]).to.have.property('totalAmount');
					node.expect(res.blocks[0]).to.have.property('totalFee');
					node.expect(res.blocks[0]).to.have.property('generatorId');
					node.expect(res.blocks[0]).to.have.property('confirmations');
					node.expect(res.blocks[0]).to.have.property('blockSignature');
					node.expect(res.blocks[0]).to.have.property('numberOfTransactions');
					node.expect(res.blocks[0].height).to.equal(10);
					block.id = res.blocks[0].id;
					block.generatorPublicKey = res.blocks[0].generatorPublicKey;
					block.totalAmount = res.blocks[0].totalAmount;
					block.totalFee = res.blocks[0].totalFee;
				});
			});
		});

		describe('generatorPublicKey', function () {

			it('using correct params should be ok', function () {
				var params = [
					'generatorPublicKey=' + block.generatorPublicKey
				];

				return getBlocksPromise(params).then(function (res) {
					node.expect(res).to.have.property('blocks').that.is.an('array');
					for (var i = 0; i < res.blocks.length; i++) {
						node.expect(res.blocks[i].generatorPublicKey).to.equal(block.generatorPublicKey);
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
					node.expect(res).to.have.property('blocks').that.is.an('array');
					for (var i = 0; i < res.blocks.length; i++) {
						node.expect(res.blocks[i].totalFee).to.equal(block.totalFee);
					}
				});
			});
		});

		describe('orderBy', function () {

			it('using "height:asc" should be ok', function () {
				var params = [
					'orderBy=' + 'height:asc'
				];

				return getBlocksPromise(params).then(function (res) {
					node.expect(res).to.have.property('blocks').that.is.an('array');
					for (var i = 0; i < res.blocks.length; i++) {
						if (res.blocks[i + 1] != null) {
							node.expect(res.blocks[i].height).to.be.below(res.blocks[i + 1].height);
						}
					}
				});
			});

			it('using "height:desc" should be ok', function () {
				var params = [
					'orderBy=' + 'height:desc'
				];

				return getBlocksPromise(params).then(function (res) {
					node.expect(res).to.have.property('blocks').that.is.an('array');
					for (var i = 0; i < res.blocks.length; i++) {
						if (res.blocks[i + 1] != null) {
							node.expect(res.blocks[i].height).to.be.above(res.blocks[i + 1].height);
						}
					}
				});
			});

			it('using empty params should be ordered by "height:desc" by default', function () {
				var params = [];

				return getBlocksPromise(params).then(function (res) {
					node.expect(res).to.have.property('blocks').that.is.an('array');
					for (var i = 0; i < res.blocks.length; i++) {
						if (res.blocks[i + 1] != null) {
							node.expect(res.blocks[i].height).to.be.above(res.blocks[i + 1].height);
						}
					}
				});
			});
		});

		describe('limit', function () {

			it('using string should fail', function () {
				var limit = 'one';
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('message').to.equal('Expected type integer but found type string');
				});
			});

			it('using -1 should fail', function () {
				var limit = -1;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('message').to.equal('Value -1 is less than minimum 1');
				});
			});

			it('using 0 should fail', function () {
				var limit = 0;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('message').to.equal('Value 0 is less than minimum 1');
				});
			});

			it('using 1 should be ok', function () {
				var limit = 1;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('blocks').that.is.an('array').and.have.a.lengthOf.at.most(limit);
				});
			});

			it('using 100 should be ok', function () {
				var limit = 100;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('blocks').that.is.an('array').and.have.a.lengthOf.at.most(limit);
				});
			});

			it('using > 100 should fail', function () {
				var limit = 101;
				var params = [
					'limit=' + limit
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('message').to.equal('Value 101 is greater than maximum 100');
				});
			});
		});

		describe('offset', function () {

			it('using string should fail', function () {
				var offset = 'one';
				var params = [
					'offset=' + offset
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('message').to.equal('Expected type integer but found type string');
				});
			});

			it('using -1 should fail', function () {
				var offset = -1;
				var params = [
					'offset=' + offset
				];

				return getBlocksPromise(params).then(function (res){
					node.expect(res).to.have.property('message').to.equal('Value -1 is less than minimum 0');
				});
			});

			it('using 1 should be ok', function () {
				var offset = 1;
				var params = [
					'offset=' + offset
				];

				return onNewBlockPromise().then(function (res){
					return getBlocksPromise(params).then(function (res){
						node.expect(res).to.have.property('blocks').to.be.an('array').that.have.nested.property('0.height').to.be.above(1);
					});
				});
			});
		});
	});

	describe('codes', function () {

		describe('when query is malformed', function () {

			var invalidParams = 'height="invalidValue"';

			it('should return http code = 400', function (done) {
				http.get('/api/blocks?' + invalidParams, function (err, res) {
					node.expect(res).to.have.property('status').equal(400);
					done();
				});
			});
		});

		describe('when query does not return results', function () {

			var notExistingId = '01234567890123456789';
			var emptyResultParams = 'id=' + notExistingId;

			it('should return http code = 200', function (done) {
				http.get('/api/blocks?' + emptyResultParams, function (err, res) {
					node.expect(res).to.have.property('status').equal(200);
					done();
				});
			});
		});

		describe('when query returns results', function () {

			it('should return http code = 200', function (done) {
				http.get('/api/blocks', function (err, res) {
					node.expect(res).to.have.property('status').equal(200);
					done();
				});
			});
		});
	});
});