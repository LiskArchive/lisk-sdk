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

import { Logger } from '../../../../src/logger';
import { ValidatorsModule } from '../../../../src/modules/validators';
import { fakeLogger } from '../../../utils/node';

describe('ValidatorsModuleEndpoint', () => {
	const logger: Logger = fakeLogger;
	let validatorsModule: ValidatorsModule;

	beforeAll(() => {
		validatorsModule = new ValidatorsModule();
	});

	describe('validateBLSKey', () => {
		describe('when request data is invalid', () => {
			it('should reject with validation error', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: jest.fn(),
						logger,
						params: {
							invalid: 'schema',
						},
					}),
				).rejects.toThrow();
			});

			it('should reject with error when input parmas bytes are invalid', async () => {
				await expect(
					validatorsModule.endpoint.validateBLSKey({
						getStore: jest.fn(),
						logger,
						params: {
							proofOfPosession: 'xxxx',
							blsKey: 'xxxx',
						},
					}),
				).rejects.toThrow();
			});
		});
	});
});
