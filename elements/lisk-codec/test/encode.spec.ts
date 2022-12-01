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
 */
import { codec } from '../src/codec';
import { buildTestCases, getAccountFromJSON } from './utils';

import { testCases as accountTestCases } from '../fixtures/account_encodings.json';
import { testCases as arrayTestCases } from '../fixtures/arrays_encodings.json';
import { testCases as blockAssetTestCases } from '../fixtures/block_asset_encodings.json';
import { testCases as blockTestCases } from '../fixtures/block_encodings.json';
import { testCases as blockHeaderTestCases } from '../fixtures/block_header_encodings.json';
import { testCases as booleanTestCases } from '../fixtures/boolean_encodings.json';
import { testCases as bytesTestCases } from '../fixtures/bytes_encodings.json';
import { testCases as cartSampleTestCases } from '../fixtures/cart_sample_encodings.json';
import { testCases as genesisBlockTestCases } from '../fixtures/genesis_block_encodings.json';
import { testCases as nestedArrayTestCases } from '../fixtures/nested_array_encoding.json';
import { testCases as numberTestCases } from '../fixtures/number_encodings.json';
import { testCases as objectsTestCases } from '../fixtures/objects_encodings.json';
import { testCases as peerInfoTestCases } from '../fixtures/peer_info_sample_encoding.json';
import { testCases as stringTestCases } from '../fixtures/string_encodings.json';
import { testCases as transactionTestCases } from '../fixtures/transaction_encodings.json';

