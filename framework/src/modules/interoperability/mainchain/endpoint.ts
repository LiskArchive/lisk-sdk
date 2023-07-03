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

import { validator } from '@liskhq/lisk-validator';
import { ModuleEndpointContext } from '../../../types';
import { BaseInteroperabilityEndpoint } from '../base_interoperability_endpoint';
import {
	CHAIN_REGISTRATION_FEE,
	EMPTY_BYTES,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	MIN_CHAIN_NAME_LENGTH,
	MAX_CHAIN_NAME_LENGTH,
} from '../constants';
import { isChainIDAvailableRequestSchema } from '../schemas';
import { ChainAccountStore } from '../stores/chain_account';
import { OwnChainAccountStore } from '../stores/own_chain_account';
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

	public async isChainIDAvailable(context: ModuleEndpointContext): Promise<{ result: boolean }> {
		validator.validate(isChainIDAvailableRequestSchema, context.params);
		const chainID = Buffer.from(context.params.chainID as string, 'hex');
		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		const networkID = chainID.slice(0, 1);
		const ownChainNetworkID = ownChainAccount.chainID.slice(0, 1);
		// Only mainchain network IDs are available
		if (!networkID.equals(ownChainNetworkID)) {
			return {
				result: false,
			};
		}
		// Mainchain ID itself is not available
		if (chainID.equals(ownChainAccount.chainID)) {
			return {
				result: false,
			};
		}
		const chainAccountStore = this.stores.get(ChainAccountStore);
		const chainAccountExists = await chainAccountStore.has(context, chainID);

		return { result: !chainAccountExists };
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

		if (name.length < MIN_CHAIN_NAME_LENGTH || name.length > MAX_CHAIN_NAME_LENGTH) {
			throw new Error(
				`Invalid name property. Length should be > ${MIN_CHAIN_NAME_LENGTH} and < ${MAX_CHAIN_NAME_LENGTH}.`,
			);
		}

		const nameSubstore = this.stores.get(RegisteredNamesStore);
		const nameExists = await nameSubstore.has(context, Buffer.from(name, 'ascii'));

		return {
			result: !nameExists,
		};
	}
}
