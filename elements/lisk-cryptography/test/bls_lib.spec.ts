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

import * as glob from 'glob';
import { join } from 'path';
import * as fs from 'fs';
import * as yml from 'js-yaml';
import {
	blsAggregate,
	blsAggregateVerify,
	blsFastAggregateVerify,
	blsSign,
	blsSkToPk,
	blsVerify,
	blsPopProve,
	blsPopVerify,
} from '../src/bls_lib';

const EMPTY_BUFFER = Buffer.alloc(0);

const getAllFiles = (
	dirs: string[],
	ignore?: RegExp,
): { path: string; toString: () => string }[] => {
	return dirs
		.map((dir: string) => {
			return glob
				.sync(join(__dirname, dir, '**/*.{yaml,yml}'))
				.filter(path => (ignore ? !ignore.test(path) : true))
				.map(path => ({ path, toString: () => `${dir}${path.split(dir)[1]}` }));
		})
		.flat();
};

const loadEth2Spec = <T = Record<string, unknown>>(filePath: string) =>
	(yml.load(fs.readFileSync(filePath, 'utf8')) as unknown) as T;
const hexToBuffer = (str: string | null): Buffer =>
	str ? Buffer.from(str.substr(2), 'hex') : EMPTY_BUFFER;

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
				const { input, output } = loadEth2Spec<{ input: string; output: string }>(path);

				expect(blsSkToPk(hexToBuffer(input)).toString('hex')).toEqual(
					hexToBuffer(output).toString('hex'),
				);
			});
		});
	});

	describe('blsSign', () => {
		describe.each(getAllFiles(['eth2_bls_specs/sign']))('%s', ({ path }) => {
			it('should generate valid signature', () => {
				const {
					input: { privkey, message },
					output,
				} = loadEth2Spec<EthSignSpec>(path);

				const signature = blsSign(hexToBuffer(privkey), hexToBuffer(message));

				expect(signature.toString('hex')).toEqual(hexToBuffer(output).toString('hex'));
			});
		});
	});

	describe('blsVerify', () => {
		describe.each(getAllFiles(['eth2_bls_specs/verify']))('%s', ({ path }) => {
			it('should verify signatures', () => {
				const {
					input: { pubkey, message, signature },
					output,
				} = loadEth2Spec<EthVerifySpec>(path);

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
					const { input, output } = loadEth2Spec<EthAggrSpec>(path);

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
				} = loadEth2Spec<EthAggrVerifySpec>(path);

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
				['eth2_bls_specs/fast_aggregate_verify'],
				/fast_aggregate_verify_infinity_pubkey/,
			),
		)('%s', ({ path }) => {
			it('should verify message', () => {
				const {
					input: { pubkeys, message, signature },
					output,
				} = loadEth2Spec<EthFastAggrVerifySpec>(path);

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
				const { input, output } = loadEth2Spec<{ input: string; output: string }>(path);

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
				} = loadEth2Spec<{ input: { pk: string; proof: string }; output: boolean }>(path);

				expect(blsPopVerify(hexToBuffer(pk), hexToBuffer(proof))).toEqual(output);
			});
		});
	});
});
