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
import * as cryptography from '@liskhq/lisk-cryptography';
import { addTransactionFields } from '../helpers';
import { getId, getTransactionId } from '../../src/utils';
import { TransactionJSON } from '../../src/transaction_types';
import { validTransaction } from '../../fixtures';
// Require is used for stubbing
const utils = require('../../src/utils');

describe('#getId', () => {
	const defaultTransaction = addTransactionFields(validTransaction);
	const defaultTransactionBytes =
		'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b020000002092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309';

	it('should return a valid id', async () => {
		expect(getId(Buffer.from(defaultTransactionBytes, 'hex'))).to.be.eql(
			defaultTransaction.id,
		);
	});

	it('should call cryptography hash', async () => {
		const cryptographyHashStub = sandbox
			.stub(cryptography, 'hash')
			.returns(
				Buffer.from(
					'da63e78daf2096db8316a157a839c8b9a616d3ce6692cfe61d6d380a623a1902',
					'hex',
				),
			);

		getId(Buffer.from(defaultTransactionBytes, 'hex'));
		expect(cryptographyHashStub).to.be.calledOnce;
	});

	it('should call cryptography getFirstEightBytesReversed', async () => {
		const cryptographygetFirstEightBytesReversedStub = sandbox
			.stub(cryptography, 'getFirstEightBytesReversed')
			.returns('db9620af8de763da' as any);

		getId(Buffer.from(defaultTransactionBytes, 'hex'));
		expect(cryptographygetFirstEightBytesReversedStub).to.be.calledOnce;
	});

	it('should call cryptography bufferToIntAsString', async () => {
		const cryptographybufferToIntAsStringStub = sandbox
			.stub(cryptography, 'bufferToIntAsString')
			.returns('15822870279184933850');

		getId(Buffer.from(defaultTransactionBytes, 'hex'));
		expect(cryptographybufferToIntAsStringStub).to.be.calledOnce;
	});
});

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
		const transaction: unknown = {
			type: 0,
			amount: defaultAmount,
			fee: '0',
			recipientId: defaultRecipientId,
			timestamp: defaultTimestamp,
			asset: {},
			senderPublicKey: defaultPublicKey,
			signature: defaultSignature,
		};
		const id = getTransactionId(transaction as TransactionJSON);

		return expect(id).to.be.equal(defaultTransactionId);
	});
});
