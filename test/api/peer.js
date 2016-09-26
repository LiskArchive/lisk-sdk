'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

describe('GET /peer/list', function () {

	before(function (done) {
		node.addPeers(2, done);
	});

	it('using incorrect nethash in headers should fail', function (done) {
		node.get('/peer/list')
			.set('nethash', 'incorrect')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body.expected).to.equal(node.config.nethash);
				done();
			});
	});

	it('using valid headers should be ok', function (done) {
		node.get('/peer/list')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('peers').that.is.an('array');
				node.expect(res.body.peers).to.have.length.of.at.least(1);
				res.body.peers.forEach(function (peer) {
					node.expect(peer).to.have.property('ip').that.is.a('string');
					node.expect(peer).to.have.property('port').that.is.a('number');
					node.expect(peer).to.have.property('state').that.is.a('number');
					node.expect(peer).to.have.property('os');
					node.expect(peer).to.have.property('version');
				});
				done();
			});
	});
});

describe('GET /peer/height', function () {

	it('using incorrect nethash in headers should fail', function (done) {
		node.get('/peer/height')
			.set('nethash', 'incorrect')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body.expected).to.equal(node.config.nethash);
				done();
			});
	});

	it('using valid headers should be ok', function (done) {
		node.get('/peer/height')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.be.an('object').that.has.property('height');
				node.expect(res.body.height).to.be.a('number').to.be.above(1);
				done();
			});
	});
});
