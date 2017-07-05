'use strict';

var node = require('./../node.js');
var clearDatabaseTable = require('../common/globalBefore').clearDatabaseTable;
var modulesLoader = require('../common/initModule').modulesLoader;

var dapp = {};

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

describe('GET /dapps', function () {

	before(function (done) {
		node.onNewBlock(done);
	});

	function getDapps (params, done) {
		node.get('/api/dapps?' + params, done);
	}

	it('user orderBy == "category:asc" should be ok', function (done) {
		getDapps('orderBy=' + 'category:asc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps[0] != null) {
				for (var i = 0; i < res.body.dapps.length; i++) {
					if (res.body.dapps[i + 1] != null) {
						node.expect(res.body.dapps[i].category).to.be.at.most(res.body.dapps[i + 1].category);
					}
				}
			}
			done();
		});
	});

	it('user orderBy == "category:desc" should be ok', function (done) {
		getDapps('orderBy=' + 'category:desc', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps[0] != null) {
				for (var i = 0; i < res.body.dapps.length; i++) {
					if (res.body.dapps[i + 1] != null) {
						node.expect(res.body.dapps[i].category).to.be.at.least(res.body.dapps[i + 1].category);
					}
				}
			}
			done();
		});
	});

	it('using category should be ok', function (done) {
		var randomCategory = node.randomProperty(node.dappCategories, true);

		getDapps('category=' + randomCategory, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps.length > 0) {
				node.expect(res.body.dapps[0].category).to.equal(node.dappCategories[randomCategory]);
			}
			done();
		});
	});

	it.skip('using name should be ok', function (done) {
		var name = '';

		if (dapp !== {} && dapp != null) {
			name = dapp.name;
		} else {
			name = 'test';
		}

		getDapps('name=' + name, function (err, res) {
			node.expect(res.body).to.have.property('success');
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (name !== 'test') {
				node.expect(res.body.dapps).to.have.length.above(0);
				node.expect(res.body.dapps[0].name).to.equal(name);
			}
			done();
		});
	});

	it('using type should be ok', function (done) {
		var type = node.randomProperty(node.dappTypes);

		getDapps('type=' + type, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			for (var i = 0; i < res.body.dapps.length; i++) {
				if (res.body.dapps[i] != null) {
					node.expect(res.body.dapps[i].type).to.equal(type);
				}
			}
			done();
		});
	});

	it('using numeric link should fail', function (done) {
		var link = 12345;

		getDapps('link=' + link, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using string link should be ok', function (done) {
		var link = node.guestbookDapp.link;

		getDapps('link=' + link, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			for (var i = 0; i < res.body.dapps.length; i++) {
				if (res.body.dapps[i] != null) {
					node.expect(res.body.dapps[i].link).to.equal(link);
				}
			}
			done();
		});
	});

	it('using no limit should be ok', function (done) {
		getDapps('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps.length > 0) {
				dapp = res.body.dapps[0];
				dapp = dapp;
			}
			done();
		});
	});

	it('using limit == 3 should be ok', function (done) {
		var limit = 3;

		getDapps('limit=' + limit, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			node.expect(res.body.dapps).to.have.length.at.most(limit);
			done();
		});
	});

	it('using offset should be ok', function (done) {
		var offset = 1;
		var secondDapp;

		getDapps('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			if (res.body.dapps[1] != null) {
				secondDapp = res.body.dapps[1];

				getDapps('offset=' + 1, function (err, res) {
					node.expect(res.body).to.have.property('success').to.be.ok;
					node.expect(res.body).to.have.property('dapps').that.is.an('array');
					node.expect(res.body.dapps[0]).to.deep.equal(secondDapp);
				});
			}
			done();
		});
	});
});

describe('GET /dapps?id=', function () {

	function getDapps (id, done) {
		node.get('/api/dapps?id=' + id, done);
	}

	it('using no id should fail', function (done) {
		getDapps('', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too short (0 chars), minimum 1: #/id');
			done();
		});
	});

	it('using id with length > 20 should fail', function (done) {
		getDapps('012345678901234567890', function (err, res) {
			node.expect(res.body).to.have.property('success').to.not.be.ok;
			node.expect(res.body).to.have.property('error').to.equal('String is too long (21 chars), maximum 20: #/id');
			done();
		});
	});

	it('using unknown id should be ok', function (done) {
		var dappId = '8713095156789756398';

		getDapps(dappId, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			done();
		});
	});

	it.skip('using valid id should be ok', function (done) {
		getDapps(dapp.transactionId, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('dapps').that.is.an('array');
			node.expect(res.body.dapps[0].transactionId).to.equal(dapp.transactionId);
			done();
		});
	});
});

describe('GET /api/dapps/categories', function () {

	it('should be ok', function (done) {
		node.get('/api/dapps/categories', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('categories').that.is.an('object');
			for (var i in node.dappCategories) {
				node.expect(res.body.categories[i]).to.equal(node.dappCategories[i]);
			}
			done();
		});
	});
});
