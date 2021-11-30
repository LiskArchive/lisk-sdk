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

import { Chain } from '@liskhq/lisk-chain';
import { BFTAPI, ValidatorAPI } from '../types';
import { Network } from '../../network';

// aggregationBits and signatures are optional as these properties are removed when signing certificates
export interface Certificate {
	readonly blockID: Buffer;
	readonly height: number;
	readonly timestamp: number;
	readonly stateRoot: Buffer;
	readonly validatorsHash: Buffer;
	readonly aggregationBits?: Buffer;
	readonly signature?: Buffer;
}

export interface SingleCommit {
	readonly blockID: Buffer;
	readonly height: number;
	readonly validatorAddress: Buffer;
	readonly certificateSignature: Buffer;
}

export interface CommitPoolConfig {
	readonly network: Network;
	readonly blockTime: number;
	readonly bftAPI: BFTAPI;
	readonly validatorsAPI: ValidatorAPI;
	readonly chain: Chain;
}

export interface ValidatorInfo {
	readonly address: Buffer;
	readonly blsPublicKey: Buffer;
	readonly blsSecretKey: Buffer;
}

export interface AggregateCommit {
	readonly height: number;
	readonly aggregationBits: Buffer;
	readonly certificateSignature: Buffer;
}
