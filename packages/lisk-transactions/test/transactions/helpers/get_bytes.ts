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
import * as cryptography from '@liskhq/lisk-cryptography';
import { expect } from 'chai';
import { getBytes } from '../../../src/transactions/helpers';
import { TransactionJSON } from '../../../src/transaction_types';

describe('#getBytes', () => {
	const defaultTransaction: TransactionJSON = {
		id: '15822870279184933850',
		type: 0,
		timestamp: 79289378,
		senderPublicKey:
			'0eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243',
		senderId: '18278674964748191682L',
		recipientId: '17243547555692708431L',
		recipientPublicKey:
			'3f82af600f7507a5c95e8a1c2b69aa353b59f26906298dce1d8009a2a52c6f59',
		amount: '9312934243',
		fee: '10000000',
		signature:
			'2092abc5dd72d42b289f69ddfa85d0145d0bfc19a0415be4496c189e5fdd5eff02f57849f484192b7d34b1671c17e5c22ce76479b411cad83681132f53d7b309',
		signatures: [],
		asset: {},
		receivedAt: new Date(),
	};

	it('should return a buffer', () => {
		const expectedBuffer = Buffer.from(
			'0022dcb9040eb0a6d7b862dc35c856c02c47fde3b4f60f2f3571a888b9a8ca7540c6793243ef4d6324449e824f6319182b02000000',
			'hex',
		);

		return expect(getBytes(defaultTransaction)).to.be.eql(expectedBuffer);
	});

	it('should call cryptography.hexToBuffer', () => {
		const hexToBufferStub = sandbox
			.stub(cryptography, 'hexToBuffer')
			.returns(Buffer.from('senderPublicKey'));
		getBytes(defaultTransaction);

		return expect(hexToBufferStub).to.be.calledWithExactly(
			defaultTransaction.senderPublicKey,
		);
	});

	it('should call cryptography.bigNumberToBuffer once when recipientId provided', () => {
		const bigNumberToBufferStub = sandbox
			.stub(cryptography, 'bigNumberToBuffer')
			.returns(Buffer.from('recipientId'));
		getBytes(defaultTransaction);

		return expect(bigNumberToBufferStub).to.be.calledOnce;
	});
});
