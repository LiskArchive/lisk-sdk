'use strict';

var chai = require('chai');
var expect = require('chai').expect;
var sinon = require('sinon');
var ip = require('ip');

var checkIpInList = require('../../../helpers/checkIpInList');

describe('checkIpInList', function () {

	describe('when returnListIsEmpty is not a boolean', function () {
		it('should set returnListIsEmpty = true');
		expect(checkIpInList([], '', 'not a boolean')).to.eq(true);
	});

	describe('when list is not an array', function () {
		it('should return returnListIsEmpty');
		expect(checkIpInList([], '', false)).to.eq(false);
	});

	describe('when list is an empty array', function () {
		it('should return returnListIsEmpty');
		expect(checkIpInList([], '', false)).to.eq(false);
	});

	it('should return true to finding a subnet', function () {
		var ipmock = sinon.mock(ip);

		ipmock.expects('isV4Format').once().withArgs('127.0.0.1').returns(true);
		ipmock.expects('isV6Format').never();
		ipmock.expects('cidrSubnet').once().withArgs('127.0.0.1/32').returns(
			{
				contains: function (addr) {return true;}
			});

		expect(checkIpInList(['127.0.0.1'], 'subnet', false)).to.eq(true);

		ipmock.restore();
		ipmock.verify();
	});

	it('should return false because no subnet was found', function () {
		var ipmock = sinon.mock(ip);

		ipmock.expects('isV4Format').once().withArgs('127.0.0.1').returns(true);
		ipmock.expects('isV6Format').never();
		ipmock.expects('cidrSubnet').once().withArgs('127.0.0.1/32').returns(
			{
				contains: function (addr) {return false;}
			});

		expect(checkIpInList(['127.0.0.1'], 'subnet', false)).to.eq(false);

		ipmock.restore();
		ipmock.verify();
	});

	it('should return true to finding a subnet on V6Format', function () {
		var ipmock = sinon.mock(ip);

		ipmock.expects('isV4Format').once().withArgs('127.0.0.1').returns(false);
		ipmock.expects('isV6Format').once().withArgs('127.0.0.1').returns(true);
		ipmock.expects('cidrSubnet').once().withArgs('127.0.0.1/128').returns(
			{
				contains: function (addr) {return true;}
			});

		expect(checkIpInList(['127.0.0.1'], 'subnet', false)).to.eq(true);

		ipmock.restore();
		ipmock.verify();
	});

	it('should return true one record fails the others passes', function () {
		var ipmock = sinon.mock(ip);

		ipmock.expects('isV4Format').once().withArgs('127.0.0.1').returns(true);
		ipmock.expects('cidrSubnet').once().withArgs('127.0.0.1/32').throws();

		ipmock.expects('isV4Format').once().withArgs('V6IP').returns(false);
		ipmock.expects('isV6Format').once().withArgs('V6IP').returns(true);
		ipmock.expects('cidrSubnet').once().withArgs('V6IP/128').returns(
			{
				contains: function (addr) {return true;}
			});

		expect(checkIpInList(['127.0.0.1', 'V6IP'], 'subnet', false)).to.eq(true);

		ipmock.restore();
		ipmock.verify();
	});
});
