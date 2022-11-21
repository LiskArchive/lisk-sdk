/*
 * Copyright © 2022 Lisk Foundation
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

import { codec, Schema } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import { transactionSchema } from 'lisk-framework';
import {
	posVoteParamsSchema,
	registerMultisignatureParamsSchema,
	tokenTransferParamsSchema,
} from './transactions';

interface CommandInfo {
	module: string;
	command: string;
	schema: Schema;
}

export const mockCommands: CommandInfo[] = [
	{
		module: 'token',
		command: 'transfer',
		schema: tokenTransferParamsSchema,
	},
	{
		module: 'auth',
		command: 'registerMultisignature',
		schema: registerMultisignatureParamsSchema,
	},
	{
		module: 'pos',
		command: 'stake',
		schema: posVoteParamsSchema,
	},
];

export const mockEncodedTransaction = Buffer.from('encoded transaction');
export const mockJSONTransaction = {
	params: {
		tokenID: '0000000000000000',
		amount: '100',
		data: 'send token',
		recipientAddress: 'lskqozpc4ftffaompmqwzd93dfj89g5uezqwhosg9',
		accountInitializationFee: BigInt(5000000),
	},
	command: 'transfer',
	fee: '100000000',
	module: 'token',
	nonce: '0',
	senderPublicKey: '0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a',
	signatures: [
		'3cc8c8c81097fe59d9df356b3c3f1dd10f619bfabb54f5d187866092c67e0102c64dbe24f357df493cc7ebacdd2e55995db8912245b718d88ebf7f4f4ac01f04',
	],
};

export const createIPCClientMock = (
	mockTransaction: any = mockJSONTransaction,
	mockTransactionEncoded = mockEncodedTransaction,
	commands = mockCommands,
) => ({
	disconnect: jest.fn(),
	schema: {
		transaction: transactionSchema,
	},
	metadata: [
		{
			id: utils.intToBuffer(2, 4).toString('hex'),
			name: 'token',
			commands: [
				{
					id: utils.intToBuffer(0, 4).toString('hex'),
					name: 'transfer',
					params: tokenTransferParamsSchema,
				},
			],
		},
		{
			id: utils.intToBuffer(12, 4).toString('hex'),
			name: 'auth',
			commands: [
				{
					id: utils.intToBuffer(0, 4).toString('hex'),
					name: 'registerMultisignature',
					params: registerMultisignatureParamsSchema,
				},
			],
		},
		{
			id: utils.intToBuffer(13, 4).toString('hex'),
			name: 'pos',
			commands: [
				{
					id: utils.intToBuffer(1, 4).toString('hex'),
					name: 'stake',
					params: posVoteParamsSchema,
				},
			],
		},
	],
	transaction: {
		sign: jest.fn().mockReturnValue(mockTransaction),
		encode: jest.fn().mockReturnValue(mockTransactionEncoded),
		toJSON: jest.fn().mockReturnValue(mockTransaction),
		fromJSON: jest.fn().mockReturnValue(mockTransaction),
		decode: jest.fn().mockImplementation(val => {
			const root = codec.decode<Record<string, unknown>>(transactionSchema, val);
			const params = codec.decode(commands[0].schema, root.asset as Buffer);
			return { ...root, params };
		}),
	},
	node: {
		getNodeInfo: jest.fn().mockResolvedValue({
			networkIdentifier: '873da85a2cee70da631d90b0f17fada8c3ac9b83b2613f4ca5fddd374d1034b3',
		}),
	},
	invoke: jest.fn().mockResolvedValue({
		nonce: BigInt(0),
		numberOfSignatures: 0,
		mandatoryKeys: [],
		optionalKeys: [],
	}),
});
