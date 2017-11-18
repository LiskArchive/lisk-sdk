'use strict';

var _ = require('lodash');
var node = require('../../../node.js');
var modulesLoader = require('../../../common/modulesLoader');
var constants = require('../../../../helpers/constants');
var genesisDelegates = require('../../../genesisDelegates.json');

var creditAccountPromise = require('../../../common/apiHelpers').creditAccountPromise;
var sendTransactionPromise = require('../../../common/apiHelpers').sendTransactionPromise;
var getForgingStatusPromise = require('../../../common/apiHelpers').getForgingStatusPromise;
var getDelegatesPromise = require('../../../common/apiHelpers').getDelegatesPromise;
var putForgingDelegatePromise = require('../../../common/apiHelpers').putForgingDelegatePromise;
var getForgersPromise = require('../../../common/apiHelpers').getForgersPromise;
var onNewBlockPromise = node.Promise.promisify(node.onNewBlock);
var onNewRoundPromise = node.Promise.promisify(node.onNewRound);

describe('GET /api/delegates', function () {

	var validDelegate = genesisDelegates.delegates[0];
	var validNotExistingPublicKey = 'addb0e15a44b0fdc6ff291be28d8c98f5551d0cd9218d749e30ddb87c6e31ca8';

	function expectValidDelegate (delegate) {
		node.expect(delegate).to.have.property('username').that.is.a('string');
		node.expect(delegate).to.have.property('address').that.is.a('string');
		node.expect(delegate).to.have.property('publicKey').that.is.a('string');
		node.expect(delegate).to.have.property('vote').that.is.a('string');
		node.expect(delegate).to.have.property('rewards').that.is.a('string');
		node.expect(delegate).to.have.property('producedBlocks').that.is.a('string');
		node.expect(delegate).to.have.property('missedBlocks').that.is.a('string');
		node.expect(delegate).to.have.property('rank').that.is.a('number');
		node.expect(delegate).to.have.property('approval').that.is.a('number');
		node.expect(delegate).to.have.property('productivity').that.is.a('number');
	}

	describe('from (cache)', function () {

		var cache;
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

		it('should cache delegates when response is successful', function () {
			var url;
			url = '/api/delegates';
			var params = [];

			return getDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('delegates').that.is.an('array');
				// Check key in cache after, 0, 10, 100 ms, and if value exists in any of this time period we respond with success
				return node.Promise.all([0, 10, 100].map(function (delay) {
					return node.Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(url + params.join('&'));
					});
				})).then(function (responses) {
					node.expect(responses).to.deep.include(res);
				});
			});
		});

		it('should not cache delegates when response is unsuccessful', function () {
			var url, params;
			url = '/api/delegates?';
			params = [
				'invalidParam=true',
			];

			return getDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('message').to.equal('Account#getAll error');

				return getJsonForKeyPromise(url + params.join('&')).then(function (response) {
					node.expect(response).to.eql(null);
				});
			});
		});

		it('should flush cache on the next round @slow', function () {
			var url;
			url = '/api/delegates';
			var params = [];

			return getDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('delegates').that.is.an('array');

				// Check key in cache after, 0, 10, 100 ms, and if value exists in any of this time period we respond with success
				return node.Promise.all([0, 10, 100].map(function (delay) {
					return node.Promise.delay(delay).then(function () {
						return getJsonForKeyPromise(url + params.join('&'));
					});
				})).then(function (responses) {
					node.expect(responses).to.deep.include(res);
					return onNewRoundPromise().then(function () {
						return getJsonForKeyPromise(url).then(function (result) {
							node.expect(result).to.eql(null);
						});
					});
				});
			});
		});
	});

	describe('/', function () {

		it('using no params should return all genesis delegates', function () {
			var params = [];

			return getDelegatesPromise(params).then(function (res) {
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
				res.delegates.forEach(expectValidDelegate);
			});
		});

		describe('publicKey', function () {

			it('using no publicKey should return an empty array', function () {
				var params = [
					'publicKey='
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').to.be.an('array').that.is.empty;
				});
			});

			it('using invalid publicKey should fail', function () {
				var params = [
					'publicKey=' + 'invalidPublicKey'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Object didn\'t pass validation for format publicKey: invalidPublicKey');
				});
			});

			it('using valid existing publicKey of genesis delegate should return the result', function () {
				var params = [
					'publicKey=9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.nested.property('delegates.0.publicKey').equal(validDelegate.publicKey);
				});
			});

			it('using valid not existing publicKey should return an empty array', function () {
				var params = [
					'publicKey=' + validNotExistingPublicKey
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').to.be.an('array').that.is.empty;
				});
			});
		});

		describe.skip('secondPublicKey', function () {

			var secondSecretAccount = node.randomAccount();

			before(function () {
				return creditAccountPromise(secondSecretAccount.address, constants.fees.secondSignature).then(function () {
					return onNewBlockPromise().then(function () {
						var transaction = node.lisk.signature.createSignature(secondSecretAccount.password, secondSecretAccount.secondPassword);
						return sendTransactionPromise(transaction).then(function (res) {
							node.expect(res).to.have.property('success').to.be.ok;
							node.expect(res).to.have.property('transactionId').to.equal(transaction.id);
							return onNewBlockPromise();
						});
					});
				});
			});

			it('using no secondPublicKey should return an empty array', function () {
				var params = [
					'secondPublicKey='
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').to.be.an('array').that.is.empty;
				});
			});

			it('using invalid secondPublicKey should fail', function () {
				var params = [
					'secondPublicKey=' + 'invalidAddress'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Object didn\'t pass validation for format publicKey: invalidAddress');
				});
			});

			it('using valid existing secondPublicKey of genesis delegate should return the result', function () {
				var params = [
					'secondPublicKey=' + secondSecretAccount.secondPublicKey
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.nested.property('delegates.0.secondPublicKey').equal(secondSecretAccount.secondPublicKey);
				});
			});

			it('using valid not existing secondPublicKey should return an empty array', function () {
				var params = [
					'secondPublicKey=' + validNotExistingPublicKey
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').to.be.an('array').that.is.empty;
				});
			});
		});

		describe('address', function () {

			it('using no address should return a schema error', function () {
				var params = [
					'address='
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('String is too short (0 chars), minimum 1');
				});
			});

			it('using invalid address should fail', function () {
				var params = [
					'address=' + 'invalidAddress'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Object didn\'t pass validation for format address: invalidAddress');
				});
			});

			it('using valid existing address of genesis delegate should return the result', function () {
				var params = [
					'address=' + validDelegate.address
				];
				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.nested.property('delegates.0.address').equal(validDelegate.address);
				});
			});

			it('using valid not existing address should return an empty array', function () {
				var validNotExistingAddress = '1111111111111111111L';
				var params = [
					'address=' + validNotExistingAddress
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').to.be.an('array').that.is.empty;
				});
			});
		});

		describe('username', function () {

			it('using no username should return a schema error', function () {
				var params = [
					'username='
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('String is too short (0 chars), minimum 1');
				});
			});

			it('using invalid username should fail', function () {
				var usernameAsNumber = 1;
				var params = [
					'username=' + usernameAsNumber
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Expected type string but found type integer');
				});
			});

			it('using valid existing username of genesis delegate should return the result', function () {
				var params = [
					'username=' + validDelegate.username
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.nested.property('delegates.0.username').equal(validDelegate.username);
				});
			});

			it('using valid not existing username should return an empty array', function () {
				var validNotExistingUsername = 'unknownusername';
				var params = [
					'username=' + validNotExistingUsername
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').to.be.an('array').that.is.empty;
				});
			});
		});

		describe('search', function () {

			it('using blank criteria should fail', function () {
				var params = [
					'search='
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('String is too short (0 chars), minimum 1');
				});
			});

			it('using the special match all character should return all results', function () {
				var params = [
					'search=' + '%' // 1 character
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.length.of.at.least(101);
				});
			});

			it('using valid criteria with length=1 should be ok', function () {
				var params = [
					'search=' + 'g' // 1 character
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array');
				});
			});

			it('using criteria with length=20 should be ok', function () {
				var params = [
					'search=' + 'genesis_123456789012' // 20 characters
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array');
				});
			});

			it('using criteria with length > 20 should fail', function () {
				var params = [
					'search=' + 'genesis_1234567890123' // 21 characters
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message');
				});
			});

			it('using critera="genesis_1" should return 13 delegates', function () {
				var params = [
					'search=' + 'genesis_1'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.a.lengthOf(13);
				});
			});

			it('using critera="genesis_10" should return 3 delegates', function () {
				var params = [
					'search=' + 'genesis_10'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.a.lengthOf(3);
				});
			});

			it('using critera="genesis_101" should return 1 delegate', function () {
				var params = [
					'search=' + 'genesis_101'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.a.lengthOf(1);
				});
			});

			it('using critera="genesis_101" should have all properties', function () {
				var params = [
					'search=' + 'genesis_101'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.length(1);
					expectValidDelegate(res.delegates[0]);
				});
			});

			it('using no limit should return 101 delegates', function () {
				var params = [
					'search=' + 'genesis_'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.a.lengthOf(101);
				});
			});

			it('using string limit should fail', function () {
				var params = [
					'search=' + 'genesis_',
					'limit=' + 'one'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Expected type number but found type string');
				});
			});

			it('using limit=-1 should fail', function () {
				var params = [
					'search=' + 'genesis_',
					'limit=' + -1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Value -1 is less than minimum 1');
				});
			});

			it('using limit=0 should fail', function () {
				var params = [
					'search=' + 'genesis_',
					'limit=' + 0
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Value 0 is less than minimum 1');
				});
			});

			it('using limit=1 should return one result', function () {
				var params = [
					'search=' + 'genesis_',
					'limit=' + 1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.a.lengthOf(1);
				});
			});

			it('using limit=101 should return at least 101 results', function () {
				var params = [
					'search=' + 'genesis_',
					'limit=' + 101
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.length.of.at.most(101);
				});
			});

			it('using limit > 101 should fail', function () {
				var params = [
					'search=' + 'genesis_',
					'limit=' + 102
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').equal('Value 102 is greater than maximum 101');
				});
			});

			it('using sort="unknown:asc" should return results in random order', function () {
				var params = [
					'search=' + 'genesis_',
					'sort=' + 'unknown:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').to.be.an('array');
				});
			});

			it('using sort="username:asc" should sort results in ascending order', function () {
				var params = [
					'search=' + 'genesis_',
					'sort=' + 'username:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.length(101);
					node.expect(res.delegates[0]).to.have.property('username');
					node.expect(res.delegates[0].username).to.equal('genesis_1');
					node.expect(res.delegates[24]).to.have.property('username');
					node.expect(res.delegates[24].username).to.equal('genesis_3');
				});
			});

			it('using sort="username:desc" should sort results in descending order', function () {
				var params = [
					'search=' + 'genesis_',
					'sort=' + 'username:desc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.length(101);
					node.expect(res.delegates[0]).to.have.property('username');
					node.expect(res.delegates[0].username).to.equal('genesis_99');
					node.expect(res.delegates[24]).to.have.property('username');
					node.expect(res.delegates[24].username).to.equal('genesis_77');
				});
			});
		});

		describe('sort', function () {

			it('using sort="unknown:asc" should not sort results', function () {
				var params = [
					'sort=' + 'unknown:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').to.be.an('array');
				});
			});

			it('using sort="rank:asc" should sort results in ascending order', function () {
				var params = [
					'sort=' + 'rank:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.length.of.at.least(101);
					node.expect(_(res.delegates).sortBy('rank').map('rank').value()).to.be.eql(_.map(res.delegates, 'rank'));
				});
			});

			it('using sort="rank:desc" should sort results in descending order', function () {
				var params = [
					'sort=' + 'rank:desc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.length.of.at.least(101);
					node.expect(_(res.delegates).sortBy('rank').reverse().map('rank').value()).to.be.eql(_.map(res.delegates, 'rank'));
				});
			});

			it('using sort="username:asc" should sort results in ascending order', function () {
				var params = [
					'sort=' + 'username:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.length.of.at.least(101);
					node.expect(_(res.delegates).sortBy('username').map('username').value()).to.be.eql(_.map(res.delegates, 'username'));
				});
			});

			it('using sort="username:desc" should sort results in descending order', function () {
				var params = [
					'sort=' + 'username:desc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.length.of.at.least(101);
					node.expect(_(res.delegates).sortBy('username').map('username').reverse().value()).to.be.eql(_.map(res.delegates, 'username'));
				});
			});

			it('using sort="missedBlocks:asc" should sort results in ascending order', function () {
				var params = [
					'sort=' + 'missedBlocks:asc'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.length.of.at.least(101);
					node.expect(_(res.delegates).sortBy('missedBlocks').map('missedBlocks').value()).to.be.eql(_.map(res.delegates, 'missedBlocks'));
				});
			});

			it('using sort="missedBlocks:desc" should sort results in descending order', function () {
				var params = [
					'sort=' + 'missedBlocks:desc'
				];

				return getDelegatesPromise(params).then(function (res) {
					var testOnlyOneChars = function (prop) {return prop.length === 1;};
					node.expect(res).to.have.property('delegates').that.is.an('array').and.have.length.of.at.least(101);
					node.expect(_(res.delegates)
						.sortBy('missedBlocks')
						.map('missedBlocks')
						.filter(testOnlyOneChars)
						.reverse()
						.value())
						.to.be.eql(_(res.delegates)
							.map('missedBlocks')
							.filter(testOnlyOneChars)
							.value()
						);
				});
			});
		});

		describe('limit', function () {

			it('using string limit should fail', function () {
				var params = [
					'limit=' + 'one'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').to.equal('Expected type number but found type string');
				});
			});

			it('using limit=-1 should fail', function () {
				var params = [
					'limit=' + -1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').to.equal('Value -1 is less than minimum 1');
				});
			});

			it('using limit=0 should fail', function () {
				var params = [
					'limit=' + 0
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').to.equal('Value 0 is less than minimum 1');
				});
			});

			it('using limit=1 should be ok', function () {
				var params = [
					'limit=' + 1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(1);
				});
			});

			it('using limit=101 should be ok', function () {
				var params = [
					'limit=' + 101
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf(101);
				});
			});

			it('using limit > 101 should fail', function () {
				var params = [
					'limit=' + 102
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').to.equal('Value 102 is greater than maximum 101');
				});
			});
		});

		describe('offset', function () {

			it('using string offset should fail', function () {
				var params = [
					'offset=' + 'one'
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').to.equal('Expected type number but found type string');
				});
			});

			it('using offset=1 should be ok', function () {
				var params = [
					'offset=' + 1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('delegates').that.is.an('array');
					node.expect(res.delegates).to.have.lengthOf.at.least(99);
				});
			});

			it('using offset=-1 should fail', function () {
				var params = [
					'offset=' + -1
				];

				return getDelegatesPromise(params).then(function (res) {
					node.expect(res).to.have.property('message').to.equal('Value -1 is less than minimum 0');
				});
			});

			it('using sort with any of sort fields should not place NULLs first', function () {
				var delegatesSortFields = ['approval', 'productivity', 'rank', 'vote'];
				delegatesSortFields.forEach(function (sortField) {
					var params = [
						'sort=' + sortField
					];
					return getDelegatesPromise(params).then(function (res) {
						node.expect(res).to.have.property('delegates').that.is.an('array');

						var dividedIndices = res.delegates.reduce(function (memo, peer, index) {
							memo[peer[sortField] === null ? 'nullIndices' : 'notNullIndices'].push(index);
							return memo;
						}, { notNullIndices: [], nullIndices: [] });

						if (dividedIndices.nullIndices.length && dividedIndices.notNullIndices.length) {
							var ascOrder = function (a, b) { return a - b; };
							dividedIndices.notNullIndices.sort(ascOrder);
							dividedIndices.nullIndices.sort(ascOrder);

							node.expect(dividedIndices.notNullIndices[dividedIndices.notNullIndices.length - 1])
								.to.be.at.most(dividedIndices.nullIndices[0]);
						}
					});
				});
			});
		});
	});

	describe('GET /forging', function () {

		it('using no params should be ok', function () {
			var params = [];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('enabled').to.be.true;
				node.expect(res).to.have.property('delegates').that.is.an('array');
			});
		});

		it('using invalid publicKey should fail', function () {
			var params = [
				'publicKey=' + 'invalidPublicKey'
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('message').to.eql('Object didn\'t pass validation for format publicKey: invalidPublicKey');
			});
		});

		it('using empty publicKey should be ok', function () {
			var params = [
				'publicKey='
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('enabled').to.be.true;
				node.expect(res).to.have.property('delegates').that.is.an('array');
			});
		});

		it('using existing publicKey should be ok', function () {
			var params = [
				'publicKey=' + validDelegate.publicKey
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('enabled').that.is.a('boolean');
			});
		});

		it('using enabled publicKey should be ok', function () {
			var params = [
				'publicKey=' + '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f'
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('enabled').to.be.true;
			});
		});
	});

	describe('PUT /forging', function () {

		before(function () {
			var params = [
				'publicKey=' + validDelegate.publicKey
			];

			return getForgingStatusPromise(params).then(function (res) {
				node.expect(res).to.have.property('enabled').to.be.a('boolean');
				if (!res.enabled) {
					var params = {
						publicKey: validDelegate.publicKey,
						key: validDelegate.key
					};
					return putForgingDelegatePromise(params).then(function (res) {
						node.expect(res).to.have.property('publicKey').equal(validDelegate.publicKey);
						node.expect(res).to.have.property('forging').equal(true);
					});
				}
			});
		});

		it('using no params should fail', function () {
			var params = {};
			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('message').to.be.a('string').and.to.contain('Missing required property: ');
			});
		});

		it('using invalid publicKey should fail', function () {
			var invalidPublicKey = '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
			var params = {
				publicKey: invalidPublicKey,
				key: validDelegate.key
			};

			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('message').to.be.a('string').and.to.contain(['Delegate with publicKey:', invalidPublicKey, 'not found'].join(' '));
			});
		});

		it('using invalid key should fail', function () {
			var params = {
				publicKey: validDelegate.publicKey,
				key: 'invalid key'
			};

			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('message').to.be.a('string').and.to.contain('Invalid key and public key combination');
			});
		});

		it('using valid params should be ok', function () {
			var params = {
				publicKey: validDelegate.publicKey,
				key: validDelegate.key
			};

			return putForgingDelegatePromise(params).then(function (res) {
				node.expect(res).to.have.property('publicKey').equal(validDelegate.publicKey);
				node.expect(res).to.have.property('forging').to.be.a('boolean');
			});
		});

		it('using valid params should toggle forging status', function () {
			var params = [
				'publicKey=' + validDelegate.publicKey
			];

			return getForgingStatusPromise(params).then(function (res) {
				var currentStatus = res.enabled;
				var params = {
					publicKey: validDelegate.publicKey,
					key: validDelegate.key
				};

				return putForgingDelegatePromise(params).then(function (res) {
					node.expect(res).to.have.property('publicKey').equal(validDelegate.publicKey);
					node.expect(res).to.have.property('forging').to.not.equal(currentStatus);
				});
			});
		});
	});

	describe('GET /forgers', function () {

		it('using no params should be ok', function () {
			var params = [];

			return getForgersPromise(params).then(function (res) {
				node.expect(res).to.have.property('currentBlock').that.is.a('number');
				node.expect(res).to.have.property('currentBlockSlot').that.is.a('number');
				node.expect(res).to.have.property('currentSlot').that.is.a('number');
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(10);
			});
		});

		it('using limit=1 should be ok', function () {
			var params = [
				'limit=1'
			];

			return getForgersPromise(params).then(function (res) {
				node.expect(res).to.have.property('currentBlock').that.is.a('number');
				node.expect(res).to.have.property('currentBlockSlot').that.is.a('number');
				node.expect(res).to.have.property('currentSlot').that.is.a('number');
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(1);
			});
		});

		it('using limit=101 should be ok', function () {
			var params = [
				'limit=101'
			];

			return getForgersPromise(params).then(function (res) {
				node.expect(res).to.have.property('currentBlock').that.is.a('number');
				node.expect(res).to.have.property('currentBlockSlot').that.is.a('number');
				node.expect(res).to.have.property('currentSlot').that.is.a('number');
				node.expect(res).to.have.property('delegates').that.is.an('array');
				node.expect(res.delegates).to.have.lengthOf(101);
			});
		});
	});
});
