/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */
'use strict';

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

	describe('when it fails', function () {

		it('should reject', function (done) {
			expect(promiseDefer.promise.isRejected()).to.be.false;
			promiseDefer.reject({message: REJECTED, done: done});
			expect(promiseDefer.promise.isRejected()).to.be.true;
		});
	});

	describe('when it succeeds', function () {

		it('should resolve', function (done) {
			expect(promiseDefer.promise.isFulfilled()).to.be.false;
			promiseDefer.resolve({message: RESOLVED, done: done});
			expect(promiseDefer.promise.isFulfilled()).to.be.true;
		});
	});
});
