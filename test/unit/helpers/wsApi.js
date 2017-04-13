'use strict';

var config = require('../../../config.json');

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');

var wsApi = require('../../../helpers/wsApi');

var System = require('../../../modules/system');

var system;
before(function () {
	sinon.stub(System.prototype, 'getNethash').returns(config.nethash);
	sinon.stub(System.prototype, 'getMinVersion').returns(config.version);
	system = new System();
});

describe('middleware', function () {
	var middleware = wsApi.middleware;

	describe('handshake', function () {
		var handshake = middleware.handshake;
		var validRequest;

		beforeEach(function () {
			validRequest = {
				ip: '0.0.0.0',
				port: 4000,
				nethash: config.nethash,
				version: config.version
			};
		});

		it('should accept handshake when valid request passed', function (done) {

			handshake(validRequest, function (err, data) {
				expect(err).to.be.empty;
				done();
			});
		});

		it('should return error when null request passed', function (done) {

			handshake(null, function (err, data) {
				expect(err).not.to.be.empty;
				expect(err).to.have.property('error').that.is.an('array');
				done();
			});
		});

		it('should return error when wrong request passed', function (done) {

			handshake(null, function (err, data) {
				expect(err).not.to.be.empty;
				expect(err).to.have.property('error').that.is.an('array');
				done();
			});
		});

	});
});
