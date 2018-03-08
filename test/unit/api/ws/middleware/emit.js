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

const expect = require('chai').expect;
const sinon = require('sinon');
const emitMiddleware = require('../../../../../api/ws/workers/middlewares/emit');

describe('emitMiddleware', () => {
	let validReq;
	let validNext;

	beforeEach(done => {
		emitMiddleware(validReq, validNext);
		done();
	});

	describe('when valid req and next params provided', () => {
		before(done => {
			validReq = {};
			validNext = sinon.spy();
			done();
		});

		afterEach(() => {
			return validNext.reset();
		});

		it('should call validNext', () => {
			return expect(validNext).calledOnce;
		});
	});
});
