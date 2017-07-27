'use strict';

var node = require('./../node.js');
var http = require('../common/httpCommunication.js');
var ws = require('../common/wsCommunication.js');
var clearDatabaseTable = require('../common/globalBefore').clearDatabaseTable;
var modulesLoader = require('../common/initModule').modulesLoader;

function postTransaction (transaction, done) {
	ws.call('postTransactions', { transaction: transaction }, done, true);
}

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

describe('GET /api/dapps/get?id=', function () {

	function getDapp (id, done) {
		http.get('/api/dapps/get?id=' + id, done);
	}

	it('using no id should fail', function (done) {
		getDapp('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('String is too short (0 chars), minimum 1: #/id');
			done();
		});
	});

	it('using non-numeric id should fail', function (done) {
		var dappId = 'ABCDEFGHIJKLMNOPQRST';

		getDapp(dappId, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Object didn\'t pass validation for format id: ABCDEFGHIJKLMNOPQRST: #/id');
			done();
		});
	});

	it('using id with length > 20 should fail', function (done) {
		getDapp('012345678901234567890', function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('String is too long (21 chars), maximum 20: #/id');
			done();
		});
	});

	it('using unknown id should fail', function (done) {
		var dappId = '8713095156789756398';

		getDapp(dappId, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Application not found');
			done();
		});
	});

	it('using known id should be ok', function (done) {
		getDapp(node.guestbookDapp.transactionId, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapp').that.is.an('object');
			node.expect(res.body.dapp).to.have.property('name').that.is.equal(node.guestbookDapp.name);
			done();
		});
	});
});

describe('GET /api/dapps/categories', function () {

	it('should be ok', function (done) {
		http.get('/api/dapps/categories', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('categories').that.is.an('object');
			for (var i in node.dappCategories) {
				node.expect(res.body.categories[i]).to.equal(node.dappCategories[i]);
			}
			done();
		});
	});
});

describe('GET /api/dapps/?type=', function () {

	function getDapps (params, done) {
		http.get('/api/dapps?type=' + params, done);
	}

	it('using no type should fail', function (done) {
		var type = '';

		getDapps(type, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Expected type integer but found type string: #/type');
			done();
		});
	});

	it('using non-numeric type should fail', function (done) {
		var type = 'A';

		getDapps(type, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Expected type integer but found type string: #/type');
			done();
		});
	});

	it('using type == -1 should fail', function (done) {
		var type = '-1';

		getDapps(type, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Value -1 is less than minimum 0: #/type');
			done();
		});
	});

	it('using type == 0 should be ok', function (done) {
		var type = '0';

		getDapps(type, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(2);
			node.expect(res.body.dapps[0].type).to.equal(0);
			node.expect(res.body.dapps[1].type).to.equal(0);
			done();
		});
	});

	it('using type == 1 should be ok', function (done) {
		var type = '1';

		getDapps(type, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(0);
			done();
		});
	});
});

describe('GET /api/dapps/?name=', function () {

	function getDapps (params, done) {
		http.get('/api/dapps?name=' + params, done);
	}

	it('using name with length < 1 should fail', function (done) {
		var name = '';

		getDapps(name, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('String is too short (0 chars), minimum 1: #/name');
			done();
		});
	});

	it('using name with length > 32 should fail', function (done) {
		var name = 'ABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFG';

		getDapps(name, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('String is too long (33 chars), maximum 32: #/name');
			done();
		});
	});

	it('using name == "Unknown" should be ok', function (done) {
		var name = 'Unknown';

		getDapps(name, function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(0);
			done();
		});
	});

	it('using name == "Lisk Guestbook" should be ok', function (done) {
		var name = 'Lisk Guestbook';

		getDapps(name, function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(1);
			node.expect(res.body.dapps[0].name).to.equal('Lisk Guestbook');
			done();
		});
	});

	it('using name == "BlockData" should be ok', function (done) {
		var name = 'BlockData';

		getDapps(name, function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(1);
			node.expect(res.body.dapps[0].name).to.equal('BlockData');
			done();
		});
	});
});

