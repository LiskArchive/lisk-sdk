'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var PromiseDefer = require('../../../helpers/promiseDefer');

describe('PromiseDefer', function () {

	var promiseDefer;
	var RESOLVED = 'resolved';
	var REJECTED = 'rejected';

	beforeEach(function () {
		promiseDefer = PromiseDefer();
		promiseDefer.promise.then(function (input) {
			expect(input.message).to.equal(RESOLVED);
			input.done();
		}).catch(function (input) {
			expect(input.message).to.equal(REJECTED);
			input.done();
		});
	});

	it('should resolve', function (done) {

		expect(promiseDefer.promise.isFulfilled()).to.be.false;
		promiseDefer.resolve({message: RESOLVED, done: done});
		expect(promiseDefer.promise.isFulfilled()).to.be.true;
	});

	it('should reject', function (done) {

		expect(promiseDefer.promise.isRejected()).to.be.false;
		promiseDefer.reject({message: REJECTED, done: done});
		expect(promiseDefer.promise.isRejected()).to.be.true;
	});
});
