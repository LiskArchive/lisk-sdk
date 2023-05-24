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
	blsAggregate,
	blsAggregateVerify,
	blsFastAggregateVerify,
	blsSign,
	blsSkToPk,
	blsVerify,
	blsPopProve,
	blsPopVerify,
} from '../../src/bls_lib';
import { getAllFiles, hexToBuffer, loadSpecFile } from '../helpers';

interface EthSignSpec {
	input: {
		privkey: string;
		message: string;
	};
	output: string | null;
}

interface EthVerifySpec {
	input: {
		pubkey: string;
		message: string;
		signature: string;
	};
	output: boolean;
}

interface EthAggrSpec {
	input: string[];
	output: string;
}

interface EthAggrVerifySpec {
	input: { pubkeys: string[]; messages: string[]; signature: string };
	output: boolean;
}

interface EthFastAggrVerifySpec {
	input: { pubkeys: string[]; message: string; signature: string };
	output: boolean;
}

describe('bls_lib', () => {
	describe('blsSkToPk', () => {
		describe.each(getAllFiles(['bls_specs/sk_to_pk']))('%s', ({ path }) => {
			it('should convert to valid pk', () => {
				const { input, output } = loadSpecFile<{ input: string; output: string }>(path);

				expect(blsSkToPk(hexToBuffer(input)).toString('hex')).toEqual(
					hexToBuffer(output).toString('hex'),
				);
			});
		});
	});

	describe('blsSign', () => {
		// Signing with the zero private key is not a use case according to the BLS specifications
		describe.each(getAllFiles(['eth2_bls_specs/sign', 'bls_specs/sign'], /sign_case_zero_privkey/))(
			'%s',
			({ path }) => {
				it('should generate valid signature', () => {
					const {
						input: { privkey, message },
						output,
					} = loadSpecFile<EthSignSpec>(path);
					const signature = blsSign(hexToBuffer(privkey), hexToBuffer(message));

					expect(signature.toString('hex')).toEqual(hexToBuffer(output).toString('hex'));
				});
			},
		);

		it('returns expected signature when secret key is zero', () => {
			const sk = Buffer.alloc(32);
			const message = Buffer.from('Hello, World!');

			const signature = blsSign(sk, message);

			expect(signature).toEqual(Buffer.concat([Buffer.from([192]), Buffer.alloc(95)]));
		});
	});

	describe('blsVerify', () => {
		describe.each(getAllFiles(['eth2_bls_specs/verify', 'bls_specs/verify']))('%s', ({ path }) => {
			it('should verify signatures', () => {
				const {
					input: { pubkey, message, signature },
					output,
				} = loadSpecFile<EthVerifySpec>(path);

				const verify = blsVerify(hexToBuffer(pubkey), hexToBuffer(message), hexToBuffer(signature));

				expect(verify).toEqual(output);
			});
		});
	});

	describe('blsAggregate', () => {
		describe.each(getAllFiles(['eth2_bls_specs/aggregate', 'bls_specs/aggregate']))(
			'%s',
			({ path }) => {
				it('should aggregate signatures', () => {
					const { input, output } = loadSpecFile<EthAggrSpec>(path);

					const signature = blsAggregate(input.map(hexToBuffer));

					if (signature) {
						expect(signature.toString('hex')).toEqual(hexToBuffer(output).toString('hex'));
					} else {
						// In one of eth2 specs, they refer null as INVALID case
						const expectedOutput = output ?? false;
						expect(signature).toEqual(expectedOutput);
					}
				});
			},
		);
	});

	describe('blsAggregateVerify', () => {
		describe.each(getAllFiles(['eth2_bls_specs/aggregate_verify']))('%s', ({ path }) => {
			it('should verify messages', () => {
				const {
					input: { pubkeys, messages, signature },
					output,
				} = loadSpecFile<EthAggrVerifySpec>(path);

				const verify = blsAggregateVerify(
					pubkeys.map(hexToBuffer),
					messages.map(hexToBuffer),
					hexToBuffer(signature),
				);

				expect(verify).toEqual(output);
			});
		});
	});

	describe('blsFastAggregateVerify', () => {
		// The ignored test case "fast_aggregate_verify_infinity_pubkey" contains pk at infinity (identify point)
		// Since implementation standard https://tools.ietf.org/html/draft-irtf-cfrg-bls-signature-04#section-3.3.4
		// specifies to not validate public keys in "FastAggregateVerify"
		// so we why our implementation returns "true" and eth2 specs mentioned it as "false"
		describe.each(
			getAllFiles(
				['eth2_bls_specs/fast_aggregate_verify', 'bls_specs/fast_aggregate_verify'],
				/fast_aggregate_verify_infinity_pubkey/,
			),
		)('%s', ({ path }) => {
			it('should verify message', () => {
				const {
					input: { pubkeys, message, signature },
					output,
				} = loadSpecFile<EthFastAggrVerifySpec>(path);

				const verify = blsFastAggregateVerify(
					pubkeys.map(hexToBuffer),
					hexToBuffer(message),
					hexToBuffer(signature),
				);

				expect(verify).toEqual(output);
			});
		});
	});

	describe('blsPopProve', () => {
		describe.each(getAllFiles(['bls_specs/pop_prove']))('%s', ({ path }) => {
			it('should create valid proof of possession', () => {
				const { input, output } = loadSpecFile<{ input: string; output: string }>(path);

				expect(blsPopProve(hexToBuffer(input)).toString('hex')).toEqual(
					hexToBuffer(output).toString('hex'),
				);
			});
		});
	});

	describe('blsPopVerify', () => {
		describe.each(getAllFiles(['bls_specs/pop_verify']))('%s', ({ path }) => {
			it('should verify proof of possession', () => {
				const {
					input: { pk, proof },
					output,
				} = loadSpecFile<{ input: { pk: string; proof: string }; output: boolean }>(path);

				expect(blsPopVerify(hexToBuffer(pk), hexToBuffer(proof))).toEqual(output);
			});
		});
	});
});
