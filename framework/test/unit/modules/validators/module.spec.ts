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

describe('ValidatorsModule', () => {
	let validatorsModule: ValidatorsModule;

	beforeEach(() => {
		validatorsModule = new ValidatorsModule();
	});

	describe('init', () => {
		it('should initialize config with default value when module config is empty', async () => {
			await expect(
				validatorsModule.init({ genesisConfig: {} as any, moduleConfig: {} }),
			).toResolve();

			expect(validatorsModule['_blockTime']).toBe(10);
		});

		it('should initialize config with given value', async () => {
			await expect(
				validatorsModule.init({
					genesisConfig: {} as any,
					moduleConfig: { blockTime: 3 },
				}),
			).toResolve();

			expect(validatorsModule['_blockTime']).toBe(3);
		});
	});
});
