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

import { Codec } from '../src/codec';
import * as booleanDecoding from '../fixtures/boolean_encodings.json';
import * as numberDecoding from '../fixtures/number_encodings.json';
import * as bytesDecoding from '../fixtures/bytes_encodings.json';
import * as stringDecoding from '../fixtures/string_encodings.json';
import * as objectDecoding from '../fixtures/objects_encodings.json';
import * as arrayDecoding from '../fixtures/arrays_encodings.json';
import * as blockDecoding from '../fixtures/block_encodings.json';
import * as blockHeaderDecoding from '../fixtures/block_header_encodings.json';
import * as blockAssetDecoding from '../fixtures/block_asset_encodings.json';
import * as genesisBlockAssetDecoding from '../fixtures/genesis_block_encodings.json';
import * as accountDecoding from '../fixtures/account_encodings.json';
import * as transactionDecoding from '../fixtures/transaction_encodings.json';
import * as peerInfoDecoding from '../fixtures/peer_info_sample_encoding.json';
import * as nestedArrayDecoding from '../fixtures/nested_array_encoding.json';

describe('decode', () => {
	describe('boolean decoding', () => {
		for (const testCase of booleanDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(
					testCase.input.schema,
					Buffer.from(testCase.output.value, 'hex'),
				);
				expect(result).toEqual(testCase.input.object);
			});
		}
	});

	describe('number decoding', () => {
		describe('uint32/sint32 decoding', () => {
			for (const testCase of numberDecoding.testCases.slice(0, 2)) {
				it(testCase.description, () => {
					const codec = new Codec();
					const result = codec.decode(
						testCase.input.schema,
						Buffer.from(testCase.output.value, 'hex'),
					);
					expect(result).toEqual(testCase.input.object);
				});
			}
		});

		describe('uint64/sint64 decoding', () => {
			for (const testCase of numberDecoding.testCases.slice(2, 4)) {
				it(testCase.description, () => {
					const codec = new Codec();
					const result = codec.decode(
						testCase.input.schema,
						Buffer.from(testCase.output.value, 'hex'),
					);
					expect(result).toEqual({
						...testCase.input.object,
						number: BigInt(testCase.input.object.number),
					});
				});
			}
		});
	});

	describe('bytes decoding', () => {
		for (const testCase of bytesDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(
					testCase.input.schema,
					Buffer.from(testCase.output.value, 'hex'),
				);
				expect(result).toEqual({
					...testCase.input.object,
					address: Buffer.from(testCase.input.object.address.data),
				});
			});
		}
	});

	describe('string decoding', () => {
		for (const testCase of stringDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(
					testCase.input.schema,
					Buffer.from(testCase.output.value, 'hex'),
				);
				expect(result).toEqual(testCase.input.object);
			});
		}
	});

	describe('object decoding', () => {
		it('Encoding of object', () => {
			const testCase = objectDecoding.testCases[0];
			const codec = new Codec();
			const result = codec.decode(
				testCase.input.schema as any,
				Buffer.from(testCase.output.value, 'hex'),
			);
			expect(result).toEqual({
				...testCase.input.object,
				balance: BigInt(testCase.input.object.balance),
				address: Buffer.from(testCase.input.object.address?.data as number[]),
			});
		});

		it('Encoding of object with optional property', () => {
			const testCase = objectDecoding.testCases[1];
			const codec = new Codec();
			const result = codec.decode(
				testCase.input.schema as any,
				Buffer.from(testCase.output.value, 'hex'),
			);
			expect(result).toEqual({
				...testCase.input.object,
				value: BigInt(testCase.input.object.value),
				data: Buffer.alloc(0),
			});
		});
	});

	describe('array decoding', () => {
		describe('array decoding except object', () => {
			// Index 3 is the object test, which needs special handling
			const testCases = [
				...arrayDecoding.testCases.slice(0, 3),
				...arrayDecoding.testCases.slice(4),
			];
			for (const testCase of testCases) {
				it(testCase.description, () => {
					const codec = new Codec();
					const result = codec.decode(
						testCase.input.schema as any,
						Buffer.from(testCase.output.value, 'hex'),
					);
					expect(result).toEqual(testCase.input.object);
				});
			}
		});

		it('Encoding of array of object', () => {
			const testCase = arrayDecoding.testCases[3];
			const codec = new Codec();
			const result = codec.decode(
				testCase.input.schema as any,
				Buffer.from(testCase.output.value, 'hex'),
			);
			expect(result).toEqual({
				...testCase.input.object,
				myArray: testCase.input.object.myArray?.map(l => ({
					...l,
					amount: BigInt(l.amount),
				})),
			});
		});
	});

	describe('block decoding', () => {
		for (const testCase of blockDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(
					testCase.input.schema,
					Buffer.from(testCase.output.value, 'hex'),
				);
				expect(result).toEqual({
					...testCase.input.object,
					header: Buffer.from(testCase.input.object.header.data),
					payload: testCase.input.object.payload.map(p => Buffer.from(p.data)),
				});
			});
		}
	});

	describe('block header decoding', () => {
		for (const testCase of blockHeaderDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(
					testCase.input.schema,
					Buffer.from(testCase.output.value, 'hex'),
				);
				expect(result).toEqual({
					...testCase.input.object,
					reward: BigInt(testCase.input.object.reward),
					asset: Buffer.from(testCase.input.object.asset.data),
					transactionRoot: Buffer.from(testCase.input.object.transactionRoot.data),
					signature: Buffer.from(testCase.input.object.signature.data),
					previousBlockID: Buffer.from(testCase.input.object.previousBlockID.data),
					generatorPublicKey: Buffer.from(testCase.input.object.generatorPublicKey.data),
				});
			});
		}
	});

	describe('block asset decoding', () => {
		for (const testCase of blockAssetDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(
					testCase.input.schema,
					Buffer.from(testCase.output.value, 'hex'),
				);
				expect(result).toEqual({
					...testCase.input.object,
					seedReveal: Buffer.from(testCase.input.object.seedReveal.data),
				});
			});
		}
	});

	describe('genesis block asset decoding', () => {
		for (const testCase of genesisBlockAssetDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(
					testCase.input.schema,
					Buffer.from(testCase.output.value, 'hex'),
				);
				expect(result).toEqual({
					...testCase.input.object,
					initDelegates: testCase.input.object.initDelegates.map(d => Buffer.from(d.data)),
					accounts: testCase.input.object.accounts.map(acc => ({
						...acc,
						address: Buffer.from(acc.address.data),
						balance: BigInt(acc.balance),
						publicKey: Buffer.from(acc.publicKey.data),
						nonce: BigInt(acc.nonce),
						keys: {
							...acc.keys,
							mandatoryKeys: acc.keys.mandatoryKeys.map((b: any) => Buffer.from(b.data)),
							optionalKeys: acc.keys.optionalKeys.map((b: any) => Buffer.from(b.data)),
						},
						asset: {
							...acc.asset,
							delegate: {
								...acc.asset.delegate,
								totalVotesReceived: BigInt(acc.asset.delegate.totalVotesReceived),
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
				});
			});
		}
	});

	describe('account decoding', () => {
		for (const testCase of accountDecoding.testCases) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(
					testCase.input.schema as any,
					Buffer.from(testCase.output.value, 'hex'),
				);
				expect(result).toEqual({
					...testCase.input.object,
					address: Buffer.from(testCase.input.object.address.data),
					balance: BigInt(testCase.input.object.balance),
					publicKey: Buffer.from(testCase.input.object.publicKey.data),
					nonce: BigInt(testCase.input.object.nonce),
					keys: {
						...testCase.input.object.keys,
						mandatoryKeys: testCase.input.object.keys.mandatoryKeys.map(b => Buffer.from(b.data)),
						optionalKeys: testCase.input.object.keys.optionalKeys.map((b: any) =>
							Buffer.from(b.data),
						),
					},
					asset: {
						...testCase.input.object.asset,
						delegate: {
							...testCase.input.object.asset.delegate,
							totalVotesReceived: BigInt(testCase.input.object.asset.delegate.totalVotesReceived),
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
				});
			});
		}
	});

	describe('transaction decoding', () => {
		it('Encoding of base transaction', () => {
			const testCase = transactionDecoding.testCases[0];
			const codec = new Codec();
			const result = codec.decode(
				testCase.input.schema as any,
				Buffer.from(testCase.output.value, 'hex'),
			);
			expect(result).toEqual({
				...testCase.input.object,
				nonce: BigInt(testCase.input.object.nonce),
				fee: BigInt(testCase.input.object.fee),
				senderPublicKey: Buffer.from((testCase.input.object.senderPublicKey as any).data),
				signatures: testCase.input.object.signatures?.map(v => Buffer.from(v.data)),
				asset: Buffer.from((testCase.input.object.asset as any).data),
			});
		});

		it('Encoding of vote transaction asset', () => {
			const testCase = transactionDecoding.testCases[1];
			const codec = new Codec();
			const result = codec.decode(
				testCase.input.schema as any,
				Buffer.from(testCase.output.value, 'hex'),
			);
			expect(result).toEqual({
				votes: testCase.input.object.votes?.map(v => ({
					delegateAddress: Buffer.from(v.delegateAddress.data),
					amount: BigInt(v.amount),
				})),
			});
		});

		describe('Encoding of multi signature transaction asset', () => {
			const testCases = transactionDecoding.testCases.slice(2, 4);
			for (const testCase of testCases) {
				it(testCase.description, () => {
					const codec = new Codec();
					const result = codec.decode(
						testCase.input.schema as any,
						Buffer.from(testCase.output.value, 'hex'),
					);
					expect(result).toEqual({
						...testCase.input.object,
						mandatoryKeys: testCase.input.object.mandatoryKeys?.map(k => Buffer.from(k.data)),
						optionalKeys: testCase.input.object.optionalKeys?.map(k => Buffer.from(k.data)),
					});
				});
			}
		});
	});

	describe('peer info decoding', () => {
		it('should decode object without options', () => {
			const testCase = peerInfoDecoding.testCases[0];
			const codec = new Codec();
			const result = codec.decode(testCase.input.schema, Buffer.from(testCase.output.value, 'hex'));
			expect(result).toEqual(testCase.input.object);
		});

		it('should decode object without optional fields', () => {
			const testCase = peerInfoDecoding.testCases[1];
			const codec = new Codec();
			const result = codec.decode(testCase.input.schema, Buffer.from(testCase.output.value, 'hex'));
			expect(result).toEqual({
				...testCase.input.object,
				height: 0,
				networkId: '',
				nonce: '',
				networkVersion: '',
			});
		});
	});

	describe('nested array decoding', () => {
		for (const testCase of nestedArrayDecoding.testCases.slice(1)) {
			it(testCase.description, () => {
				const codec = new Codec();
				const result = codec.decode(
					testCase.input.schema,
					Buffer.from(testCase.output.value, 'hex'),
				);
				expect(result).toEqual(testCase.input.object);
			});
		}
	});
});
