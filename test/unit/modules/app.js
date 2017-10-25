'use strict';

var constants = require('../../../helpers/constants');
var config = require('../../config.json');

describe('app', function () {

	var app;

	before(function (done) {
		// Run the app on a different than default port
        process.argv.splice(2,0,'--');
        process.argv.splice(2,0,config.httpPort += 1);
        process.argv.splice(2,0,'-h');
        process.argv.splice(2,0,config.port += 1);
        process.argv.splice(2,0,'-p');

        console.log(process.argv);
		require('../../../app');
		// Wait for modules to be initialized
		setTimeout(done, 5000);
	});

	it('should be ok');
});
