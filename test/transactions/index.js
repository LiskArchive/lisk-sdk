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
		it('should have #transfer', () => {
			return expect(transaction)
				.to.have.property('transfer')
				.and.be.a('function');
		});

		it('should have #registerSecondPassphrase', () => {
			return expect(transaction)
				.to.have.property('registerSecondPassphrase')
				.and.be.a('function');
		});

		it('should have #registerDelegate', () => {
			return expect(transaction)
				.to.have.property('registerDelegate')
				.and.be.a('function');
		});

		it('should have #castVotes', () => {
			return expect(transaction)
				.to.have.property('castVotes')
				.and.be.a('function');
		});

		it('should have #registerMultisignature', () => {
			return expect(transaction)
				.to.have.property('registerMultisignature')
				.and.be.a('function');
		});

		it('should have #createDapp', () => {
			return expect(transaction)
				.to.have.property('createDapp')
				.and.be.a('function');
		});

		it('should have #createSignatureObject', () => {
			return expect(transaction)
				.to.have.property('createSignatureObject')
				.and.be.a('function');
		});
	});
});
