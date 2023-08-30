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

export { BaseCCCommand } from './base_cc_command';
export { BaseInteroperableModule } from './base_interoperable_module';
export { BaseCCMethod } from './base_cc_method';
export { getMainchainID } from './utils';

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
	InboxUpdate,
	CrossChainUpdateTransactionParams,
	ActiveValidator,
	ActiveValidatorsUpdate,
	OutboxRootWitness,
	OwnChainAccount,
	OwnChainAccountJSON,
	LastCertificate,
	LastCertificateJSON,
	CrossChainMessageContext,
	CCCommandExecuteContext,
	RecoverContext,
} from './types';
// Common
export {
	LIVENESS_LIMIT,
	MESSAGE_TAG_CERTIFICATE,
	MODULE_NAME_INTEROPERABILITY,
	MAX_CCM_SIZE,
	EMPTY_BYTES,
} from './constants';
export { ChainStatus } from './stores/chain_account';
export {
	ccmSchema,
	crossChainUpdateTransactionParams as ccuParamsSchema,
	sidechainRegParams,
	mainchainRegParams,
	messageRecoveryParamsSchema,
	messageRecoveryInitializationParamsSchema,
	registrationCCMParamsSchema,
	sidechainTerminatedCCMParamsSchema,
	validatorsHashInputSchema,
	registrationSignatureMessageSchema,
	stateRecoveryParamsSchema,
	stateRecoveryInitParamsSchema,
	terminateSidechainForLivenessParamsSchema,
	genesisInteroperabilitySchema,
} from './schemas';
export {
	CcmProcessedEventData,
	CCMProcessedCode,
	CCMProcessedResult,
} from './events/ccm_processed';
export { CcmSendSuccessEventData } from './events/ccm_send_success';
