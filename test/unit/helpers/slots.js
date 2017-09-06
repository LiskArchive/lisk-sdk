'use strict';

var chai = require('chai');
var express = require('express');
var _  = require('lodash');
var node = require('../../node.js');
var slots = require('../../../helpers/slots.js');

describe('helpers/slots', function () {

	describe('calc', function () {

		it('should calculate round number from given block height', function () {
			node.expect(slots.calcRound(100)).equal(1);
			node.expect(slots.calcRound(200)).equal(2);
			node.expect(slots.calcRound(303)).equal(3);
			node.expect(slots.calcRound(304)).equal(4);
		});

		it('should calculate round number from Number.MAX_VALUE', function () {
			var res = slots.calcRound(Number.MAX_VALUE);
			node.expect(_.isNumber(res)).to.be.ok;
			node.expect(res).to.be.below(Number.MAX_VALUE);
		});
	});
});
