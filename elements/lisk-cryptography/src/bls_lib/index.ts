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

// eslint-disable-next-line import/no-mutable-exports
let lib: BlsLib;
// eslint-disable-next-line import/no-mutable-exports
export let BLS_SUPPORTED = true;

try {
	// Check if BLS library (optional dependency) available

	// eslint-disable-next-line global-require, import/no-extraneous-dependencies
	require.resolve('@chainsafe/blst');

	console.info('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
	console.info('BLS exists');
	console.info('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');

	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, global-require
	lib = require('./lib');
} catch (err) {
	console.info('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
	console.info('BLS does not exists');
	console.info('%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%');
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
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-expect-error
} = lib;
