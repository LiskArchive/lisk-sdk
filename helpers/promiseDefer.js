'use strict';

var Promise = require('bluebird');

function PromiseDefer () {
	var resolve, reject;
	var promise = new Promise(function (__resolve, __reject) {
		resolve = __resolve;
		reject = __reject;
	});

	return {
		resolve: resolve,
		reject: reject,
		promise: promise
	};
}

module.exports = PromiseDefer;
