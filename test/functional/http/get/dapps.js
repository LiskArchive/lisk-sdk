'use strict';

var node = require('../../../node.js');
var http = require('../../../common/httpCommunication.js');
var ws = require('../../../common/wsCommunication.js');
var clearDatabaseTable = require('../../../common/globalBefore').clearDatabaseTable;
var modulesLoader = require('../../../common/modulesLoader');

function postTransaction (transaction, done) {
	ws.call('postTransactions', { transaction: transaction }, done, true);
}

describe('Dapps', function () {

	before(function (done) {
		modulesLoader.getDbConnection(function (err, db) {
			if (err) {
				return done(err);
			}

			node.async.every(['dapps', 'outtransfer', 'intransfer'], function (table, cb) {
				clearDatabaseTable(db, modulesLoader.logger, table, cb);
			}, done);
		});
	});

	before(function (done) {
		node.async.eachSeries([node.guestbookDapp, node.blockDataDapp], function (dapp, eachSeriesCb) {
			var transaction = node.lisk.dapp.createDapp(node.gAccount.password, null, dapp);
			dapp.transactionId = transaction.id;
			postTransaction(transaction, eachSeriesCb);
		}, done);
	});

	before(function (done) {
		node.onNewBlock(done);
	});

	describe('GET /api/dapps', function () {

		describe('transactionId', function () {

			function getDapps (params, done) {
				http.get('/api/dapps?transactionId=' + params, done);
			}

			it('using non-numeric id should fail', function (done) {
				var dappId = 'ABCDEFGHIJKLMNOPQRST';

				getDapps(dappId, function (err, res) {
					node.expect(res.body).to.have.property('message').that.is.equal('Object didn\'t pass validation for format id: ABCDEFGHIJKLMNOPQRST');
					done();
				});
			});

			it('using id with length > 20 should fail', function (done) {
				getDapps('012345678901234567890', function (err, res) {
					node.expect(res.body).to.have.property('message').that.is.equal('String is too long (21 chars), maximum 20');
					done();
				});
			});

			it('using unknown id should not return results', function (done) {
				var dappId = '8713095156789756398';

				getDapps(dappId, function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array').that.is.empty;
					done();
				});
			});

			it('using known id should return the result', function (done) {
				getDapps(node.guestbookDapp.transactionId, function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array')
						.that.have.nested.property('0.name').equal(node.guestbookDapp.name);
					done();
				});
			});
		});

		describe('name', function () {

			function getDapps (params, done) {
				http.get('/api/dapps?name=' + params, done);
			}

			it('using name with length < 1 should fail', function (done) {
				var name = '';

				getDapps(name, function (err, res) {
					node.expect(res.body).to.have.property('message').that.is.equal('String is too short (0 chars), minimum 1');
					done();
				});
			});

			it('using name with length > 32 should fail', function (done) {
				var name = 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFG';

				getDapps(name, function (err, res) {
					node.expect(res.body).to.have.property('message').that.is.equal('String is too long (33 chars), maximum 32');
					done();
				});
			});

			it('using name == "Unknown" should not return results', function (done) {
				var name = 'Unknown';

				getDapps(name, function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array').that.is.empty;
					done();
				});
			});

			it('using name == "Lisk Guestbook" should return the result', function (done) {
				var name = 'Lisk Guestbook';

				getDapps(name, function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array')
						.that.have.nested.property('0.name').equal('Lisk Guestbook');
					done();
				});
			});

			it('using name == "BlockData" should return the result', function (done) {
				var name = 'BlockData';

				getDapps(name, function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array')
						.that.have.nested.property('0.name').equal('BlockData');
					done();
				});
			});
		});

		describe('limit', function () {

			function getDapps (params, done) {
				http.get('/api/dapps?limit=' + params, done);
			}

			it('using limit == 0 should fail', function (done) {
				var limit = 0;

				getDapps(limit, function (err, res) {
					node.expect(res.body).to.have.property('message').that.is.equal('Value 0 is less than minimum 1');
					done();
				});
			});

			it('using limit > 100 should fail', function (done) {
				var limit = 101;

				getDapps(limit, function (err, res) {
					node.expect(res.body).to.have.property('message').that.is.equal('Value 101 is greater than maximum 100');
					done();
				});
			});

			it('using limit == 1 should be ok', function (done) {
				var limit = 1;

				getDapps(limit, function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array');
					node.expect(res.body.dapps).to.have.length.at.most(limit);
					done();
				});
			});

			it('using limit == 100 should be ok', function (done) {
				var limit = 100;

				getDapps(limit, function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array');
					node.expect(res.body.dapps).to.have.length.at.most(limit);
					done();
				});
			});
		});

		describe('offset', function () {

			function getDapps (params, done) {
				http.get('/api/dapps?limit=1&offset=' + params, done);
			}

			it('using offset < 0 should fail', function (done) {
				var offset = -1;

				getDapps(offset, function (err, res) {
					node.expect(res.body).to.have.property('message').that.is.equal('Value -1 is less than minimum 0');
					done();
				});
			});

			it('using offset == 0 should be ok', function (done) {
				var offset = 0;

				getDapps(offset, function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(1);
					done();
				});
			});

			it('using offset == 1 should be ok', function (done) {
				var offset = 1;

				getDapps(offset, function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(1);
					done();
				});
			});
		});

		describe('orderBy', function () {

			function getDapps (params, done) {
				http.get('/api/dapps?orderBy=' + params, done);
			}

			it('using orderBy == "category:asc" should be ok', function (done) {
				getDapps('category:asc', function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array');
					node.expect(res.body.dapps[0].category).to.equal(0);
					node.expect(res.body.dapps[1].category).to.equal(1);
					done();
				});
			});

			it('using orderBy == "category:desc" should be ok', function (done) {
				getDapps('category:desc', function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array');
					node.expect(res.body.dapps[0].category).to.equal(1);
					node.expect(res.body.dapps[1].category).to.equal(0);
					done();
				});
			});

			it('using orderBy == "category:unknown" should be ok', function (done) {
				getDapps('category:unknown', function (err, res) {
					node.expect(res.body).to.have.property('dapps').that.is.an('array');
					node.expect(res.body.dapps[0].category).to.equal(0);
					node.expect(res.body.dapps[1].category).to.equal(1);
					done();
				});
			});

			it('using orderBy == "unknown:unknown" should fail', function (done) {
				getDapps('unknown:unknown', function (err, res) {
					node.expect(res.body).to.have.property('message').that.is.equal('Invalid sort field');
					done();
				});
			});
		});
	});

	describe('GET /api/peers codes', function () {

		describe('when query is malformed', function () {

			var invalidParams = 'name=';

			it('should return http code = 400', function (done) {
				http.get('/api/dapps?' + invalidParams, function (err, res) {
					node.expect(res).to.have.property('status').equal(400);
					done();
				});
			});
		});

		describe('when query does not return results', function () {

			var notExistingTransactionId = '8713095156789756398';
			var emptyResultParams = 'transactionId=' + notExistingTransactionId;

			it('should return http code = 200', function (done) {
				http.get('/api/dapps?' + emptyResultParams, function (err, res) {
					node.expect(res).to.have.property('status').equal(200);
					done();
				});
			});
		});

		describe('when query returns results', function () {

			it('should return http code = 200', function (done) {
				http.get('/api/dapps?transactionId=' + node.guestbookDapp.transactionId, function (err, res) {
					node.expect(res).to.have.property('status').equal(200);
					done();
				});
			});
		});
	});
});
