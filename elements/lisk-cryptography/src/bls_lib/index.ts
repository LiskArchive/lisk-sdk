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

import { BlsLib } from './types';

const blsNotSupportedError = new Error(
	'BLS is not supported on your platform. To enable, please check if optional dependencies are meet.',
);

// eslint-disable-next-line import/no-mutable-exports
export let lib: BlsLib = {
	blsKeyValidate: (_pk: Buffer) => {
		throw blsNotSupportedError;
	},
	blsKeyGen: (_ikm: Buffer) => {
		throw blsNotSupportedError;
	},
	blsSkToPk: (_sk: Buffer) => {
		throw blsNotSupportedError;
	},
	blsAggregate: (_signatures: Buffer[]) => {
		throw blsNotSupportedError;
	},
	blsSign: (_sk: Buffer, _message: Buffer) => {
		throw blsNotSupportedError;
	},
	blsVerify: (_pk: Buffer, _message: Buffer, _signature: Buffer) => {
		throw blsNotSupportedError;
	},
	blsAggregateVerify: (
		_publicKeys: ReadonlyArray<Buffer>,
		_messages: ReadonlyArray<Buffer>,
		_signature: Buffer,
	) => {
		throw blsNotSupportedError;
	},
	blsFastAggregateVerify: (
		_publicKeys: ReadonlyArray<Buffer>,
		_messages: Buffer,
		_signature: Buffer,
	) => {
		throw blsNotSupportedError;
	},
	blsPopProve: (_sk: Buffer) => {
		throw blsNotSupportedError;
	},
	blsPopVerify: (_pk: Buffer, _proof: Buffer) => {
		throw blsNotSupportedError;
	},
};
// eslint-disable-next-line import/no-mutable-exports
export let BLS_SUPPORTED = true;

try {
	// Check if BLS library (optional dependency) available

	// eslint-disable-next-line global-require, import/no-extraneous-dependencies
	require.resolve('@chainsafe/blst');
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, global-require
	lib = require('./lib');
} catch (err) {
	BLS_SUPPORTED = false;
}

export const {
	blsSign,
	blsVerify,
	blsKeyValidate,
	blsAggregate,
	blsKeyGen,
	blsFastAggregateVerify,
	blsAggregateVerify,
	blsSkToPk,
	blsPopProve,
	blsPopVerify,
} = lib;
