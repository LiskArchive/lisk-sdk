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

import { Transaction, chain, BFTValidator, AggregateCommit } from 'lisk-sdk';

export interface ChainConnectorPluginConfig {
	mainchainIPCPath: string;
	sidechainIPCPath: string;
	ccmBasedFrequency: number;
	livenessBasedFrequency: number;
}

export type SentCCUs = Transaction[];

export interface ValidatorsData {
	certificateThreshold: BigInt;
	validators: BFTValidator[];
	validatorsHash: Buffer;
}

export interface ChainConnectorInfo {
	blockHeaders: chain.BlockHeader[];
	aggregateCommits: AggregateCommit[];
	validatorsHashPreimage: ValidatorsData[];
}
