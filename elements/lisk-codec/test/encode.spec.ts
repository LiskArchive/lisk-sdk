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

import { testCases as objectTestCases } from '../fixtures/objects_encodings.json';
import { testCases as bytesTestCases } from '../fixtures/bytes_encodings.json';
import { testCases as stringTestCases } from '../fixtures/string_encodings.json';
import { testCases as booleanTestCases } from '../fixtures/boolean_encodings.json';
import { testCases as numberTestCases } from '../fixtures/number_encodings.json';
import { testCases as CartTestCases } from '../fixtures/cart_sample_encoding.json';
import { testCases as arrayTestCases } from '../fixtures/arrays_encodings.json';
import * as blockEncoding from '../fixtures/block_encodings.json';
import * as blockHeaderEncoding from '../fixtures/block_header_encodings.json';
import * as blockAssetEncoding from '../fixtures/block_asset_encodings.json';
import * as genesisBlockAssetEncoding from '../fixtures/genesis_block_encodings.json';
import * as accountEncoding from '../fixtures/account_encodings.json';
import * as transactionEncoding from '../fixtures/transaction_encodings.json';
import * as peerInfoEncoding from '../fixtures/peer_info_sample_encoding.json';
import * as nestedArrayEncoding from '../fixtures/nested_array_encoding.json';

