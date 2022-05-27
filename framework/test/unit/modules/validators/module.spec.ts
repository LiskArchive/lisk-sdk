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
 */
import { ValidatorsModule } from '../../../../src/modules/validators';
import { EMPTY_KEY, STORE_PREFIX_GENESIS_DATA } from '../../../../src/modules/validators/constants';
import { genesisDataSchema } from '../../../../src/modules/validators/schemas';
import { GenesisData } from '../../../../src/modules/validators/types';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { createBlockContext, createBlockHeaderWithDefaults } from '../../../../src/testing';
import { InMemoryPrefixedStateDB } from '../../../../src/testing/in_memory_prefixed_state';

describe('ValidatorsModule', () => {
	let stateStore: PrefixedStateReadWriter;
	let genesisDataSubStore: PrefixedStateReadWriter;
	let validatorsModule: ValidatorsModule;
	const genesisTimestamp = 45672;

	beforeEach(() => {
		validatorsModule = new ValidatorsModule();
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			await expect(
				validatorsModule.init({ genesisConfig: {} as any, moduleConfig: {}, generatorConfig: {} }),
			).toResolve();

			expect(validatorsModule['_blockTime']).toEqual(10);
		});

		it('should initialize config with given value', async () => {
			await expect(
				validatorsModule.init({
					genesisConfig: {} as any,
					moduleConfig: { blockTime: 3 },
					generatorConfig: {},
				}),
			).toResolve();

			expect(validatorsModule['_blockTime']).toEqual(3);
		});
	});

	describe('afterTransactionsExecute', () => {
		it(`should set genesis store with the correct timestamp`, async () => {
			stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
			const blockHeader = createBlockHeaderWithDefaults({ timestamp: genesisTimestamp });
			const blockAfterExecuteContext = createBlockContext({
				header: blockHeader,
				stateStore,
			}).getBlockAfterExecuteContext();
			await validatorsModule.initGenesisState(blockAfterExecuteContext);

			genesisDataSubStore = stateStore.getStore(validatorsModule.id, STORE_PREFIX_GENESIS_DATA);
			const genesisData = await genesisDataSubStore.getWithSchema<GenesisData>(
				EMPTY_KEY,
				genesisDataSchema,
			);
			expect(genesisData.timestamp).toBe(genesisTimestamp);
		});
	});
});
