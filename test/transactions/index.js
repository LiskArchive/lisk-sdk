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
import transaction from 'transactions';

describe('expect(transaction)s', () => {
	describe('exports', () => {
		it('to have the create transfer expect(transaction) function', () => {
			return expect(transaction)
				.to.have.property('transfer')
				.and.be.a('function');
		});

		it('to have the register second passphrase expect(transaction) function', () => {
			return expect(transaction)
				.to.have.property('registerSecondPassphrase')
				.and.be.a('function');
		});

		it('to have the register delegate expect(transaction) function', () => {
			return expect(transaction)
				.to.have.property('registerDelegate')
				.and.be.a('function');
		});

		it('to have the cast votes expect(transaction) function', () => {
			return expect(transaction)
				.to.have.property('castVotes')
				.and.be.a('function');
		});

		it('to have the register multisignature expect(transaction) function', () => {
			return expect(transaction)
				.to.have.property('registerMultisignature')
				.and.be.a('function');
		});

		it('to have the create dapp expect(transaction) function', () => {
			return expect(transaction)
				.to.have.property('createDapp')
				.and.be.a('function');
		});
	});
});
