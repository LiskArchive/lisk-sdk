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
import transaction from '../../src/transactions/index';

describe('transactions', () => {
	describe('exports', () => {
		it('should have all supported create transaction functions', () => {
			transaction.should.have.property('send').be.type('function');
			transaction.should.have
				.property('sendFromMultisignatureAccount')
				.be.type('function');
			transaction.should.have
				.property('registerSecondPassphrase')
				.be.type('function');
			transaction.should.have.property('registerDelegate').be.type('function');
			transaction.should.have.property('castVotes').be.type('function');
			transaction.should.have
				.property('registerMultisignature')
				.be.type('function');
			transaction.should.have.property('createDapp').be.type('function');
			transaction.should.have.property('transferIntoDapp').be.type('function');
			transaction.should.have.property('transferOutOfDapp').be.type('function');
		});
	});
});
