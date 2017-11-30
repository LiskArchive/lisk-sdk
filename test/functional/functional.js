'use strict';


var lisk = require('lisk-js');

before(function (done) {
	require('../common/utils/waitFor').blockchainReady(done);
});
