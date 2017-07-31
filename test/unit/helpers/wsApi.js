'use strict';

var config = require('../../../config.json');

var chai = require('chai');
var expect = require('chai').expect;
var express = require('express');
var _  = require('lodash');
var sinon = require('sinon');

var wsApi = require('../../../helpers/wsApi');

var System = require('../../../modules/system');

describe('handshake', function () {

	var system, handshake, validRequest;

	before(function (done) {

		sinon.stub(System.prototype, 'getNethash').returns(config.nethash);
		sinon.stub(System.prototype, 'getMinVersion').returns(config.version);

		new System(function (err, __system) {
			system = __system;
			handshake = wsApi.middleware.Handshake(system);
			done(err);
		}, {config: {
			version: config.version,
			minVersion: config.minVersion,
			nethash: config.nethash,
			nonce: 'EXAMPLE_NONCE'
		}});

		validRequest = {
			ip: '0.0.0.0',
			port: 4000,
			nethash: config.nethash,
			version: config.version,
			nonce: 'PEER_NONCE'
		};
	});

	it('should accept handshake when valid request passed', function (done) {

		handshake(validRequest, function (err, data) {
			expect(err).to.be.null;
			done();
		});
	});

	it('should return error when empty undefined request', function (done) {

		handshake(undefined, function (err, data) {
			expect(err).not.to.be.empty;
			expect(err).to.have.property('error').that.is.an('array');
			done();
		});
	});

	it('should return error when empty null request', function (done) {

		handshake(null, function (err, data) {
			expect(err).not.to.be.empty;
			expect(err).to.have.property('error').that.is.an('array');
			done();
		});
	});

	it('should return error when 0 as request', function (done) {

		handshake(0, function (err, data) {
			expect(err).not.to.be.empty;
			expect(err).to.have.property('error').that.is.an('array');
			done();
		});
	});

	it('should return error when empty request passed', function (done) {

		handshake({}, function (err, data) {
			expect(err).not.to.be.empty;
			expect(err).to.have.property('error').that.is.an('array');
			done();
		});
	});

	it('should return error when wrong request without version passed', function (done) {
		var malformedRequest = _.clone(validRequest);
		delete malformedRequest.version;
		handshake(malformedRequest, function (err, data) {
			expect(err).not.to.be.empty;
			expect(err).to.have.property('error').that.is.an('array');
			done();
		});
	});

	it('should return error when wrong request without port passed', function (done) {
		var malformedRequest = _.clone(validRequest);
		delete malformedRequest.port;
		handshake(malformedRequest, function (err, data) {
			expect(err).not.to.be.empty;
			expect(err).to.have.property('error').that.is.an('array');
			done();
		});
	});

	it('should return error when wrong request without ip passed', function (done) {
		var malformedRequest = _.clone(validRequest);
		delete malformedRequest.ip;
		handshake(malformedRequest, function (err, data) {
			expect(err).not.to.be.empty;
			expect(err).to.have.property('error').that.is.an('array');
			done();
		});
	});

	it('should return error when wrong request without nethash passed', function (done) {
		var malformedRequest = _.clone(validRequest);
		delete malformedRequest.nethash;
		handshake(malformedRequest, function (err, data) {
			expect(err).not.to.be.empty;
			expect(err).to.have.property('error').that.is.an('array');
			done();
		});
	});
});
