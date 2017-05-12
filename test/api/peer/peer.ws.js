'use strict';

var node = require('../../node.js');
var ws = require('../../common/wsCommunication');

var ip = require('ip');

describe('GET /peer/list', function () {

	before(function (done) {
		ws.addPeers(2, '0.0.0.0', done);
	});

	before(function (done) {
		ws.addPeers(1, ip.address('public'), done);
	});


});

describe('GET /peer/height', function () {

	it('using valid headers should be ok', function (done) {
		ws.call('height', null, function (err, res) {
			node.debug('> Response:'.grey, JSON.stringify(res));
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.be.an('object').that.has.property('height');
			node.expect(res.height).to.be.a('number').to.be.above(1);
			done();
		});
	});
});
