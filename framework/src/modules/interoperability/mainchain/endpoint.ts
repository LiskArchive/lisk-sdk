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

import { ModuleEndpointContext } from '../../../types';
import { BaseInteroperabilityEndpoint } from '../base_interoperability_endpoint';
import { CHAIN_REGISTRATION_FEE, MIN_RETURN_FEE_PER_BYTE_BEDDOWS } from '../constants';
import { RegisteredNamesStore } from '../stores/registered_names';
import { isValidName } from '../utils';

export interface ResultJSON {
	result: boolean;
}

export class MainchainInteroperabilityEndpoint extends BaseInteroperabilityEndpoint {
	public getRegistrationFee(): { fee: string } {
		return { fee: CHAIN_REGISTRATION_FEE.toString() };
	}

	public getMinimumMessageFee(): { fee: string } {
		return {
			fee: MIN_RETURN_FEE_PER_BYTE_BEDDOWS.toString(),
		};
	}

	public async isChainNameAvailable(context: ModuleEndpointContext): Promise<ResultJSON> {
		const {
			params: { name },
		} = context;

		if (typeof name !== 'string') {
			throw new Error('Chain name must be a string.');
		}

		if (!isValidName(name)) {
			throw new Error(
				`Invalid name property. It should contain only characters from the set [a-z0-9!@$&_.].`,
			);
		}

		const nameSubstore = this.stores.get(RegisteredNamesStore);
		const nameExists = await nameSubstore.has(context, Buffer.from(name, 'ascii'));

		return {
			result: !nameExists,
		};
	}
}
