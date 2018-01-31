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

var fitting = require('../../../../api/fittings/lisk_cors');

describe('lisk_cors', () => {
	var context;
	var cors_fititng;
	var next;

	beforeEach(() => {
		context = {
			request: httpMocks.createRequest(),
			response: httpMocks.createResponse(),
		};
		cors_fititng = fitting();
		next = sinonSandbox.spy();
	});

	it('should be a factory function that names 2 arguments', () => {
		expect(fitting).to.be.a('function');
		expect(fitting).to.have.length(1);
	});

	it('should create a middleware accepting 2 arguments', () => {
		expect(cors_fititng).to.be.a('function');
		expect(cors_fititng).to.have.length(2);
	});

	it('should process context and call the callback function', () => {
		cors_fititng(context, next);
		expect(next).to.have.been.calledOnce;
	});

	it('should enable pre-flight request wide open if specified no option', () => {
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		expect(next).to.have.not.been.called;
		expect(context.response.statusCode).to.be.equal(204);
		expect(
			context.response.getHeader('Access-Control-Allow-Origin')
		).to.be.equal('*');
		expect(
			context.response.getHeader('Access-Control-Allow-Methods')
		).to.be.equal('GET,HEAD,PUT,PATCH,POST,DELETE');
	});

	it('should enable requests for test.com when provided origin = test.com', () => {
		cors_fititng = fitting({ origin: 'test.com' }, null);
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		expect(next).to.have.not.been.called;
		expect(context.response.statusCode).to.be.equal(204);
		expect(
			context.response.getHeader('Access-Control-Allow-Origin')
		).to.be.equal('test.com');
		expect(
			context.response.getHeader('Access-Control-Allow-Methods')
		).to.be.equal('GET,HEAD,PUT,PATCH,POST,DELETE');
	});

	it('should enable requests for GET, POST when provided methods = GET POST', () => {
		cors_fititng = fitting({ methods: ['GET', 'POST'] }, null);
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		expect(next).to.have.not.been.called;
		expect(context.response.statusCode).to.be.equal(204);
		expect(
			context.response.getHeader('Access-Control-Allow-Origin')
		).to.be.equal('*');
		expect(
			context.response.getHeader('Access-Control-Allow-Methods')
		).to.be.equal('GET,POST');
	});

	it('should block custom headers if no "allowedHeaders" provided', () => {
		cors_fititng = fitting({ allowedHeaders: [] }, null);
		context.request.headers['my-custom-header'] = 'my-custom-value';
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		expect(next).to.have.not.been.called;
		expect(context.response.statusCode).to.be.equal(204);
		expect(context.response.getHeader('my-custom-header')).to.be.undefined;
	});

	it('should enable requests for X-MY-HEADER when provided allowedHeaders = X-MY-HEADER', () => {
		cors_fititng = fitting({ allowedHeaders: ['X-MY-HEADER'] }, null);
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		expect(next).to.have.not.been.called;
		expect(context.response.statusCode).to.be.equal(204);
		expect(
			context.response.getHeader('Access-Control-Allow-Headers')
		).to.include('X-MY-HEADER');
	});

	it('should enable requests for multiple headers when provided allowedHeaders with multiple values', () => {
		cors_fititng = fitting(
			{ allowedHeaders: ['X-1-HEADER', 'X-2-HEADER'] },
			null
		);
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		expect(next).to.have.not.been.called;
		expect(context.response.statusCode).to.be.equal(204);
		var headers = context.response
			.getHeader('Access-Control-Allow-Headers')
			.split(',');
		expect(headers).to.include('X-1-HEADER');
		expect(headers).to.include('X-2-HEADER');
	});
});
