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
 *
 */
import { expect } from 'chai';
import * as cryptography from '@liskhq/lisk-cryptography';
import { getTransactionId } from '../../src/utils';
import { BaseTransaction } from '../../src/transaction_types';
// Require is used for stubbing
const utils = require('../../src/utils');

describe('#getTransactionId', () => {
	const defaultPublicKey =
		'5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09';
	const defaultTransactionId = '13987348420913138422';
	const defaultTransactionHash = Buffer.from(
		'f60a26da470b1dc233fd526ed7306c1d84836f9e2ecee82c9ec47319e0910474',
		'hex',
	);
	const defaultAmount = '1000';
	const defaultTimestamp = 141738;
	const defaultRecipientId = '58191285901858109L';
	const defaultSignature =
		'618a54975212ead93df8c881655c625544bce8ed7ccdfe6f08a42eecfb1adebd051307be5014bb051617baf7815d50f62129e70918190361e5d4dd4796541b0a';

	beforeEach(() => {
		sandbox.stub(cryptography, 'hash').returns(defaultTransactionHash);
		return sandbox.stub(utils, 'getTransactionBytes');
	});

	it('should return an id of 13987348420913138422 for a transaction', () => {
		const transaction: BaseTransaction = {
			type: 0,
			amount: defaultAmount,
			fee: '0',
			recipientId: defaultRecipientId,
			timestamp: defaultTimestamp,
			asset: {},
			senderPublicKey: defaultPublicKey,
			signature: defaultSignature,
		};
		const id = getTransactionId(transaction);

		return expect(id).to.be.equal(defaultTransactionId);
	});
});