describe('encode', () => {
	describe('objects', () => {
		it('should encode an object with nested objects to Buffer', () => {
			const objectFixtureInput = objectTestCases[0].input;
			const objectFixtureOutput = objectTestCases[0].output;
			const message = objectFixtureInput.object;

			// Replace the JSON representation of buffer with an actual buffer
			(message as any).address = Buffer.from((message as any).address.data);
			// Fix number not being bigint
			(message as any).balance = BigInt(message.balance);

			const { schema } = objectFixtureInput;

			const { value: expectedOutput } = objectFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should not encode missing propertiees of an object to Buffer', () => {
			const objectFixtureInput = objectTestCases[1].input;
			const objectFixtureOutput = objectTestCases[1].output;
			const message = objectFixtureInput.object;
			const { schema } = objectFixtureInput;
			const { value: expectedOutput } = objectFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode array of objects containing array of objects', () => {
			const objectFixtureInput = CartTestCases[0].input;
			const objectFixtureOutput = CartTestCases[0].output;
			const message = objectFixtureInput.object;
			const { schema } = objectFixtureInput;
			const { value: expectedOutput } = objectFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('bytes', () => {
		it('should encode a chunk of bytes as bytes with no changes', () => {
			const bytesFixtureInput = bytesTestCases[0].input;
			const bytesFixtureOutput = bytesTestCases[0].output;
			const message = bytesFixtureInput.object;

			const originalMessageBytes = Buffer.from(
				bytesFixtureInput.object.address.data,
			).toString('hex');
			// Replace the JSON representation of buffer with an actual buffer
			(message as any).address = Buffer.from(message.address.data);
			const { schema } = bytesFixtureInput;
			const { value: expectedOutput } = bytesFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			const liskBinaryMessageAsHex = liskBinaryMessage.toString('hex');

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);

			expect(liskBinaryMessageAsHex.substring(4)).toEqual(originalMessageBytes);
		});

		it('should encode empty bytes', () => {
			const bytesFixtureInput = bytesTestCases[1].input;
			const bytesFixtureOutput = bytesTestCases[1].output;
			const message = bytesFixtureInput.object;
			const { schema } = bytesFixtureInput;

			(message as any).address = Buffer.from(message.address.data);
			const { value: expectedOutput } = bytesFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('strings', () => {
		it('should encode a regular strings', () => {
			const stringFixtureInput = stringTestCases[0].input;
			const stringFixtureOutput = stringTestCases[0].output;
			const { object: message, schema } = stringFixtureInput;
			const { value: expectedOutput } = stringFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode empty string', () => {
			const stringFixtureInput = stringTestCases[1].input;
			const stringFixtureOutput = stringTestCases[1].output;
			const { object: message, schema } = stringFixtureInput;
			const { value: expectedOutput } = stringFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode symbols string', () => {
			const stringFixtureInput = stringTestCases[2].input;
			const stringFixtureOutput = stringTestCases[2].output;
			const { object: message, schema } = stringFixtureInput;
			const { value: expectedOutput } = stringFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('booleans', () => {
		it('should encode boolean true', () => {
			const booleanFixtureInput = booleanTestCases[0].input;
			const booleanFixtureOutput = booleanTestCases[0].output;
			const { object: message, schema } = booleanFixtureInput;
			const { value: expectedOutput } = booleanFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode boolean false', () => {
			const booleanFixtureInput = booleanTestCases[1].input;
			const booleanFixtureOutput = booleanTestCases[1].output;
			const { object: message, schema } = booleanFixtureInput;
			const { value: expectedOutput } = booleanFixtureOutput;
			const liskBinaryMessage = codec.encode(schema as any, message as any);

			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('numbers', () => {
		it('should encode unsigned 32', () => {
			const numberFixtureInput = numberTestCases[0].input;
			const numberFixtureOutput = numberTestCases[0].output;
			const { object: message, schema } = numberFixtureInput;
			const { value: expectedOutput } = numberFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode signed 32', () => {
			const numberFixtureInput = numberTestCases[1].input;
			const numberFixtureOutput = numberTestCases[1].output;
			const { object: message, schema } = numberFixtureInput;
			const { value: expectedOutput } = numberFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode unsigned 64', () => {
			const numberFixtureInput = numberTestCases[2].input;
			const numberFixtureOutput = numberTestCases[2].output;
			const { object: message, schema } = numberFixtureInput;
			(message as any).number = BigInt(message.number);
			const { value: expectedOutput } = numberFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode signed 64', () => {
			const numberFixtureInput = numberTestCases[3].input;
			const numberFixtureOutput = numberTestCases[3].output;
			const { object: message, schema } = numberFixtureInput;
			(message as any).number = BigInt(message.number);
			const { value: expectedOutput } = numberFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('arrays', () => {
		it('should encode array of integers', () => {
			const arrayFixtureInput = arrayTestCases[0].input;
			const arrayFixtureOutput = arrayTestCases[0].output;
			const { object: message, schema } = arrayFixtureInput;
			const { value: expectedOutput } = arrayFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode array of booleans', () => {
			const arrayFixtureInput = arrayTestCases[1].input;
			const arrayFixtureOutput = arrayTestCases[1].output;
			const { object: message, schema } = arrayFixtureInput;
			const { value: expectedOutput } = arrayFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode array of strings', () => {
			const arrayFixtureInput = arrayTestCases[2].input;
			const arrayFixtureOutput = arrayTestCases[2].output;
			const { object: message, schema } = arrayFixtureInput;
			const { value: expectedOutput } = arrayFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});

		it('should encode array of objects', () => {
			const arrayFixtureInput = arrayTestCases[3].input;
			const arrayFixtureOutput = arrayTestCases[3].output;
			const { object: message, schema } = arrayFixtureInput;
			(message as any).myArray.forEach((element: { amount: any }) => {
				// eslint-disable-next-line no-param-reassign
				(element as any).amount = BigInt(element.amount);
			});

			const { value: expectedOutput } = arrayFixtureOutput;

			const liskBinaryMessage = codec.encode(schema as any, message as any);
			expect(liskBinaryMessage.toString('hex')).toEqual(expectedOutput);
		});
	});

	describe('block encoding', () => {
		for (const testCase of blockEncoding.testCases) {
			it(testCase.description, () => {
				const message = {
					header: Buffer.from(testCase.input.object.header.data),
					payload: testCase.input.object.payload.map(payloadItem =>
						Buffer.from(payloadItem.data),
					),
				};

				const result = codec.encode(testCase.input.schema, message);
				expect(result.toString('hex')).toEqual(testCase.output.value);
			});
		}
	});

	describe('block header encoding', () => {
		for (const testCase of blockHeaderEncoding.testCases) {
			it(testCase.description, () => {
				const message = {
					...testCase.input.object,
					reward: BigInt(testCase.input.object.reward),
					asset: Buffer.from(testCase.input.object.asset.data),
					signature: Buffer.from(testCase.input.object.signature.data),
					transactionRoot: Buffer.from(
						testCase.input.object.transactionRoot.data,
					),
					previousBlockID: Buffer.from(
						testCase.input.object.previousBlockID.data,
					),
					generatorPublicKey: Buffer.from(
						testCase.input.object.generatorPublicKey.data,
					),
				};

				const result = codec.encode(testCase.input.schema, message);
				expect(result.toString('hex')).toEqual(testCase.output.value);
			});
		}
	});

	describe('block asset encoding', () => {
		for (const testCase of blockAssetEncoding.testCases) {
			it(testCase.description, () => {
				const message = {
					...testCase.input.object,
					seedReveal: Buffer.from(testCase.input.object.seedReveal.data),
				};

				const result = codec.encode(testCase.input.schema, message);

				expect(result.toString('hex')).toEqual(testCase.output.value);
			});
		}
	});

	describe('genesis block asset encoding', () => {
		for (const testCase of genesisBlockAssetEncoding.testCases) {
			it(testCase.description, () => {
				const message = {
					...testCase.input.object,
					initDelegates: testCase.input.object.initDelegates.map(d =>
						Buffer.from(d.data),
					),
					accounts: testCase.input.object.accounts.map(acc => ({
						...acc,
						address: Buffer.from(acc.address.data),
						balance: BigInt(acc.balance),
						publicKey: Buffer.from(acc.publicKey.data),
						nonce: BigInt(acc.nonce),
						keys: {
							...acc.keys,
							mandatoryKeys: acc.keys.mandatoryKeys.map((b: any) =>
								Buffer.from(b.data),
							),
							optionalKeys: acc.keys.optionalKeys.map((b: any) =>
								Buffer.from(b.data),
							),
						},
						asset: {
							...acc.asset,
							delegate: {
								...acc.asset.delegate,
								totalVotesReceived: BigInt(
									acc.asset.delegate.totalVotesReceived,
								),
							},
							sentVotes: acc.asset.sentVotes.map(v => ({
								...v,
								delegateAddress: Buffer.from(v.delegateAddress.data),
								amount: BigInt(v.amount),
							})),
							unlocking: acc.asset.unlocking.map((v: any) => ({
								...v,
								delegateAddress: Buffer.from(v.delegateAddress.data),
								amount: BigInt(v.amount),
							})),
						},
					})),
				};

				const result = codec.encode(testCase.input.schema, message);

				expect(result.toString('hex')).toEqual(testCase.output.value);
			});
		}
	});

	describe('account encoding', () => {
		for (const testCase of accountEncoding.testCases) {
			it(testCase.description, () => {
				const message = {
					...testCase.input.object,
					address: Buffer.from(testCase.input.object.address.data),
					balance: BigInt(testCase.input.object.balance),
					publicKey: Buffer.from(testCase.input.object.publicKey.data),
					nonce: BigInt(testCase.input.object.nonce),
					keys: {
						...testCase.input.object.keys,
						mandatoryKeys: testCase.input.object.keys.mandatoryKeys.map(b =>
							Buffer.from(b.data),
						),
						optionalKeys: testCase.input.object.keys.optionalKeys.map(
							(b: any) => Buffer.from(b.data),
						),
					},
					asset: {
						...testCase.input.object.asset,
						delegate: {
							...testCase.input.object.asset.delegate,
							totalVotesReceived: BigInt(
								testCase.input.object.asset.delegate.totalVotesReceived,
							),
						},
						sentVotes: testCase.input.object.asset.sentVotes.map(v => ({
							...v,
							delegateAddress: Buffer.from(v.delegateAddress.data),
							amount: BigInt(v.amount),
						})),
						unlocking: testCase.input.object.asset.unlocking.map(v => ({
							...v,
							delegateAddress: Buffer.from(v.delegateAddress.data),
							amount: BigInt(v.amount),
						})),
					},
				};

				const result = codec.encode(testCase.input.schema as any, message);

				expect(result.toString('hex')).toEqual(testCase.output.value);
			});
		}
	});

	describe('transaction encoding', () => {
		it('Encoding of base transaction', () => {
			const testCase = transactionEncoding.testCases[0];
			const message = {
				...testCase.input.object,
				nonce: BigInt(testCase.input.object.nonce),
				fee: BigInt(testCase.input.object.fee),
				senderPublicKey: Buffer.from(
					(testCase.input.object.senderPublicKey as any).data,
				),
				signatures: testCase.input.object.signatures?.map(v =>
					Buffer.from(v.data),
				),
				asset: Buffer.from((testCase.input.object.asset as any).data),
			};

			const result = codec.encode(testCase.input.schema as any, message as any);
			expect(result.toString('hex')).toEqual(testCase.output.value);
		});

		it('Encoding of vote transaction asset', () => {
			const testCase = transactionEncoding.testCases[1];
			const message = {
				votes: testCase.input.object.votes?.map(v => ({
					delegateAddress: Buffer.from(v.delegateAddress.data),
					amount: BigInt(v.amount),
				})),
			};

			const result = codec.encode(testCase.input.schema as any, message as any);
			expect(result.toString('hex')).toEqual(testCase.output.value);
		});

		describe('Encoding of multi signature transaction asset', () => {
			const testCases = transactionEncoding.testCases.slice(2, 4);
			for (const testCase of testCases) {
				it(testCase.description, () => {
					const message = {
						...testCase.input.object,
						mandatoryKeys: testCase.input.object.mandatoryKeys?.map(k =>
							Buffer.from(k.data),
						),
						optionalKeys: testCase.input.object.optionalKeys?.map(k =>
							Buffer.from(k.data),
						),
					};

					const result = codec.encode(
						testCase.input.schema as any,
						message as any,
					);
					expect(result.toString('hex')).toEqual(testCase.output.value);
				});
			}
		});
	});

	describe('peer info encoding', () => {
		for (const testCase of peerInfoEncoding.testCases) {
			it(testCase.description, () => {
				const result = codec.encode(
					testCase.input.schema,
					testCase.input.object,
				);
				expect(result.toString('hex')).toEqual(testCase.output.value);
			});
		}
	});

	describe('nested array encoding', () => {
		for (const testCase of nestedArrayEncoding.testCases) {
			it(testCase.description, () => {
				const result = codec.encode(
					testCase.input.schema,
					testCase.input.object,
				);
				expect(result.toString('hex')).toEqual(testCase.output.value);
			});
		}
	});
});
