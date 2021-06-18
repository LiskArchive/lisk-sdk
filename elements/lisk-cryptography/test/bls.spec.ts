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
	blsVerify,
} from '../src/bls';

const EMPTY_BUFFER = Buffer.alloc(0);

const getAllFiles = (dir: string): { name: string; path: string; toString: () => string }[] =>
	glob
		.sync(join(__dirname, dir, '**/*.yaml'))
		.map(path => ({ path, name: path.split(dir)[1], toString: () => path.split(dir)[1] }));

const loadEth2Spec = <T = Record<string, unknown>>(filePath: string) =>
	(yml.load(fs.readFileSync(filePath, 'utf8')) as unknown) as T;
const ethHexStr = (str: string | null): Buffer =>
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

describe('bls', () => {
	describe('sign', () => {
		describe.each(getAllFiles('bls_specs/sign'))('%s', ({ path }) => {
			it('should generate valid signature', () => {
				const {
					input: { privkey, message },
					output,
				} = loadEth2Spec<EthSignSpec>(path);

				const signature = blsSign(ethHexStr(privkey), ethHexStr(message));

				expect(signature.toString('hex')).toEqual(ethHexStr(output).toString('hex'));
			});
		});
	});

	describe('verify', () => {
		describe.each(getAllFiles('bls_specs/verify'))('%s', ({ path }) => {
			it('should verify signatures', () => {
				const {
					input: { pubkey, message, signature },
					output,
				} = loadEth2Spec<EthVerifySpec>(path);

				const verify = blsVerify(ethHexStr(pubkey), ethHexStr(message), ethHexStr(signature));

				expect(verify).toEqual(output);
			});
		});
	});

	describe('aggregate', () => {
		describe.each(getAllFiles('bls_specs/aggregate'))('%s', ({ path }) => {
			it('should aggregate signatures', () => {
				const { input, output } = loadEth2Spec<EthAggrSpec>(path);

				const signature = blsAggregate(input.map(ethHexStr));
				expect(signature.toString('hex')).toEqual(ethHexStr(output).toString('hex'));
			});
		});
	});

	describe('aggregateVerify', () => {
		describe.each(getAllFiles('bls_specs/aggregate_verify'))('%s', ({ path }) => {
			it('should verify messages', () => {
				const {
					input: { pubkeys, messages, signature },
					output,
				} = loadEth2Spec<EthAggrVerifySpec>(path);

				const verify = blsAggregateVerify(
					pubkeys.map(ethHexStr),
					messages.map(ethHexStr),
					ethHexStr(signature),
				);

				expect(verify).toEqual(output);
			});
		});
	});

	describe('blsFastAggregateVerify', () => {
		describe.each(getAllFiles('bls_specs/fast_aggregate_verify'))('%s', ({ path }) => {
			it('should verify message', () => {
				const {
					input: { pubkeys, message, signature },
					output,
				} = loadEth2Spec<EthFastAggrVerifySpec>(path);

				const verify = blsFastAggregateVerify(
					pubkeys.map(ethHexStr),
					ethHexStr(message),
					ethHexStr(signature),
				);

				expect(verify).toEqual(output);
			});
		});
	});
});
