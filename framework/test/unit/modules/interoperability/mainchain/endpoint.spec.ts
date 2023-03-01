/*
 * Copyright © 2023 Lisk Foundation
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

import { MainchainInteroperabilityModule } from '../../../../../src';
import {
	CHAIN_REGISTRATION_FEE,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityEndpoint } from '../../../../../src/modules/interoperability/mainchain/endpoint';
import { RegisteredNamesStore } from '../../../../../src/modules/interoperability/stores/registered_names';
import { createTransientModuleEndpointContext } from '../../../../../src/testing';

describe('MainchainInteroperabilityEndpoint', () => {
	let endpoint: MainchainInteroperabilityEndpoint;

	const storesMock = {};
	const offchainStoresMock = {};

	beforeEach(() => {
		endpoint = new MainchainInteroperabilityEndpoint(storesMock as any, offchainStoresMock as any);
	});

	describe('getRegistrationFee', () => {
		it('should return the registration fee', () => {
			const result = endpoint.getRegistrationFee();

			expect(result).toEqual({ fee: CHAIN_REGISTRATION_FEE.toString() });
		});
	});

	describe('getMinimumMessageFee', () => {
		it('should return the message fee', () => {
			const result = endpoint.getMinimumMessageFee();

			expect(result).toEqual({ fee: MIN_RETURN_FEE_PER_BYTE_BEDDOWS.toString() });
		});
	});

	describe('isChainNameAvailable', () => {
		const interopMod = new MainchainInteroperabilityModule();
		const registeredNamesStore = {
			has: jest.fn(),
		};
		beforeEach(() => {
			endpoint = new MainchainInteroperabilityEndpoint(
				interopMod.stores,
				offchainStoresMock as any,
			);
			interopMod.stores.register(RegisteredNamesStore, registeredNamesStore as never);
		});

		it('should throw error if name is not a string', async () => {
			// Arrange
			const context = createTransientModuleEndpointContext({
				params: {
					name: 1,
				},
			});

			// Assert
			await expect(endpoint.isChainNameAvailable(context)).rejects.toThrow(
				'Chain name must be a string.',
			);
		});

		it('should throw error if name is invalid format', async () => {
			// Arrange
			const context = createTransientModuleEndpointContext({
				params: {
					name: '@*#$*%&@((%$#@((',
				},
			});

			// Assert
			await expect(endpoint.isChainNameAvailable(context)).rejects.toThrow(
				`Invalid name property. It should contain only characters from the set [a-z0-9!@$&_.].`,
			);
		});

		it('should return false is name is not available in the store', async () => {
			// Arrange
			jest.spyOn(registeredNamesStore, 'has').mockResolvedValue(true);
			const context = createTransientModuleEndpointContext({
				params: {
					name: 'sidechain',
				},
			});

			// Assert
			await expect(endpoint.isChainNameAvailable(context)).resolves.toBe({ result: false });
		});

		it('should return true if name is available in the store', async () => {
			// Arrange
			jest.spyOn(registeredNamesStore, 'has').mockResolvedValue(false);
			const context = createTransientModuleEndpointContext({
				params: {
					name: 'mitsuchain',
				},
			});

			// Assert
			await expect(endpoint.isChainNameAvailable(context)).resolves.toBe({ result: true });
		});
	});
});
