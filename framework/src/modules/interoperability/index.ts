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
export { MainchainInteroperabilityAPI } from './mainchain/api';
export * from './mainchain/commands';
// Sidechain
export { SidechainInteroperabilityModule } from './sidechain/module';
export { SidechainInteroperabilityAPI } from './sidechain/api';
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
} from './types';