describe('GET /api/dapps/?category=', function () {

	function getDapps (params, done) {
		http.get('/api/dapps?category=' + params, done);
	}

	it('using numeric category should fail', function (done) {
		var category = 0;

		getDapps(category, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Expected type string but found type integer: #/category');
			done();
		});
	});

	it('using category == "Education" should be ok', function (done) {
		var category = 'Education';

		getDapps(category, function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(1);
			node.expect(res.body.dapps[0].category).to.equal(0);
			done();
		});
	});

	it('using category == "Entertainment" should be ok', function (done) {
		var category = 'Entertainment';

		getDapps(category, function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(1);
			node.expect(res.body.dapps[0].category).to.equal(1);
			done();
		});
	});

	it('using category == "Unknown"', function (done) {
		var category = 'Unknown';

		getDapps(category, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Invalid application category');
			done();
		});
	});
});

describe('GET /api/dapps/?link=', function () {

	function getDapps (params, done) {
		http.get('/api/dapps?link=' + params, done);
	}

	it('using numeric link should fail', function (done) {
		var link = 0;

		getDapps(link, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Expected type string but found type integer: #/link');
			done();
		});
	});

	it('using link with length < 1 should fail', function (done) {
		var link = '';

		getDapps(link, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('String is too short (0 chars), minimum 1: #/link');
			done();
		});
	});

	it('using link with length > 2000 should fail', function (done) {
		var link = 'https://github.com/MaxKK/xxxxxx/archive/master.zip'.repeat(40) + '1';

		getDapps(link, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('String is too long (2001 chars), maximum 2000: #/link');
			done();
		});
	});

	it('using known link should be ok', function (done) {
		var link = node.guestbookDapp.link;

		getDapps(link, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(1);
			node.expect(res.body.dapps[0].link).to.equal(link);
			done();
		});
	});

	it('using unknown link should be ok', function (done) {
		var link = 'https://github.com/MaxKK/xxxxxx/archive/master.zip';

		getDapps(link, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(0);
			done();
		});
	});
});

describe('GET /api/dapps/?limit=', function () {

	function getDapps (params, done) {
		http.get('/api/dapps?limit=' + params, done);
	}

	it('using limit == 0 should fail', function (done) {
		var limit = 0;

		getDapps(limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Value 0 is less than minimum 1: #/limit');
			done();
		});
	});

	it('using limit > 100 should fail', function (done) {
		var limit = 101;

		getDapps(limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Value 101 is greater than maximum 100: #/limit');
			done();
		});
	});

	it('using limit == 1 should be ok', function (done) {
		var limit = 1;

		getDapps(limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			node.expect(res.body.dapps).to.have.length.at.most(limit);
			done();
		});
	});

	it('using limit == 100 should be ok', function (done) {
		var limit = 100;

		getDapps(limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			node.expect(res.body.dapps).to.have.length.at.most(limit);
			done();
		});
	});
});

describe('GET /api/dapps/?limit=1&offset=', function () {

	function getDapps (params, done) {
		http.get('/api/dapps?limit=1&offset=' + params, done);
	}

	it('using offset < 0 should fail', function (done) {
		var offset = -1;

		getDapps(offset, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Value -1 is less than minimum 0: #/offset');
			done();
		});
	});

	it('using offset == 0 should be ok', function (done) {
		var offset = 0;

		getDapps(offset, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(1);
			done();
		});
	});

	it('using offset == 1 should be ok', function (done) {
		var offset = 1;

		getDapps(offset, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array').and.has.lengthOf(1);
			done();
		});
	});
});

describe('GET /api/dapps/?orderBy=', function () {

	function getDapps (params, done) {
		http.get('/api/dapps?orderBy=' + params, done);
	}

	it('using orderBy == "category:asc" should be ok', function (done) {
		getDapps('category:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			node.expect(res.body.dapps[0].category).to.equal(0);
			node.expect(res.body.dapps[1].category).to.equal(1);
			done();
		});
	});

	it('using orderBy == "category:desc" should be ok', function (done) {
		getDapps('category:desc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			node.expect(res.body.dapps[0].category).to.equal(1);
			node.expect(res.body.dapps[1].category).to.equal(0);
			done();
		});
	});

	it('using orderBy == "category:unknown" should be ok', function (done) {
		getDapps('category:unknown', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			node.expect(res.body.dapps[0].category).to.equal(0);
			node.expect(res.body.dapps[1].category).to.equal(1);
			done();
		});
	});

	it('using orderBy == "unknown:unknown" should fail', function (done) {
		getDapps('unknown:unknown', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').that.is.equal('Invalid sort field');
			done();
		});
	});
});
