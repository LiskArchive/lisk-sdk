/* eslint-disable camelcase */
/*
 * Copyright © 2021 Lisk Foundation
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

import {
	createAggSig,
	signData,
	verifyAggSig,
	verifyWeightedAggSig,
	verifyData,
	getPrivateKeyFromPhraseAndPath,
} from '../src/bls';
import { getAllFiles, hexToBuffer, loadSpecFile } from './helpers';

describe('bls_lib', () => {
	describe('signData', () => {
		describe.each(getAllFiles(['bls_specs/sign_bls']))('%s', ({ path }) => {
			it('should generate valid signature', () => {
				const {
					input: { sk, tag, netId, message },
					output,
				} = loadSpecFile<{
					input: { sk: string; tag: string; netId: string; message: string };
					output: string;
				}>(path);

				const signature = signData(tag, hexToBuffer(netId), hexToBuffer(message), hexToBuffer(sk));

				expect(signature.toString('hex')).toEqual(hexToBuffer(output).toString('hex'));
			});
		});
	});

	describe('verifyData', () => {
		describe.each(getAllFiles(['bls_specs/verify_bls']))('%s', ({ path }) => {
			it('should verify signatures', () => {
				const {
					input: { pk, tag, netId, message, signature },
					output,
				} = loadSpecFile<{
					input: { pk: string; tag: string; netId: string; message: string; signature: string };
					output: string;
				}>(path);

				const result = verifyData(
					tag,
					hexToBuffer(netId),
					hexToBuffer(message),
					hexToBuffer(signature),
					hexToBuffer(pk),
				);

				expect(result).toEqual(output);
			});
		});
	});

	describe('createAggSig', () => {
		describe.each(getAllFiles(['bls_specs/create_agg_sig']))('%s', ({ path }) => {
			it('should create aggregated signatures', () => {
				const {
					input: { key_list, key_sig_pairs },
					output,
				} = loadSpecFile<{
					input: { key_list: string[]; key_sig_pairs: { pk: string; signature: string }[] };
					output: { aggregation_bits: string; signature: string };
				}>(path);

				const keysList = key_list.map(hexToBuffer);
				const keyPairs = key_sig_pairs.map(({ pk, signature }) => ({
					publicKey: hexToBuffer(pk),
					signature: hexToBuffer(signature),
				}));

				const result = createAggSig(keysList, keyPairs);

				expect(result.aggregationBits.toString('hex')).toEqual(
					hexToBuffer(output.aggregation_bits).toString('hex'),
				);
				expect(result.signature.toString('hex')).toEqual(
					hexToBuffer(output.signature).toString('hex'),
				);
			});
		});
	});

	describe('verifyAggSig', () => {
		describe.each(getAllFiles(['bls_specs/verify_agg_sig']))('%s', ({ path }) => {
			it('should verify aggregated signatures', () => {
				const {
					input: { key_list, aggregation_bits, signature, tag, netId, message },
					output,
				} = loadSpecFile<{
					input: {
						key_list: string[];
						aggregation_bits: string;
						signature: string;
						tag: string;
						netId: string;
						message: string;
					};
					output: boolean;
				}>(path);

				const keysList = key_list.map(hexToBuffer);

				const result = verifyAggSig(
					keysList,
					hexToBuffer(aggregation_bits),
					hexToBuffer(signature),
					tag,
					hexToBuffer(netId),
					hexToBuffer(message),
				);

				expect(result).toEqual(output);
			});
		});
	});

	describe('verifyWeightedAggSig', () => {
		describe.each(getAllFiles(['bls_specs/verify_weighted_agg_sig']))('%s', ({ path }) => {
			it('should verify weighted aggregated signatures', () => {
				const {
					input: { key_list, aggregation_bits, signature, tag, netId, message, weights, threshold },
					output,
				} = loadSpecFile<{
					input: {
						key_list: string[];
						aggregation_bits: string;
						signature: string;
						tag: string;
						netId: string;
						message: string;
						weights: number[];
						threshold: number;
					};
					output: boolean;
				}>(path);

				const keysList = key_list.map(hexToBuffer);

				const result = verifyWeightedAggSig(
					keysList,
					hexToBuffer(aggregation_bits),
					hexToBuffer(signature),
					tag,
					hexToBuffer(netId),
					hexToBuffer(message),
					weights,
					threshold,
				);

				expect(result).toEqual(output);
			});
		});
	});

	describe('getBLSPrivateKeyFromPhraseAndPath', () => {
		const passphrase =
			'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
		it('should get keypair from valid phrase and path', async () => {
			const privateKey = await getPrivateKeyFromPhraseAndPath(passphrase, `m/12381`);
			expect(privateKey.toString('hex')).toBe(
				BigInt(
					'27531519788986738912817629815232258573173656766051821145387425994698573826996',
				).toString(16),
			);
		});
	});
});
