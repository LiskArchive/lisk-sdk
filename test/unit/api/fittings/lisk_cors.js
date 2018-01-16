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

describe('lisk_cors', function () {

	var context, cors_fititng, next;

	beforeEach(function () {
		context = {
			request: httpMocks.createRequest(),
			response: httpMocks.createResponse()
		};
		cors_fititng = fitting();
		next = sinonSandbox.spy();
	});

	it('should be a factory function that names 2 arguments', function () {
		fitting.should.be.a('function');
		fitting.should.have.length(2);
	});

	it('should create a middleware accepting 2 arguments', function () {
		cors_fititng.should.be.a('function');
		cors_fititng.should.have.length(2);
	});

	it('should process context and call the callback function', function () {
		cors_fititng(context, next);
		next.should.have.been.calledOnce;
	});

	it('should enable pre-flight request wide open if specified no option', function () {
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		next.should.have.not.been.called;
		context.response.statusCode.should.be.equal(204);
		context.response.getHeader('Access-Control-Allow-Origin').should.be.equal('*');
		context.response.getHeader('Access-Control-Allow-Methods').should.be.equal('GET,HEAD,PUT,PATCH,POST,DELETE');
	});

	it('should enable requests for test.com when provided origin = test.com', function () {
		cors_fititng = fitting({origin: 'test.com'}, null);
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		next.should.have.not.been.called;
		context.response.statusCode.should.be.equal(204);
		context.response.getHeader('Access-Control-Allow-Origin').should.be.equal('test.com');
		context.response.getHeader('Access-Control-Allow-Methods').should.be.equal('GET,HEAD,PUT,PATCH,POST,DELETE');
	});

	it('should enable requests for GET, POST when provided methods = GET POST', function () {
		cors_fititng = fitting({methods: ['GET', 'POST']}, null);
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		next.should.have.not.been.called;
		context.response.statusCode.should.be.equal(204);
		context.response.getHeader('Access-Control-Allow-Origin').should.be.equal('*');
		context.response.getHeader('Access-Control-Allow-Methods').should.be.equal('GET,POST');
	});

	it('should block custom headers if no "allowedHeaders" provided', function () {
		cors_fititng = fitting({allowedHeaders: []}, null);
		context.request.headers['my-custom-header'] = 'my-custom-value';
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		next.should.have.not.been.called;
		context.response.statusCode.should.be.equal(204);
		should.not.exist( context.response.getHeader('my-custom-header') );
	});

	it('should enable requests for X-MY-HEADER when provided allowedHeaders = X-MY-HEADER', function () {
		cors_fititng = fitting({allowedHeaders: ['X-MY-HEADER']}, null);
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		next.should.have.not.been.called;
		context.response.statusCode.should.be.equal(204);
		context.response.getHeader('Access-Control-Allow-Headers').should.include('X-MY-HEADER');
	});

	it('should enable requests for multiple headers when provided allowedHeaders with multiple values', function () {
		cors_fititng = fitting({allowedHeaders: ['X-1-HEADER', 'X-2-HEADER']}, null);
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		next.should.have.not.been.called;
		context.response.statusCode.should.be.equal(204);
		var headers = context.response.getHeader('Access-Control-Allow-Headers').split(',');
		headers.should.include('X-1-HEADER');
		headers.should.include('X-2-HEADER');
	});
});
