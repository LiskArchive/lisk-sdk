/*
 * Copyright © 2019 Lisk Foundation
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

const httpMocks = require('node-mocks-http');
const fitting = require('../../../../../../src/modules/http_api/fittings/lisk_request_limit');

describe('lisk_request_limit', () => {
	let context;
	let limit_fititng;
	let next;

	beforeEach(done => {
		context = {
			request: httpMocks.createRequest(),
			response: null,
		};
		context.response = httpMocks.createResponse({ req: context.request });
		limit_fititng = fitting();
		next = sinonSandbox.spy();
		done();
	});

	it('should be a factory function that names 2 arguments', done => {
		expect(fitting).to.be.a('function');
		expect(fitting).to.have.length(1);
		done();
	});

	it('should create a middleware accepting 2 arguments', done => {
		expect(limit_fititng).to.be.a('function');
		expect(limit_fititng).to.have.length(2);
		done();
	});

	it('should set limits to default if not provided config', done => {
		expect(limit_fititng.limits).to.be.eql(limit_fititng.defaults);
		done();
	});

	it('should set limits to override if provided by config', done => {
		const limits = {
			max: 10,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 60000,
		};
		limit_fititng = fitting({ limits });
		expect(limit_fititng.limits).to.be.eql(limits);
		done();
	});

	it('should limit the number of request to 5 if limits.max = 5', done => {
		const limits = {
			max: 5,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 60000,
		};

		context.response = httpMocks.createResponse({ req: context.request });

		limit_fititng = fitting({ limits });

		for (let i = 0; i < limits.max + 5; i++) {
			limit_fititng(context, next);
		}

		expect(next).to.have.callCount(limits.max);
		done();
	});

	it('should limit the number of request to 5 every 2 seconds if limits.max = 5 and limits.windowMs = 2000', done => {
		const limits = {
			max: 5,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 2000,
		};

		limit_fititng = fitting({ limits });

		let success = 0;

		function cb() {
			success += 1;
			const lmitiHeader = context.response.getHeader('X-RateLimit-Limit');
			const remainingLimitHeader =
				context.response.getHeader('X-RateLimit-Remaining') || 0;
			expect(lmitiHeader).to.be.equal(limits.max);
			expect(remainingLimitHeader).to.be.equal(limits.max - success);
		}

		for (let i = 0; i < limits.max + 5; i++) {
			limit_fititng(context, cb);
		}
		expect(success).to.be.equal(limits.max);

		success = 0;

		setTimeout(() => {
			next = sinonSandbox.spy();
			for (let auxI = 0; auxI < limits.max + 5; auxI++) {
				limit_fititng(context, cb);
			}
			expect(success).to.be.equal(limits.max);
			done();
		}, 2000);
	});

	it('should respect limit for different IPs explicitly', done => {
		const context2 = {
			request: httpMocks.createRequest(),
			response: null,
		};
		context2.response = httpMocks.createResponse({ req: context2.request });
		const next2 = sinonSandbox.spy();
		const limits = {
			max: 5,
			delayMs: 0,
			delayAfter: 0,
			windowMs: 2000,
		};

		context.request.ip = '192.168.99.10';
		context2.request.ip = '192.168.99.11';

		limit_fititng = fitting({ limits });

		for (let i = 0; i < limits.max + 5; i++) {
			limit_fititng(context, next);
			limit_fititng(context2, next2);
		}

		expect(next).to.have.callCount(limits.max);
		expect(next2).to.have.callCount(limits.max);
		done();
	});
});
