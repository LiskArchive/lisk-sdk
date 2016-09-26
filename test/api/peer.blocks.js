'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

var genesisblock = require('../../genesisBlock.json');

describe('GET /peer/blocks', function () {

	it('using correct nethash in headers should be ok', function (done) {
		node.get('/peer/blocks')
			.end(function (err, res) {
				// node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('blocks').that.is.an('array');
				done();
		});
	});
});

describe('POST /peer/blocks', function () {

	it('using incorrect nethash in headers should fail', function (done) {
		node.post('/peer/blocks', { dummy: 'dummy' })
			.set('nethash', 'incorrect')
			.end(function (err, res) {
				// node.debug('> Response:'.grey, JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body.expected).to.equal(node.config.nethash);
				done();
			});
	});
});