describe('encode', () => {
	describe('account', () => {
		it.each(buildTestCases(accountTestCases))('%s', ({ input, output }) => {
			const message = getAccountFromJSON(input.object);

			const result = codec.encode(input.schema, message);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('array', () => {
		const isObjectArray = (x: any): x is { address: string; amount: string }[] =>
			typeof x[0] === 'object' && x[0].address;

		it.each(buildTestCases(arrayTestCases))('%s', ({ input, output }) => {
			let message: any = { ...input.object };

			if (isObjectArray(message.list)) {
				message = {
					list: message.list.map(
						(o: { address: string; amount: string | number | bigint | boolean }) => ({
							...o,
							amount: BigInt(o.amount),
						}),
					),
				};
			}

			const result = codec.encode(input.schema, message);

			expect(result.toString('hex')).toEqual(output.value);
		});

		it('should encode empty array where the datatype of the items implies non-packed encoding e.g. string', () => {
			const schema = {
				type: 'object',
				$id: 'array-schema-string',
				properties: {
					list: {
						type: 'array',
						items: {
							dataType: 'string',
						},
						fieldNumber: 1,
					},
				},
			};

			const result = codec.encode(schema, { list: [] });

			expect(result.toString('hex')).toBe('');
		});
	});

	describe('block_asset', () => {
		it.each(buildTestCases(blockAssetTestCases))('%s', ({ input, output }) => {
			const message = {
				...input.object,
				seedReveal: Buffer.from(input.object.seedReveal, 'hex'),
			};

			const result = codec.encode(input.schema, message);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('block', () => {
		it.each(buildTestCases(blockTestCases))('%s', ({ input, output }) => {
			const object = {
				header: Buffer.from(input.object.header, 'hex'),
				payload: input.object.payload.map(p => Buffer.from(p, 'hex')),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('block_header', () => {
		it.each(buildTestCases(blockHeaderTestCases))('%s', ({ input, output }) => {
			const object = {
				...input.object,
				previousBlockID: Buffer.from(input.object.previousBlockID, 'hex'),
				transactionRoot: Buffer.from(input.object.transactionRoot, 'hex'),
				generatorPublicKey: Buffer.from(input.object.generatorPublicKey, 'hex'),
				reward: BigInt(input.object.reward),
				asset: Buffer.from(input.object.asset, 'hex'),
				signature: Buffer.from(input.object.signature, 'hex'),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('boolean', () => {
		it.each(buildTestCases(booleanTestCases))('%s', ({ input, output }) => {
			const result = codec.encode(input.schema, input.object);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('bytes', () => {
		it.each(buildTestCases(bytesTestCases))('%s', ({ input, output }) => {
			const object = {
				...input.object,
				address: Buffer.from(input.object.address, 'hex'),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('cart_sample', () => {
		it.each(buildTestCases(cartSampleTestCases))('%s', ({ input, output }) => {
			const result = codec.encode(input.schema, input.object);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('genesis_block', () => {
		it.each(buildTestCases(genesisBlockTestCases))('%s', ({ input, output }) => {
			const object = {
				...input.object,
				initValidators: input.object.initValidators.map(d => Buffer.from(d, 'hex')),
				accounts: input.object.accounts.map(a => getAccountFromJSON(a)),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('nested_array', () => {
		it.each(buildTestCases(nestedArrayTestCases))('%s', ({ input, output }) => {
			const result = codec.encode(input.schema, input.object);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('number', () => {
		it.each(buildTestCases(numberTestCases))('%s', ({ input, output }) => {
			const object = {
				...input.object,
				number:
					typeof input.object.number === 'string'
						? BigInt(input.object.number)
						: input.object.number,
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('objects', () => {
		it(objectsTestCases[0].description, () => {
			const testCase = objectsTestCases[0];
			const input = testCase.input as any;

			const object = {
				...input.object,
				address: Buffer.from(input.object.address, 'hex'),
				balance: BigInt(input.object.balance),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(testCase.output.value);
		});

		it(objectsTestCases[1].description, () => {
			const testCase = objectsTestCases[1];
			const input = testCase.input as any;

			const object = {
				...input.object,
				value: BigInt(input.object.value),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(testCase.output.value);
		});

		it('should encode when object has fieldNumbers which are not sequential', () => {
			const schema = {
				$id: 'test/fieldNumberNotSeq',
				type: 'object',
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					balance: {
						dataType: 'uint32',
						fieldNumber: 3,
					},
				},
			};

			expect(codec.encode(schema, { address: Buffer.alloc(1), balance: 1 })).toBeInstanceOf(Buffer);
		});
	});

	describe('peer info', () => {
		it.each(buildTestCases(peerInfoTestCases))('%s', ({ input, output }) => {
			const result = codec.encode(input.schema, input.object);

			expect(result.toString('hex')).toEqual(output.value);
		});
	});

	describe('string', () => {
		it.each(buildTestCases(stringTestCases))('%s', ({ input, output }) => {
			const result = codec.encode(input.schema, input.object);

			expect(result.toString('hex')).toEqual(output.value);
		});

		it('should encode a string that contains some non-ASCII characters', () => {
			const schema = {
				$id: 'string-schema',
				type: 'object',
				properties: {
					data: {
						dataType: 'string',
						fieldNumber: 1,
					},
				},
			};

			const result = codec.encode(schema, {
				data: 'Checkout Lisk SDK!¢£¡',
			});

			expect(result).toBeInstanceOf(Buffer);
		});
	});

	describe('transaction', () => {
		// Base transaction
		it(transactionTestCases[0].description, () => {
			const testCase = transactionTestCases[0];
			const input = testCase.input as any;

			const object = {
				...input.object,
				nonce: BigInt(input.object.nonce),
				fee: BigInt(input.object.fee),
				senderPublicKey: Buffer.from(input.object.senderPublicKey, 'hex'),
				asset: Buffer.from(input.object.asset, 'hex'),
				signatures: input.object.signatures.map((s: string) => Buffer.from(s, 'hex')),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(testCase.output.value);
		});

		// stake asset
		it(transactionTestCases[1].description, () => {
			const testCase = transactionTestCases[1];
			const input = testCase.input as any;

			const object = {
				...input.object,
				stakes: input.object.stakes.map((v: any) => ({
					validatorAddress: Buffer.from(v.validatorAddress, 'hex'),
					amount: BigInt(v.amount),
				})),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(testCase.output.value);
		});

		// multisignature asset
		it(transactionTestCases[2].description, () => {
			const testCase = transactionTestCases[2];
			const input = testCase.input as any;

			const object = {
				...input.object,
				mandatoryKeys: input.object.mandatoryKeys.map((v: string) => Buffer.from(v, 'hex')),
				optionalKeys: input.object.optionalKeys.map((v: string) => Buffer.from(v, 'hex')),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(testCase.output.value);
		});

		// multisignature asset
		it(transactionTestCases[3].description, () => {
			const testCase = transactionTestCases[3];
			const input = testCase.input as any;

			const object = {
				...input.object,
				mandatoryKeys: input.object.mandatoryKeys.map((v: string) => Buffer.from(v, 'hex')),
				optionalKeys: input.object.optionalKeys.map((v: string) => Buffer.from(v, 'hex')),
			};

			const result = codec.encode(input.schema, object);

			expect(result.toString('hex')).toEqual(testCase.output.value);
		});
	});
});
