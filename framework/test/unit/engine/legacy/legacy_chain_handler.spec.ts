/* eslint-disable max-classes-per-file */
/*
 * Copyright © 2022 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';
import { LegacyConfig } from '../../../../src';
import { LegacyChainHandler } from '../../../../src/engine/legacy/legacy_chain_handler';

describe('Legacy Chain Handler', () => {
	let legacyChainHandler: LegacyChainHandler;
	let legacyConfig: LegacyConfig;

	beforeEach(() => {
		legacyConfig = {
			sync: true,
			brackets: [
				// bracket 1 for legacy blocks ranging 0-100
				{
					startHeight: 0,
					snapshotBlockID: utils.getRandomBytes(20).toString('hex'),
					snapshotHeight: 100,
				},
				// bracket 2 for legacy blocks ranging 101-1000
				{
					startHeight: 101,
					snapshotBlockID: utils.getRandomBytes(20).toString('hex'),
					snapshotHeight: 1000,
				},
			],
		};
		legacyChainHandler = new LegacyChainHandler({ legacyConfig });
	});

	describe('constructor', () => {
		it('should set legacy config properties', () => {
			expect(legacyChainHandler['_legacyConfig']).toEqual(legacyConfig);
		});
	});

	describe('syncBlocks', () => {
		it.todo('test behaviors');
	});
});
