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

import { address as cryptoAddress, utils } from '@liskhq/lisk-cryptography';
import { PoAModule } from '../../../../src';
import { PoAEndpoint } from '../../../../src/modules/poa/endpoint';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';
import { SnapshotStore, ValidatorStore } from '../../../../src/modules/poa/stores';
import {
	InMemoryPrefixedStateDB,
	createTransientModuleEndpointContext,
} from '../../../../src/testing';
import { createStoreGetter } from '../../../../src/testing/utils';
import { AUTHORITY_REGISTRATION_FEE, KEY_SNAPSHOT_0 } from '../../../../src/modules/poa/constants';

describe('PoAModuleEndpoint', () => {
	const poa = new PoAModule();

	let poaEndpoint: PoAEndpoint;
	let stateStore: PrefixedStateReadWriter;
	let validatorStore: ValidatorStore;
	let snapshotStore: SnapshotStore;

	const address1 = utils.getRandomBytes(20);
	const address2 = utils.getRandomBytes(20);
	const address3 = utils.getRandomBytes(20);

	const validatorData = {
		name: 'validator1',
		address: cryptoAddress.getLisk32AddressFromAddress(address1),
		weight: BigInt(1),
	};

	const snapshot = {
		threshold: BigInt(2),
		validators: [
			{
				address: address1,
				weight: BigInt(1),
			},
			{
				address: address2,
				weight: BigInt(2),
			},
		],
	};

	beforeEach(() => {
		poaEndpoint = new PoAEndpoint(poa.stores, poa.offchainStores);
		poaEndpoint.init(AUTHORITY_REGISTRATION_FEE);
		stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());
		validatorStore = poa.stores.get(ValidatorStore);
		snapshotStore = poa.stores.get(SnapshotStore);
	});

	describe('getValidator', () => {
		beforeEach(async () => {
			await validatorStore.set(createStoreGetter(stateStore), address1, {
				name: validatorData.name,
			});
			await snapshotStore.set(createStoreGetter(stateStore), KEY_SNAPSHOT_0, snapshot);
		});

		it('should return correct validator data corresponding to the input address', async () => {
			const validatorDataReturned = await poaEndpoint.getValidator(
				createTransientModuleEndpointContext({
					stateStore,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address1),
					},
				}),
			);

			const validatorDataJSON = {
				...validatorData,
				weight: validatorData.weight.toString(),
			};

			expect(validatorDataReturned).toStrictEqual(validatorDataJSON);
		});

		it('should return valid JSON output', async () => {
			const validatorDataReturned = await poaEndpoint.getValidator(
				createTransientModuleEndpointContext({
					stateStore,
					params: {
						address: cryptoAddress.getLisk32AddressFromAddress(address1),
					},
				}),
			);

			expect(validatorDataReturned.weight).toBeString();
		});

		it('should throw error if input address for validator not found', async () => {
			await expect(
				poaEndpoint.getValidator(
					createTransientModuleEndpointContext({
						stateStore,
						params: { address: cryptoAddress.getLisk32AddressFromAddress(address3) },
					}),
				),
			).rejects.toThrow(
				`Validator not found in snapshot for address ${cryptoAddress.getLisk32AddressFromAddress(
					address3,
				)}`,
			);
		});
	});

	describe('getAllValidators', () => {
		const address1Str = cryptoAddress.getLisk32AddressFromAddress(address1);
		const address2Str = cryptoAddress.getLisk32AddressFromAddress(address2);

		const addresses = [address1Str, address2Str];

		it('should return correct data for all validators', async () => {
			await validatorStore.set(createStoreGetter(stateStore), address1, {
				name: validatorData.name,
			});
			await validatorStore.set(createStoreGetter(stateStore), address2, { name: 'validator2' });
			await snapshotStore.set(createStoreGetter(stateStore), KEY_SNAPSHOT_0, snapshot);

			const { validators } = await poaEndpoint.getAllValidators(
				createTransientModuleEndpointContext({ stateStore }),
			);

			expect(addresses).toContain(validators[0].address);
			expect(addresses).toContain(validators[1].address);
		});

		it('should return valid JSON output', async () => {
			await validatorStore.set(createStoreGetter(stateStore), address1, {
				name: validatorData.name,
			});
			await validatorStore.set(createStoreGetter(stateStore), address2, { name: 'validator2' });
			await snapshotStore.set(createStoreGetter(stateStore), KEY_SNAPSHOT_0, snapshot);

			const { validators } = await poaEndpoint.getAllValidators(
				createTransientModuleEndpointContext({ stateStore }),
			);

			// Here we are checking against name sorted values from endpoint
			expect(validators[0].weight).toBe(snapshot.validators[0].weight.toString());
			expect(validators[1].weight).toBe(snapshot.validators[1].weight.toString());
		});

		it('should return json with empty weight for non active validator', async () => {
			await validatorStore.set(createStoreGetter(stateStore), address1, { name: 'validator1' });
			await validatorStore.set(createStoreGetter(stateStore), address2, { name: 'validator2' });
			const currentSnapshot = {
				threshold: BigInt(2),
				validators: [
					{
						address: address1,
						weight: BigInt(1),
					},
				],
			};
			await snapshotStore.set(createStoreGetter(stateStore), KEY_SNAPSHOT_0, currentSnapshot);

			const { validators } = await poaEndpoint.getAllValidators(
				createTransientModuleEndpointContext({ stateStore }),
			);

			// Checking against name-sorted values
			expect(validators[0].weight).toBe(currentSnapshot.validators[0].weight.toString());
			expect(validators[1].weight).toBe('0');
		});
	});

	describe('getRegistrationFee', () => {
		it('should return the default registration fee', () => {
			const response = poaEndpoint.getRegistrationFee();

			expect(response).toEqual({ fee: AUTHORITY_REGISTRATION_FEE.toString() });
		});

		it('should return the configured registration fee', () => {
			const authorityRegistrationFee = BigInt(200000);
			poaEndpoint.init(authorityRegistrationFee);
			const response = poaEndpoint.getRegistrationFee();

			expect(response).toEqual({ fee: authorityRegistrationFee.toString() });
		});
	});
});
