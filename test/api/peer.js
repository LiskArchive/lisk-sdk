'use strict';

var node = require('./../node.js');
var ip = require('ip');

describe('GET /peer/list', function () {

	before(function (done) {
		node.addPeers(2, '0.0.0.0', done);
	});

	before(function (done) {
		node.addPeers(1, ip.address('public'), done);
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

	it('using incompatible version in headers should fail', function (done) {
		node.get('/peer/list')
			.set('version', '0.1.0a')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.eql('Request is made from incompatible version');
				node.expect(res.body).to.have.property('expected').to.eql('0.0.0a');
				node.expect(res.body).to.have.property('received').to.eql('0.1.0a');
				done();
			});
	});

	it('using valid headers should be ok', function (done) {
		node.get('/peer/list')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('peers').that.is.an('array');
				res.body.peers.forEach(function (peer) {
					node.expect(peer).to.have.property('ip').that.is.a('string');
					node.expect(peer).to.have.property('port').that.is.a('number');
					node.expect(peer).to.have.property('state').that.is.a('number');
					node.expect(peer).to.have.property('os');
					node.expect(peer).to.have.property('version');
					node.expect(peer).to.have.property('broadhash');
					node.expect(peer).to.have.property('height');
				});
				done();
			});
	});

	it('should not accept itself as a peer', function (done) {
		node.get('/peer/list')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('peers').that.is.an('array');
				res.body.peers.forEach(function (peer) {
					node.expect(peer).to.have.property('ip').that.is.a('string');
					node.expect(peer.ip).not.to.equal(ip.address('public'));
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

	it('using incompatible version in headers should fail', function (done) {
		node.get('/peer/height')
			.set('version', '0.1.0a')
			.end(function (err, res) {
				node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('message').to.eql('Request is made from incompatible version');
				node.expect(res.body).to.have.property('expected').to.eql('0.0.0a');
				node.expect(res.body).to.have.property('received').to.eql('0.1.0a');
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
