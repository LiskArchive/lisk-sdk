'use strict';

var test = require('../test');

before(function (done) {
	require('../common/utils/waitFor').blockchainReady(done);
});

module.exports = test;