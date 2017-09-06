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
import constants from '../src/constants';

describe('constants module', () => {
	it('should have a fixedPoint integer', () => {
		const { fixedPoint } = constants;
		(fixedPoint).should.be.an.integer();
	});

	describe('fees', () => {
		const { fees, fee } = constants;

		it('should have a send fee integer equal to send transaction fee', () => {
			const { send } = fees;
			const sendTransactionFee = fee[0];

			(send).should.be.an.integer();
			(sendTransactionFee).should.be.an.integer();
			(send).should.be.equal(sendTransactionFee);
		});

		it('should have a signature fee integer equal to signature transaction fee', () => {
			const { signature } = fees;
			const signatureTransactionFee = fee[1];

			(signature).should.be.an.integer();
			(signatureTransactionFee).should.be.an.integer();
			(signature).should.be.equal(signatureTransactionFee);
		});

		it('should have a delegate fee integer equal to delegate transaction fee', () => {
			const { delegate } = fees;
			const delegateTransactionFee = fee[2];

			(delegate).should.be.an.integer();
			(delegateTransactionFee).should.be.an.integer();
			(delegate).should.be.equal(delegateTransactionFee);
		});

		it('should have a vote fee integer equal to vote transaction fee', () => {
			const { vote } = fees;
			const voteTransactionFee = fee[3];

			(vote).should.be.an.integer();
			(voteTransactionFee).should.be.an.integer();
			(vote).should.be.equal(voteTransactionFee);
		});

		it('should have a multisignature fee integer equal to multisignature transaction fee', () => {
			const { multisignature } = fees;
			const multisignatureTransactionFee = fee[4];

			(multisignature).should.be.an.integer();
			(multisignatureTransactionFee).should.be.an.integer();
			(multisignature).should.be.equal(multisignatureTransactionFee);
		});

		it('should have a dapp fee integer equal to dapp transaction fee', () => {
			const { dapp } = fees;
			const dappTransactionFee = fee[5];

			(dapp).should.be.an.integer();
			(dappTransactionFee).should.be.an.integer();
			(dapp).should.be.equal(dappTransactionFee);
		});

		it('should have a data fee integer', () => {
			const { data } = fees;
			(data).should.be.an.integer();
		});
	});
});
