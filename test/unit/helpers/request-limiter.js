'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');

var RequestLimiter = require('../../../helpers/request-limiter.js');

describe('RequestLimiter', function () {

	var app;

	beforeEach(function () {
		app = express();
	});

	describe('when config.trustProxy is undefined', function () {

		it('should not enable trust proxy', function () {
			RequestLimiter(app, {});
			expect(app.enabled('trust proxy')).to.be.false;
		});
	});

	describe('when config.trustProxy is == false', function () {

		it('should not enable trust proxy', function () {
			RequestLimiter(app, { trustProxy: false });
			expect(app.enabled('trust proxy')).to.be.false;
		});
	});

	describe('when config.trustProxy is == true', function () {

		it('should enable trust proxy', function () {
			RequestLimiter(app, { trustProxy: true });
			expect(app.enabled('trust proxy')).to.be.true;
		});
	});

	describe('when limits are undefined', function () {

		var limiter;

		beforeEach(function () {
			limiter = RequestLimiter(app, {});
		});

		it('should return the default client limits', function () {
			expect(limiter).to.be.a('object').that.has.property('client').that.is.a('object');
			expect(limiter.client).to.have.property('delayAfter').to.eql(0);
			expect(limiter.client).to.have.property('delayAfter').to.eql(0);
			expect(limiter.client).to.have.property('delayMs').to.eql(0);
			expect(limiter.client).to.have.property('max').to.eql(0);
			expect(limiter.client).to.have.property('windowMs').to.eql(60000);
		});

		it('should return the default peer limits', function () {
			expect(limiter).to.be.a('object').that.has.property('peer').that.is.a('object');
			expect(limiter.peer).to.have.property('delayAfter').to.eql(0);
			expect(limiter.peer).to.have.property('delayAfter').to.eql(0);
			expect(limiter.peer).to.have.property('delayMs').to.eql(0);
			expect(limiter.peer).to.have.property('max').to.eql(0);
			expect(limiter.peer).to.have.property('windowMs').to.eql(60000);
		});

		it('should enable the client middleware', function () {
			expect(limiter).to.be.a('object').that.has.property('middleware').that.is.a('object');
			expect(limiter.middleware).to.have.property('client').that.is.a('function');
		});

		it('should enable the peer middleware', function () {
			expect(limiter).to.be.a('object').that.has.property('middleware').that.is.a('object');
			expect(limiter.middleware).to.have.property('peer').that.is.a('function');
		});
	});

	describe('when limits are defined', function () {

		var limits, options, limiter;

		beforeEach(function () {
			limits = {
				max: 1,
				delayMs: 2,
				delayAfter: 3,
				windowMs: 4
			};
			options = { options: { limits: limits } };
			limiter = RequestLimiter(app, { api: options, peers: options });
		});

		it('should return the defined client limits', function () {
			expect(limiter).to.be.a('object').that.has.property('client').that.is.a('object');
			expect(limiter.client).to.have.property('max').to.eql(1);
			expect(limiter.client).to.have.property('delayMs').to.eql(2);
			expect(limiter.client).to.have.property('delayAfter').to.eql(3);
			expect(limiter.client).to.have.property('windowMs').to.eql(4);
		});

		it('should return the defined peer limits', function () {
			expect(limiter).to.be.a('object').that.has.property('peer').that.is.a('object');
			expect(limiter.peer).to.have.property('max').to.eql(1);
			expect(limiter.peer).to.have.property('delayMs').to.eql(2);
			expect(limiter.peer).to.have.property('delayAfter').to.eql(3);
			expect(limiter.peer).to.have.property('windowMs').to.eql(4);
		});

		it('should enable the client middleware', function () {
			expect(limiter).to.be.a('object').that.has.property('middleware').that.is.a('object');
			expect(limiter.middleware).to.have.property('client').that.is.a('function');
		});

		it('should enable the peer middleware', function () {
			expect(limiter).to.be.a('object').that.has.property('middleware').that.is.a('object');
			expect(limiter.middleware).to.have.property('peer').that.is.a('function');
		});
	});
});
