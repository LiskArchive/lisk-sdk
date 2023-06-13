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

import { address as cryptoAddress } from '@liskhq/lisk-cryptography';
import { NotFoundError } from '@liskhq/lisk-db';
import { BaseEndpoint } from '../base_endpoint';
import { ValidatorStore } from './stores/validator';
import { ModuleEndpointContext } from '../../types';
import { KEY_SNAPSHOT_0, AUTHORITY_REGISTRATION_FEE } from './constants';
import { SnapshotStore } from './stores';
import { ValidatorEndpoint } from './types';

export class PoAEndpoint extends BaseEndpoint {
	public async getValidator(context: ModuleEndpointContext): Promise<ValidatorEndpoint> {
		const validatorSubStore = this.stores.get(ValidatorStore);
		const { address } = context.params;
		if (typeof address !== 'string') {
			throw new Error('Parameter address must be a string.');
		}
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
	): Promise<{ validators: ValidatorEndpoint[] }> {
		const validatorStore = this.stores.get(ValidatorStore);
		const startBuf = Buffer.alloc(20);
		const endBuf = Buffer.alloc(20, 255);
		const validatorStoreData = await validatorStore.iterate(context, {
			gte: startBuf,
			lte: endBuf,
		});
		const snapshotStore = this.stores.get(SnapshotStore);
		const currentRoundSnapshot = await snapshotStore.get(context, KEY_SNAPSHOT_0);
		const response = [];
		for (const data of validatorStoreData) {
			const address = cryptoAddress.getLisk32AddressFromAddress(data.key);
			const name = await validatorStore.get(context, data.key);
			const activeValidator = currentRoundSnapshot.validators.find(
				v => v.address.toString('hex') === address,
			);
			const validatorJSON = {
				...name,
				address,
				weight: activeValidator ? activeValidator.weight.toString() : '',
			};
			response.push(validatorJSON);
		}

		return { validators: response };
	}

	public getRegistrationFee(): { fee: string } {
		return {
			fee: AUTHORITY_REGISTRATION_FEE.toString(),
		};
	}
}
