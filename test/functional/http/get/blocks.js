'use strict';

require('../../functional.js');

var node = require('../../../node.js');
var modulesLoader = require('../../../common/modulesLoader');

var getBlocksPromise = require('../../../common/apiHelpers').getBlocksPromise;
var onNewBlockPromise = node.Promise.promisify(node.onNewBlock);
var swaggerEndpoint = require('../../../common/swaggerSpec');
var apiHelpers = require('../../../common/apiHelpers');
var expectSwaggerParamError = apiHelpers.expectSwaggerParamError;
var _ = node._;

describe('GET /blocks', function () {

	var blocksEndpoint = new swaggerEndpoint('GET /blocks');

	// Testnet genesis block data
	var block = {
		blockHeight: 1,
		id: '6524861224470851795',
		generatorPublicKey: 'c96dec3595ff6041c3bd28b76b8cf75dce8225173d1bd00241624ee89b50f2a8',
		totalAmount: 10000000000000000,
		totalFee: 0
	};

	var testBlocksUnder101 = false;

	function expectHeightCheck (res) {
		res.body.data.forEach(function (block) {
			if (block.height === 1) {
				block.previousBlockId.should.be.empty;
			}
		});
	}

	describe('from (cache)', function () {

		var cache;
		var url = blocksEndpoint.getPath() + '?';
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
			var initialResponse = null;

			return blocksEndpoint.makeRequest({height: block.blockHeight}, 200).then(function (res) {
				expectHeightCheck(res);
				initialResponse = res;
				return node.Promise.all([0, 10, 100].map(function (delay) {
					return node.Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(url + params.join('&'));
					});
				}));
			}).then(function (responses) {
				responses.should.deep.include(initialResponse.body);
			});
		});

		it('should not cache if response is not a success', function () {
			var params = [
				'height=' + -100
			];
			var initialResponse = null;

			return blocksEndpoint.makeRequest({height: -100}, 400).then(function (res) {
				expectSwaggerParamError(res, 'height');
				initialResponse = res;
				return getJsonForKeyPromise(url + params.join('&'));
			}).then(function (response) {
				node.expect(response).to.eql(null);
			});
		});

		it('should remove entry from cache on new block', function () {
			var params = [
				'height=' + block.blockHeight
			];
			var initialResponse = null;

			return blocksEndpoint.makeRequest({height: block.blockHeight}, 200).then(function (res) {
				expectHeightCheck(res);
				initialResponse = res;
				return node.Promise.all([0, 10, 100].map(function (delay) {
					return node.Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(url + params.join('&'));
					});
				}));
			}).then(function (responses) {
				responses.should.deep.include(initialResponse.body);
			}).then(function () {
				return onNewBlockPromise();
			}).then(function () {
				return getJsonForKeyPromise(url + params.join('&'));
			}).then(function (result) {
				node.expect(result).to.eql(null);
			});
		});
	});

	describe('?', function () {

		describe('blockId', function () {

			it('using invalid blockId = "InvalidId" format should fail with error', function () {
				return blocksEndpoint.makeRequest({blockId: 'InvalidId'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'blockId');
				});
			});

			it('using genesisblock id should return the result', function () {
				var id = '6524861224470851795';

				return blocksEndpoint.makeRequest({blockId: id}, 200).then(function (res) {
					res.body.data[0].id.should.equal(id);
					expectHeightCheck(res);
				});
			});

			it('using unknown id should return empty blocks array', function () {
				return blocksEndpoint.makeRequest({blockId: '9928719876370886655'}, 200).then(function (res) {
					res.body.data.should.be.empty;
					expectHeightCheck(res);
				});
			});
		});

		describe('height', function () {

			it('using invalid height = 0 should fail with error', function () {
				return blocksEndpoint.makeRequest({height: 0}, 400).then(function (res) {
					expectSwaggerParamError(res, 'height');
				});
			});

			it('using invalid height = -1 should fail with error', function () {
				return blocksEndpoint.makeRequest({height: 0}, 400).then(function (res) {
					expectSwaggerParamError(res, 'height');
				});
			});

			it('using correct params should be ok', function () {
				return blocksEndpoint.makeRequest({height: block.blockHeight}, 200).then(function (res) {
					res.body.data[0].height.should.equal(block.blockHeight);
					expectHeightCheck(res);
				});
			});

			it('using < 100 should be ok', function () {
				if (!testBlocksUnder101) {
					return this.skip();
				}

				return blocksEndpoint.makeRequest({height: 10}, 200).then(function (res) {
					res.body.data[0].height.should.equal(10);
					expectHeightCheck(res);
				});
			});
		});

		describe('generatorPublicKey', function () {

			it('using invalid generatorPublicKey = "InvalidKey" format should fail with error', function () {
				return blocksEndpoint.makeRequest({generatorPublicKey: 'InvalidKey'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'generatorPublicKey');
				});
			});

			it('using correct params should be ok', function () {
				return blocksEndpoint.makeRequest({generatorPublicKey: block.generatorPublicKey}, 200).then(function (res) {
					res.body.data[0].generatorPublicKey.should.equal(block.generatorPublicKey);
					expectHeightCheck(res);
				});
			});
		});

		describe('sort', function () {

			describe('height', function () {

				it('using "height:asc" should be ok', function () {
					return blocksEndpoint.makeRequest({sort: 'height:asc'}, 200).then(function (res) {
						expectHeightCheck(res);
						_(res.body.data).map('height').sortNumbers().should.be.eql(_.map(res.body.data, 'height'));
					});
				});

				it('using "height:desc" should be ok', function () {
					return blocksEndpoint.makeRequest({sort: 'height:desc'}, 200).then(function (res) {
						expectHeightCheck(res);
						_(res.body.data).map('height').sortNumbers('desc').should.be.eql(_.map(res.body.data, 'height'));
					});
				});

				it('using empty params should sort results by descending height', function () {
					return blocksEndpoint.makeRequest({}, 200).then(function (res) {
						expectHeightCheck(res);
						_(res.body.data).map('height').sortNumbers('desc').should.be.eql(_.map(res.body.data, 'height'));
					});
				});
			});

			describe('totalAmount', function () {

				it('using "totalAmount:asc" should be ok', function () {
					return blocksEndpoint.makeRequest({sort: 'totalAmount:asc'}, 200).then(function (res) {
						expectHeightCheck(res);
						_(res.body.data).map('totalAmount').map(_.toInteger).sortNumbers().should.be.eql(_(res.body.data).map('totalAmount').map(_.toInteger).value());
					});
				});

				it('using "totalAmount:desc" should be ok', function () {
					return blocksEndpoint.makeRequest({sort: 'totalAmount:desc'}, 200).then(function (res) {
						expectHeightCheck(res);
						_(res.body.data).map('totalAmount').map(_.toInteger).sortNumbers('desc').should.be.eql(_(res.body.data).map('totalAmount').map(_.toInteger).value());
					});
				});
			});

			describe('totalFee', function () {

				it('using "totalFee:asc" should be ok', function () {
					return blocksEndpoint.makeRequest({sort: 'totalFee:asc'}, 200).then(function (res) {
						expectHeightCheck(res);
						_(res.body.data).map('totalFee').map(_.toInteger).sortNumbers().should.be.eql(_(res.body.data).map('totalFee').map(_.toInteger).value());
					});
				});

				it('using "totalFee:desc" should be ok', function () {
					return blocksEndpoint.makeRequest({sort: 'totalFee:desc'}, 200).then(function (res) {
						expectHeightCheck(res);
						_(res.body.data).map('totalFee').map(_.toInteger).sortNumbers('desc').should.be.eql(_(res.body.data).map('totalFee').map(_.toInteger).value());
					});
				});
			});

			describe('timestamp', function () {

				it('using "timestamp:asc" should be ok', function () {
					return blocksEndpoint.makeRequest({sort: 'timestamp:asc'}, 200).then(function (res) {
						expectHeightCheck(res);
						_(res.body.data).map('timestamp').sortNumbers().should.be.eql(_.map(res.body.data, 'timestamp'));
					});
				});

				it('using "timestamp:desc" should be ok', function () {
					return blocksEndpoint.makeRequest({sort: 'timestamp:desc'}, 200).then(function (res) {
						expectHeightCheck(res);
						_(res.body.data).map('timestamp').sortNumbers('desc').should.be.eql(_.map(res.body.data, 'timestamp'));
					});
				});
			});
		});

		describe('limit', function () {

			it('using string should return bad request response', function () {
				return blocksEndpoint.makeRequest({limit: 'one'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using -1 should return bad request response', function () {
				return blocksEndpoint.makeRequest({limit: -1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using 0 should return bad request response', function () {
				return blocksEndpoint.makeRequest({limit: 0}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});

			it('using 1 should be ok', function () {
				return blocksEndpoint.makeRequest({limit: 1}, 200).then(function (res) {
					res.body.data.should.have.length(1);
				});
			});

			it('using 100 should be ok', function () {
				return blocksEndpoint.makeRequest({limit: 100}, 200).then(function (res) {
					res.body.data.length.should.be.at.most(100);
				});
			});

			it('using > 100 should return bad request response', function () {
				return blocksEndpoint.makeRequest({limit: 101}, 400).then(function (res) {
					expectSwaggerParamError(res, 'limit');
				});
			});
		});

		describe('offset', function () {

			it('using string should return bad request response', function () {
				return blocksEndpoint.makeRequest({offset: 'one'}, 400).then(function (res) {
					expectSwaggerParamError(res, 'offset');
				});
			});

			it('using -1 should return bad request response', function () {
				return blocksEndpoint.makeRequest({offset: -1}, 400).then(function (res) {
					expectSwaggerParamError(res, 'offset');
				});
			});

			it('using 1 should be ok', function () {
				return blocksEndpoint.makeRequest({offset: 1}, 200).then(function (res) {
					res.body.data[0].height.should.be.above(1);
				});
			});
		});
	});
});
