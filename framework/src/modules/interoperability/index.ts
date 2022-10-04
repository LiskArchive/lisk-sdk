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

// Mainchain
export { MainchainInteroperabilityModule } from './mainchain/module';
export { MainchainInteroperabilityMethod } from './mainchain/method';
export * from './mainchain/commands';
// Sidechain
export { SidechainInteroperabilityModule } from './sidechain/module';
export { SidechainInteroperabilityMethod } from './sidechain/method';
export * from './sidechain/commands';
export {
	CCMsg,
	ChainAccount,
	ChainAccountJSON,
	ChannelData,
	ChannelDataJSON,
	Inbox,
	InboxJSON,
	Outbox,
	OutboxJSON,
	MessageFeeTokenID,
	MessageFeeTokenIDJSON,
	InboxUpdate,
	CrossChainUpdateTransactionParams,
	ActiveValidator,
	OutboxRootWitness,
} from './types';
export {
	CHAIN_TERMINATED,
	LIVENESS_LIMIT,
	MESSAGE_TAG_CERTIFICATE,
	CHAIN_ACTIVE,
	STORE_PREFIX_OUTBOX_ROOT,
	MODULE_ID_INTEROPERABILITY,
} from './constants';
export { rawStateStoreKey } from './utils';
