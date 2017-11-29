'use strict';

// Root object
var test = {};

// Optional logging
if (process.env.SILENT === 'true') {
	test.debug = function () { };
} else {
	test.debug = console.log;
}

// Exports
module.exports = test;