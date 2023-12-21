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

import { Modules, Types } from '../../../../../src';
import {
	CHAIN_REGISTRATION_FEE,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityEndpoint } from '../../../../../src/modules/interoperability/mainchain/endpoint';
import { ChainAccountStore } from '../../../../../src/modules/interoperability/stores/chain_account';
import { OwnChainAccountStore } from '../../../../../src/modules/interoperability/stores/own_chain_account';
import { RegisteredNamesStore } from '../../../../../src/modules/interoperability/stores/registered_names';
import { createTransientModuleEndpointContext } from '../../../../../src/testing';
import { InvalidNameError } from '../../../../../src/modules/interoperability/errors';

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
		const nameMinLengthErrMsg = `Property '.name' must NOT have fewer than ${Modules.Interoperability.MIN_CHAIN_NAME_LENGTH} characters`;
		const nameMaxLengthErrMsg = `Property '.name' must NOT have more than ${Modules.Interoperability.MAX_CHAIN_NAME_LENGTH} characters`;
		const interopMod = new Modules.Interoperability.MainchainInteroperabilityModule();
		const registeredNamesStore = {
			has: jest.fn(),
		};
		beforeEach(() => {
			endpoint = new MainchainInteroperabilityEndpoint(
				interopMod.stores,
				offchainStoresMock as any,
			);
			interopMod.stores.register(RegisteredNamesStore, registeredNamesStore as never);
			jest.spyOn(registeredNamesStore, 'has').mockResolvedValue(true);
		});

		it('should throw error if name is not a string', async () => {
			const context = createTransientModuleEndpointContext({
				params: {
					name: 123,
				},
			});
			await expect(endpoint.isChainNameAvailable(context)).rejects.toThrow(
				'\'.name\' should pass "dataType" keyword validation',
			);
		});

		it(`should throw error if name has 0 length`, async () => {
			const context = createTransientModuleEndpointContext({
				params: {
					name: '',
				},
			});
			await expect(endpoint.isChainNameAvailable(context)).rejects.toThrow(nameMinLengthErrMsg);
		});

		it(`should not throw error if name length equals ${Modules.Interoperability.MIN_CHAIN_NAME_LENGTH}`, () => {
			const context = createTransientModuleEndpointContext({
				params: {
					name: 'a',
				},
			});
			// https://stackoverflow.com/questions/49603338/how-to-test-an-exception-was-not-thrown-with-jest
			// eslint-disable-next-line @typescript-eslint/require-await
			expect(async () => endpoint.isChainNameAvailable(context)).not.toThrow(nameMinLengthErrMsg);
		});

		it(`should not throw error if name length equals ${Modules.Interoperability.MAX_CHAIN_NAME_LENGTH}`, () => {
			const context = createTransientModuleEndpointContext({
				params: {
					name: 'a'.repeat(Modules.Interoperability.MAX_CHAIN_NAME_LENGTH),
				},
			});
			// eslint-disable-next-line @typescript-eslint/require-await
			expect(async () => endpoint.isChainNameAvailable(context)).not.toThrow(nameMaxLengthErrMsg);
		});

		it(`should throw error if name length exceeds ${Modules.Interoperability.MAX_CHAIN_NAME_LENGTH}`, async () => {
			const context = createTransientModuleEndpointContext({
				params: {
					name: 'a'.repeat(Modules.Interoperability.MAX_CHAIN_NAME_LENGTH + 1),
				},
			});
			await expect(endpoint.isChainNameAvailable(context)).rejects.toThrow(nameMaxLengthErrMsg);
		});

		it('should throw error if name has invalid chars', async () => {
			const context = createTransientModuleEndpointContext({
				params: {
					name: '@*#(',
				},
			});
			await expect(endpoint.isChainNameAvailable(context)).rejects.toThrow(
				new InvalidNameError().message,
			);
		});

		it('should return false if name exists in the store', async () => {
			const context = createTransientModuleEndpointContext({
				params: {
					name: 'sidechain',
				},
			});
			await expect(endpoint.isChainNameAvailable(context)).resolves.toStrictEqual({
				result: false,
			});
		});

		it('should return true if name does not exist in the store', async () => {
			jest.spyOn(registeredNamesStore, 'has').mockResolvedValue(false);
			const context = createTransientModuleEndpointContext({
				params: {
					name: 'mitsuchain',
				},
			});
			await expect(endpoint.isChainNameAvailable(context)).resolves.toStrictEqual({ result: true });
		});
	});

	describe('isChainIDAvailable', () => {
		const interopMod = new Modules.Interoperability.MainchainInteroperabilityModule();
		const chainAccountStore = {
			has: jest.fn(),
		};
		const ownChainAccountStore = {
			get: jest.fn().mockResolvedValue({ chainID: Buffer.from('00000000', 'hex') }),
		};
		let context: Types.ModuleEndpointContext;

		beforeEach(() => {
			interopMod.stores.register(ChainAccountStore, chainAccountStore as never);
			interopMod.stores.register(OwnChainAccountStore, ownChainAccountStore as never);
			endpoint = new MainchainInteroperabilityEndpoint(interopMod.stores, {} as any);
		});

		it('should return false when chainID equals mainchainID', async () => {
			context = createTransientModuleEndpointContext({
				params: {
					chainID: '00000000',
				},
			});
			const isAvailable = await endpoint.isChainIDAvailable(context);
			expect(isAvailable).toEqual({ result: false });
		});

		it('should return false when chainID is not on the mainchain network', async () => {
			context = createTransientModuleEndpointContext({
				params: {
					chainID: '11111111',
				},
			});
			const isAvailable = await endpoint.isChainIDAvailable(context);
			expect(isAvailable).toEqual({ result: false });
		});

		it('should return false when the chainID exists', async () => {
			context = createTransientModuleEndpointContext({
				params: {
					chainID: '00000001',
				},
			});
			chainAccountStore.has.mockResolvedValue(true);
			const isAvailable = await endpoint.isChainIDAvailable(context);
			expect(isAvailable).toEqual({ result: false });
		});

		it('should return true when the chainID does not exists', async () => {
			chainAccountStore.has.mockResolvedValue(false);
			const isChainIDAvailableResult = await endpoint.isChainIDAvailable(context);

			expect(isChainIDAvailableResult).toEqual({ result: true });
		});
	});
});
