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

import { ImmutableSubStore } from '../../state_machine';
import { AuthAccount } from './stores/auth_account';

export type ImmutableStoreCallback = (moduleID: Buffer, storePrefix: Buffer) => ImmutableSubStore;
export interface Keys {
	numberOfSignatures: number;
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
}

export interface RegisterMultisignatureParams {
	numberOfSignatures: number;
	mandatoryKeys: Buffer[];
	optionalKeys: Buffer[];
	signatures: Buffer[];
}

export interface AuthAccountJSON {
	nonce: string;
	numberOfSignatures: number;
	mandatoryKeys: string[];
	optionalKeys: string[];
}

export interface VerifyEndpointResultJSON {
	verified: boolean;
}

export interface GenesisAuthStore {
	authDataSubstore: {
		storeKey: Buffer;
		storeValue: AuthAccount;
	}[];
}
