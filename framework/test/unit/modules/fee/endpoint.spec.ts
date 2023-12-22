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
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { Modules } from '../../../../src';
import { createTransientModuleEndpointContext } from '../../../../src/testing';
import { FeeEndpoint } from '../../../../src/modules/fee/endpoint';
import { ModuleConfig } from '../../../../src/modules/fee/types';
import { defaultConfig } from '../../../../src/modules/fee/constants';

describe('FeeModuleEndpoint', () => {
	const fee = new Modules.Fee.FeeModule();
	const config: ModuleConfig = {
		...defaultConfig,
		feeTokenID: Buffer.from('1000000000000002', 'hex'),
		minFeePerByte: 1234,
	};

	let feeEndpoint: FeeEndpoint;
	let stateStore: PrefixedStateReadWriter;

	beforeEach(() => {
		feeEndpoint = new FeeEndpoint(fee.stores, fee.offchainStores);
		feeEndpoint.init(config);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
	});

	describe('getFeeTokenID', () => {
		it('should return feeTokenID', async () => {
			await expect(
				feeEndpoint.getFeeTokenID(createTransientModuleEndpointContext({ stateStore })),
			).resolves.toEqual({
				tokenID: config.feeTokenID.toString('hex'),
			});
		});
	});

	describe('getMinFeePerByte', () => {
		it('should return minFeePerByte', async () => {
			await expect(
				feeEndpoint.getMinFeePerByte(createTransientModuleEndpointContext({ stateStore })),
			).resolves.toEqual({
				minFeePerByte: config.minFeePerByte,
			});
		});
	});
});
