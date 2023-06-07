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

import { utils } from '@liskhq/lisk-cryptography';

export enum UpdateAuthorityResult {
	SUCCESS = 0,
	FAIL_INVALID_SIGNATURE,
}

export const MODULE_NAME_POA = 'poa';
export const MAX_LENGTH_NAME = 20;
export const LENGTH_BLS_KEY = 48;
export const LENGTH_PROOF_OF_POSSESSION = 96;
export const LENGTH_GENERATOR_KEY = 32;
export const NUM_BYTES_ADDRESS = 20;
export const MAX_NUM_VALIDATORS = 199;

export const KEY_SNAPSHOT_0 = utils.intToBuffer(0, 4);

export const POA_VALIDATOR_NAME_REGEX = /^[a-z0-9!@$&_.]+$/;
export const MESSAGE_TAG_POA = 'LSK_POA_';

export const AUTHORITY_REGISTRATION_FEE = BigInt(1000000000); // Determined by Operator

export const EMPTY_BYTES = Buffer.alloc(0);

export const COMMAND_REGISTER_AUTHORITY = 'registerAuthority';
export const COMMAND_UPDATE_KEY = 'updateKey';
export const COMMAND_UPDATE_AUTHORITY = 'updateAuthority';
