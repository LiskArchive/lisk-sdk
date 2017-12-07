'use strict';

var chai = require('chai');
var expect = chai.expect;
var express = require('express');
var _  = require('lodash');

var slots = require('../../../helpers/slots.js');

describe('helpers/slots', function () {

	describe('calc', function () {

		it('should calculate round number from given block height', function () {
			expect(slots.calcRound(100)).equal(1);
			expect(slots.calcRound(200)).equal(2);
			expect(slots.calcRound(303)).equal(3);
			expect(slots.calcRound(304)).equal(4);
		});

		it('should calculate round number from Number.MAX_VALUE', function () {
			var res = slots.calcRound(Number.MAX_VALUE);
			expect(_.isNumber(res)).to.be.ok;
			expect(res).to.be.below(Number.MAX_VALUE);
		});
	});
});
