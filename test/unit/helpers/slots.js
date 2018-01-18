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

var express = require('express');

var slots = require('../../../helpers/slots.js');

describe('helpers/slots', function () {

	describe('calc', function () {

		it('should calculate round number from given block height', function () {
			slots.calcRound(100).should.equal(1);
			slots.calcRound(200).should.equal(2);
			slots.calcRound(303).should.equal(3);
			slots.calcRound(304).should.equal(4);
		});

		it('should calculate round number from Number.MAX_VALUE', function () {
			var res = slots.calcRound(Number.MAX_VALUE);
			_.isNumber(res).should.be.ok;
			res.should.be.below(Number.MAX_VALUE);
		});
	});
});
