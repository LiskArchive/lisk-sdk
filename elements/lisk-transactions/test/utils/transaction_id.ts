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
import { TransferTransaction } from '../../src';
import { getId } from '../../src/utils';
import { validTransaction } from '../../fixtures';

describe('#getId', () => {
	const defaultTransaction = addTransactionFields(validTransaction);
	const validTestTransaction = new TransferTransaction(defaultTransaction);
	// Create tx id by validating
	validTestTransaction.validate();
	const defaultTransactionBytes = (validTestTransaction as any).getBytes();

	it('should return a valid id', async () => {
		expect(getId(defaultTransactionBytes)).to.be.eql(validTestTransaction.id);
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
