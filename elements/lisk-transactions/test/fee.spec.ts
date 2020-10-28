/*
 * Copyright © 2020 Lisk Foundation
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

import { getAddressAndPublicKeyFromPassphrase } from '@liskhq/lisk-cryptography';
import { getMinFee } from '../src';

const validAssetSchema = {
	$id: 'lisk/transfer-transaction',
	title: 'Transfer transaction asset',
	type: 'object',
	required: ['amount', 'recipientAddress', 'data'],
	properties: {
		amount: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
			minLength: 20,
			maxLength: 20,
		},
		data: {
			dataType: 'string',
			fieldNumber: 3,
			minLength: 0,
			maxLength: 64,
		},
	},
};
const passphrase1 = 'trim elegant oven term access apple obtain error grain excite lawn neck';
const { publicKey: publicKey1 } = getAddressAndPublicKeyFromPassphrase(passphrase1);
const validTransaction = {
	moduleID: 2,
	assetID: 0,
	nonce: BigInt('1'),
	senderPublicKey: publicKey1,
	asset: {
		recipientAddress: Buffer.from('3a971fd02b4a07fc20aad1936d3cb1d263b96e0f', 'hex'),
		amount: BigInt('4008489300000000'),
		data: '',
	},
};

describe('fee', () => {
	describe('getMinFee', () => {
		it('should return minimum fee required to send to network', () => {
			const fee = getMinFee(validAssetSchema, validTransaction);
			expect(fee).toMatchSnapshot();
		});
	});
});
