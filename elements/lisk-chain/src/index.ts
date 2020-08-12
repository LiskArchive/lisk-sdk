/*
 * Copyright © 2019 Lisk Foundation
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
import { EVENT_DELETE_BLOCK, EVENT_NEW_BLOCK } from './constants';

const events = { EVENT_DELETE_BLOCK, EVENT_NEW_BLOCK };

export { events };
export { Chain } from './chain';
export { Transaction, transactionSchema } from './transaction';
export {
	blockHeaderAssetSchema,
	blockHeaderSchema,
	blockSchema,
	signingBlockHeaderSchema,
	validatorsSchema,
	getGenesisBlockHeaderAssetSchema,
} from './schema';
export { CONSENSUS_STATE_VALIDATORS_KEY, CONSENSUS_STATE_FINALIZED_HEIGHT_KEY } from './constants';
export type {
	Account,
	AccountDefaultProps,
	RawBlock,
	RawBlockHeader,
	GenesisBlock,
	GenesisBlockHeader,
	Block,
	BlockHeader,
	Validator,
	AccountSchema,
} from './types';
export { Slots } from './slots';
export { readGenesisBlockJSON, getValidators, getAccountSchemaWithDefault } from './utils';

export type { StateStore } from './state_store';
