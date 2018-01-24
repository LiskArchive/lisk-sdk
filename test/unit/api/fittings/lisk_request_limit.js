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

var httpMocks = require('node-mocks-http');

var fitting = require('../../../../api/fittings/lisk_request_limit');

describe('lisk_request_limit', function () {

	var context, limit_fititng, next;

	beforeEach(function () {
		context = {
			request: httpMocks.createRequest(),
			response: null
		};
		context.response = httpMocks.createResponse({req: context.request});
		limit_fititng = fitting();
		next = sinonSandbox.spy();
	});

	it('should be a factory function that names 2 arguments', function () {
		expect(fitting).to.be.a('function');
		expect(fitting).to.have.length(2);
	});

	it('should create a middleware accepting 2 arguments', function () {
		expect(limit_fititng).to.be.a('function');
		expect(limit_fititng).to.have.length(2);
	});

	it('should set limits to default if not provided config', function () {
		expect(limit_fititng.limits).to.be.eql(limit_fititng.defaults);
	});

	it('should set limits to override if provided by config', function () {
		var limits = {
			max: 10,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 60000
		};
		limit_fititng = fitting({limits: limits});
		expect(limit_fititng.limits).to.be.eql(limits);
	});

	it('should limit the number of request to 5 if limits.max = 5', function () {
		var limits = {
			max: 5,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 60000
		};

		context.response = httpMocks.createResponse({req: context.request});

		limit_fititng = fitting({limits: limits});

		for (var i = 0; i < limits.max + 5; i++) {
			limit_fititng(context, next);
		}

		expect(next).to.have.callCount(limits.max);
	});

	it('should limit the number of request to 5 every 2 seconds if limits.max = 5 and limits.windowMs = 2000', function (done) {
		var limits = {
			max: 5,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 2000,
		};

		limit_fititng = fitting({limits: limits});

		var success = 0;

		function cb (err, data) {
			success = success + 1;
			var lmitiHeader = context.response.getHeader('X-RateLimit-Limit');
			var remainingLimitHeader = context.response.getHeader('X-RateLimit-Remaining') || 0;
			expect(lmitiHeader).to.be.equal(limits.max);
			expect(remainingLimitHeader).to.be.equal(limits.max - success);
		}

		for (var i = 0; i < limits.max + 5; i++) {
			limit_fititng(context, cb);
		}
		expect(success).to.be.equal(limits.max);

		success = 0;

		setTimeout(function () {
			next = sinonSandbox.spy();
			for (var i = 0; i < limits.max + 5; i++) {
				limit_fititng(context, cb);
			}
			expect(success).to.be.equal(limits.max);
			done();
		}, 2000);
	});

	it('should respect limit for different IPs explicitly', function () {
		var context2 = {
			request: httpMocks.createRequest(),
			response: null
		};
		context2.response = httpMocks.createResponse({req: context2.request});
		var next2 = sinonSandbox.spy();
		var limits = {
			max: 5,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 2000
		};

		context.request.ip = '192.168.99.10';
		context2.request.ip = '192.168.99.11';

		limit_fititng = fitting({limits: limits});

		for (var i = 0; i < limits.max + 5; i++) {
			limit_fititng(context, next);
			limit_fititng(context2, next2);
		}

		expect(next).to.have.callCount(limits.max);
		expect(next2).to.have.callCount(limits.max);
	});
});
