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

import { validator } from '@liskhq/lisk-validator';
import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { NotFoundError } from '@liskhq/lisk-db';
import { BaseEndpoint } from '../base_endpoint';
import { ValidatorStore } from './stores/validator';
import { ModuleEndpointContext } from '../../types';
import { KEY_SNAPSHOT_0, NUM_BYTES_ADDRESS } from './constants';
import { SnapshotStore } from './stores';
import { Validator } from './types';
import { getValidatorRequestSchema } from './schemas';

export class PoAEndpoint extends BaseEndpoint {
	private _authorityRegistrationFee!: bigint;

	public init(authorityRegistrationFee: bigint) {
		this._authorityRegistrationFee = authorityRegistrationFee;
	}

	public async getValidator(context: ModuleEndpointContext): Promise<Validator> {
		const validatorSubStore = this.stores.get(ValidatorStore);

		validator.validate(getValidatorRequestSchema, context.params);
		const address = context.params.address as string;

		cryptoAddress.validateLisk32Address(address);

		let validatorName: { name: string };
		try {
			validatorName = await validatorSubStore.get(
				context,
				cryptoAddress.getAddressFromLisk32Address(address),
			);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}

			throw new Error(`Validator not found in snapshot for address ${address}`);
		}

		const snapshotStore = this.stores.get(SnapshotStore);
		const currentRoundSnapshot = await snapshotStore.get(context, KEY_SNAPSHOT_0);
		const validatorInfo = currentRoundSnapshot.validators.find(
			v => cryptoAddress.getLisk32AddressFromAddress(v.address) === address,
		);
		if (!validatorInfo) {
			throw new Error(`Validator not found in snapshot for address ${address}`);
		}

		return {
			...validatorName,
			address,
			weight: validatorInfo.weight.toString(),
		};
	}

	public async getAllValidators(
		context: ModuleEndpointContext,
	): Promise<{ validators: Validator[] }> {
		const validatorStore = this.stores.get(ValidatorStore);
		const startBuf = Buffer.alloc(NUM_BYTES_ADDRESS);
		const endBuf = Buffer.alloc(NUM_BYTES_ADDRESS, 255);
		const validatorStoreData = await validatorStore.iterate(context, {
			gte: startBuf,
			lte: endBuf,
		});

		const snapshotStore = this.stores.get(SnapshotStore);
		const currentRoundSnapshot = await snapshotStore.get(context, KEY_SNAPSHOT_0);

		const validatorsData: Validator[] = [];
		for (const data of validatorStoreData) {
			const address = cryptoAddress.getLisk32AddressFromAddress(data.key);
			const { value } = data;
			const activeValidator = currentRoundSnapshot.validators.find(
				v => cryptoAddress.getLisk32AddressFromAddress(v.address) === address,
			);

			const v: Validator = {
				name: value.name,
				address,
				weight: activeValidator ? activeValidator.weight.toString() : '0',
			};
			validatorsData.push(v);
		}

		// This is needed since response from this endpoint is returning data in unexpected sorting order on next execution
		// which can result in potential test/build failure
		validatorsData.sort((v1, v2) => v1.name.localeCompare(v2.name, 'en'));
		return { validators: validatorsData };
	}

	public getRegistrationFee(): { fee: string } {
		return {
			fee: this._authorityRegistrationFee.toString(),
		};
	}
}
