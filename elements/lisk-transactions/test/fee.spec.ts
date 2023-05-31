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

import { legacy } from '@liskhq/lisk-cryptography';
import { computeMinFee, getBytes } from '../src';

describe('fee', () => {
	const validParamsSchema = {
		$id: '/lisk/transfer-transaction',
		title: 'Transfer transaction params',
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
	const { publicKey: publicKey1 } = legacy.getPrivateAndPublicKeyFromPassphrase(passphrase1);
	const validTransaction = {
		module: 'token',
		command: 'transfer',
		nonce: BigInt('1'),
		senderPublicKey: publicKey1,
		params: {
			recipientAddress: Buffer.from('3a971fd02b4a07fc20aad1936d3cb1d263b96e0f', 'hex'),
			amount: BigInt('4008489300000000'),
			data: '',
		},
	};

	describe('computeMinFee', () => {
		it('should return minimum fee required to send to network', () => {
			// Arrange
			const minFee = computeMinFee(validTransaction, validParamsSchema);

			// Assert
			expect(minFee).toBeDefined();
			expect(minFee).toMatchSnapshot();
		});

		it('should calculate minimum fee for given minFeePerByte', () => {
			// Arrange
			const options = { minFeePerByte: 2000, numberOfSignatures: 1 };
			const minFee = computeMinFee(validTransaction, validParamsSchema, options);

			// Assert
			expect(minFee).toBeDefined();
			expect(minFee).toMatchSnapshot();
		});

		it('should calculate minimum fee for transaction from multisignature account', () => {
			// Arrange
			const options = { minFeePerByte: 2000, numberOfSignatures: 64 };
			const minFee = computeMinFee(validTransaction, validParamsSchema, options);

			// Assert
			expect(minFee).toBeDefined();
			expect(minFee).toMatchSnapshot();
		});

		it('should calculate minimum fee for transaction from multisignature account which has lower number of signatures than registered public keys', () => {
			// Arrange
			const options = {
				minFeePerByte: 1000,
				numberOfSignatures: 2,
				numberOfEmptySignatures: 3,
			};
			const transaction = {
				...validTransaction,
				signatures: [
					Buffer.alloc(64),
					Buffer.alloc(0),
					Buffer.alloc(0),
					Buffer.alloc(0),
					Buffer.alloc(64),
				],
			};
			const minFee = computeMinFee(transaction, validParamsSchema, options);
			const txBytes = getBytes({ ...transaction, fee: minFee }, validParamsSchema);

			// Assert
			expect(minFee).toBe(BigInt(txBytes.length * 1000));
		});

		it('should calculate minimum fee for validator registration transaction', () => {
			// Arrange
			const validatorRegisterTransaction = {
				...validTransaction,
				module: 'pos',
				command: 'register',
				params: { username: 'validator11' },
				signatures: [],
			};
			const additionalFee = BigInt(1000000000);
			const options = { minFeePerByte: 1000, numberOfSignatures: 1, additionalFee };
			const validatorRegisterParamsSchema = {
				$id: '/lisk/pos/register',
				type: 'object',
				required: ['username'],
				properties: {
					username: {
						dataType: 'string',
						fieldNumber: 1,
						minLength: 1,
						maxLength: 20,
					},
				},
			};
			const minFee = computeMinFee(
				validatorRegisterTransaction,
				validatorRegisterParamsSchema,
				options,
			);

			// Assert
			expect(minFee).toBeDefined();
			expect(minFee).toMatchSnapshot();
			// get bytes with the computed min fee with 1 signature
			const minFeeForBytes =
				getBytes(
					{
						...validatorRegisterTransaction,
						fee: minFee,
						signatures: [Buffer.alloc(64, 255)],
					},
					validatorRegisterParamsSchema,
				).length * 1000;
			expect(BigInt(minFeeForBytes) + additionalFee).toEqual(minFee);
		});
	});
});
