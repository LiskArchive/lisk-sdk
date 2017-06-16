'use strict';

var node = require('../../node.js');
var ws = require('../../common/wsCommunication');

var ip = require('ip');


//because of acceptable function (non accepting of private addresses) this will fail if running against
//lisk instance without shell variable NODE_ENV set to TEST
describe('list', function () {

	before(function (done) {
		ws.addPeers(2, '0.0.0.0', done);
	});

	before(function (done) {
		ws.addPeers(1, ip.address('public'), done);
	});


	it('should return non empty peers list', function (done) {
		ws.call('list', null, function (err, res) {
			node.debug('> Response:'.grey, JSON.stringify(res));
			node.expect(err).to.be.null;
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.have.property('peers').to.be.an('array').and.not.empty;
			done();
		});
	});

});

describe('height', function () {

	it('should receive height', function (done) {
		ws.call('height', null, function (err, res) {
			node.debug('> Response:'.grey, JSON.stringify(res));
			node.expect(res).to.have.property('success').to.be.ok;
			node.expect(res).to.be.an('object').that.has.property('height');
			node.expect(res.height).to.be.a('number').to.be.above(1);
			done();
		});
	});

});
