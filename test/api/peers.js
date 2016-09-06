'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

describe('GET /peers/version', function () {

	it('should be ok', function (done) {
		node.get('/peers/version', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('build').to.be.a('string');
			node.expect(res.body).to.have.property('version').to.be.a('string');
			done();
		});
	});
});

describe('GET /peers', function () {

	it('using empty parameters should fail', function (done) {
		var params = [
			'state=',
			'os=',
			'shared=',
			'version=',
			'limit=',
			'offset=',
			'orderBy='
		];

		node.get('/peers?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using state should be ok', function (done) {
		var state = 1;
		var params = 'state=' + state;

		node.get('/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peers').that.is.an('array');
			if (res.body.peers.length > 0) {
				for (var i = 0; i < res.body.peers.length; i++) {
					 node.expect(res.body.peers[i].state).to.equal(parseInt(state));
				}
			}
			done();
		});
	});

	it('using limit should be ok', function (done) {
		var limit = 3;
		var params = 'limit=' + limit;

		node.get('/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peers').that.is.an('array');
			node.expect(res.body.peers.length).to.be.at.most(limit);
			done();
		});
	});

	it('using orderBy should be ok', function (done) {
		var orderBy = 'state:desc';
		var params = 'orderBy=' + orderBy;

		node.get('/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('peers').that.is.an('array');

			if (res.body.peers.length > 0) {
				for (var i = 0; i < res.body.peers.length; i++) {
					if (res.body.peers[i+1] != null) {
						node.expect(res.body.peers[i+1].state).to.at.most(res.body.peers[i].state);
					}
				}
			}

			done();
		});
	});

	it('using limit > 100 should fail', function (done) {
		var limit = 101;
		var params = 'limit=' + limit;

		node.get('/peers?' + params, function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});

	it('using invalid parameters should fail', function (done) {
		var params = [
			'state=invalid',
			'os=invalid',
			'shared=invalid',
			'version=invalid',
			'limit=invalid',
			'offset=invalid',
			'orderBy=invalid'
		];

		node.get('/peers?' + params.join('&'), function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.not.ok;
			node.expect(res.body).to.have.property('error');
			done();
		});
	});
});
