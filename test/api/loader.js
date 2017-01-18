'use strict';

var node = require('./../node.js');

describe('GET /api/loader/status/ping', function () {

	it('should be ok', function (done) {
		node.get('/api/loader/status/ping', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			done();
		});
	});
});

describe('GET /api/loader/status/sync', function () {

	it('should be ok', function (done) {
		node.get('/api/loader/status/sync', function (err, res) {
			node.expect(res.body).to.have.property('success').to.be.ok;
			node.expect(res.body).to.have.property('syncing').to.a('boolean');
			node.expect(res.body).to.have.property('blocks').to.be.a('number');
			node.expect(res.body).to.have.property('height').to.be.a('number');
			node.expect(res.body).to.have.property('broadhash').to.be.a('string');
			node.expect(res.body).to.not.have.property('consensus'); // Indicates forced forging
			done();
		});
	});
});
