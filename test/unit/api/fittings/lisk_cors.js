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
var swaggerModuleRegistry = require('../../../../helpers/swagger_module_registry');
var fitting = require('../../../../api/fittings/lisk_cors');

describe('lisk_cors', () => {
	var context;
	var cors_fititng;
	var next;

	beforeEach(done => {
		context = {
			request: httpMocks.createRequest(),
			response: httpMocks.createResponse(),
		};
		swaggerModuleRegistry.bind({
			config: __testContext.config,
			logger: __testContext.logger,
			modules: {
				cache: null,
			},
		});
		cors_fititng = fitting();
		next = sinonSandbox.spy();
		done();
	});

	it('should be a factory function that names 2 arguments', done => {
		expect(fitting).to.be.a('function');
		expect(fitting).to.have.length(1);
		done();
	});

	it('should create a middleware accepting 2 arguments', done => {
		expect(cors_fititng).to.be.a('function');
		expect(cors_fititng).to.have.length(2);
		done();
	});

	it('should process context and call the callback function', done => {
		cors_fititng(context, next);
		expect(next).to.have.been.calledOnce;
		done();
	});

	it('should enable pre-flight request wide open if specified no option', done => {
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		expect(next).to.have.not.been.called;
		expect(context.response.statusCode).to.be.equal(204);
		expect(
			context.response.getHeader('Access-Control-Allow-Origin')
		).to.be.equal('*');
		expect(
			context.response.getHeader('Access-Control-Allow-Methods')
		).to.be.equal('GET,POST,PUT');
		done();
	});

	it('should enable requests for test.com when provided origin = test.com', done => {
		var originalOrigin = __testContext.config.api.options.cors.origin;
		__testContext.config.api.options.cors.origin = 'test.com';
		cors_fititng = fitting();
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);

		expect(next).to.have.not.been.called;
		expect(context.response.statusCode).to.be.equal(204);
		expect(
			context.response.getHeader('Access-Control-Allow-Origin')
		).to.be.equal('test.com');
		expect(
			context.response.getHeader('Access-Control-Allow-Methods')
		).to.be.equal('GET,POST,PUT');

		__testContext.config.api.options.cors.origin = originalOrigin;
		done();
	});

	it('should return actual request origin if cors origin set to true', done => {
		var originalOrigin = __testContext.config.api.options.cors.origin;
		__testContext.config.api.options.cors.origin = true;
		cors_fititng = fitting();
		context.request.headers.origin = 'my-custom-origin.com';
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);
		expect(next).to.have.not.been.called;
		expect(context.response.statusCode).to.be.equal(204);
		expect(
			context.response.getHeader('Access-Control-Allow-Origin')
		).to.be.equal('my-custom-origin.com');
		expect(
			context.response.getHeader('Access-Control-Allow-Methods')
		).to.be.equal('GET,POST,PUT');

		__testContext.config.api.options.cors.origin = originalOrigin;
		done();
	});

	it('should disable cors request completely if cors origin set to false', done => {
		var originalOrigin = __testContext.config.api.options.cors.origin;
		__testContext.config.api.options.cors.origin = false;
		cors_fititng = fitting();
		context.request.headers.origin = 'my-custom-origin.com';
		context.request.method = 'OPTIONS';

		cors_fititng(context, next);
		expect(next).to.be.calledOnce;
		expect(context.response.statusCode).to.be.equal(200);
		expect(
			context.response.getHeader('Access-Control-Allow-Origin')
		).to.be.equal(undefined);
		expect(
			context.response.getHeader('Access-Control-Allow-Methods')
		).to.be.equal(undefined);

		__testContext.config.api.options.cors.origin = originalOrigin;
		done();
	});

	it('should enable requests for GET, POST when provided methods = GET POST', done => {
		var originalMethods = __testContext.config.api.options.cors.methods;
		__testContext.config.api.options.cors.methods = ['GET', 'POST'];
		cors_fititng = fitting();
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
		__testContext.config.api.options.cors.methods = originalMethods;
		done();
	});
});
