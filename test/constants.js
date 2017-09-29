/*
 * Copyright © 2017 Lisk Foundation
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
 *
 */
import {
	fixedPoint,
	dappFee,
	delegateFee,
	inTransferFee,
	outTransferFee,
	multisignatureFee,
	signatureFee,
	sendFee,
	voteFee,
} from '../src/constants';

describe('constants', () => {
	it('should know the fixedPoint', () => {
		(fixedPoint).should.be.equal(1e8);
	});

	it('dappFee', () => {
		(dappFee).should.be.equal(25e8);
	});

	it('delegateFee', () => {
		(delegateFee).should.be.equal(25e8);
	});

	it('inTransferFee', () => {
		(inTransferFee).should.be.equal(0.1e8);
	});

	it('outTransferFee', () => {
		(outTransferFee).should.be.equal(0.1e8);
	});

	it('multisignatureFee', () => {
		(multisignatureFee).should.be.equal(5e8);
	});

	it('signatureFee', () => {
		(signatureFee).should.be.equal(5e8);
	});

	it('sendFee', () => {
		(sendFee).should.be.equal(0.1e8);
	});

	it('voteFee', () => {
		(voteFee).should.be.equal(1e8);
	});
});
