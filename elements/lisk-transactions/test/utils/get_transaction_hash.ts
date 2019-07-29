/*
 * Copyright © 2019 Lisk Foundation
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
import { expect } from 'chai';
import { getTransactionHash } from '../../src/utils';
import { TransactionJSON } from '../../src/transaction_types';
import * as getTransactionBytesModule from '../../src/utils/get_transaction_bytes';

describe('#getTransactionHash', () => {
	let defaultTransactionBytes;
	let transaction: unknown;
	let result: Buffer;

	beforeEach(() => {
		defaultTransactionBytes = Buffer.from(
			'00aa2902005d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae0900cebcaa8d34153de803000000000000618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
			'hex',
		);
		sandbox
			.stub(getTransactionBytesModule, 'getTransactionBytes')
			.returns(defaultTransactionBytes);
		transaction = {
			type: 0,
			amount: '1000',
			fee: '0',
			recipientId: '58191285901858109L',
			timestamp: 141738,
			asset: {},
			senderPublicKey:
				'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
			signature:
				'618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a',
			signatures: [],
			id: '13987348420913138422',
		};
		result = getTransactionHash(transaction as TransactionJSON);
		return Promise.resolve();
	});

	it('should get transaction bytes', () => {
		return expect(
			getTransactionBytesModule.getTransactionBytes,
		).to.be.calledWithExactly(transaction);
	});

	it('should return a hash for a transaction object as a Buffer', () => {
		const expected = Buffer.from(
			'f60a26da470b1dc233fd526ed7306c1d84836f9e2ecee82c9ec47319e0910474',
			'hex',
		);
		return expect(result).to.be.eql(expected);
	});
});
