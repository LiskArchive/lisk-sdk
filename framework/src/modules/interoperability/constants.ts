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

import { utils } from '@liskhq/lisk-cryptography';

export const MODULE_NAME_INTEROPERABILITY = 'interoperability';

// General constants
export const CHAIN_NAME_MAINCHAIN = 'lisk_mainchain';
export const MAX_RESERVED_ERROR_STATUS = 63;
export const BLS_PUBLIC_KEY_LENGTH = 48;
export const BLS_SIGNATURE_LENGTH = 96;
export const SMT_KEY_LENGTH = 38;
export const NUMBER_ACTIVE_VALIDATORS_MAINCHAIN = 101;
export const MESSAGE_TAG_CHAIN_REG = 'LSK_CRM_';
export const LIVENESS_LIMIT = 2419200; // 28 * 24 * 3600
export const MAX_CCM_SIZE = 10240;
export const EMPTY_FEE_ADDRESS = Buffer.alloc(0);
export const EMPTY_BYTES = Buffer.alloc(0);
export const EMPTY_HASH = utils.hash(EMPTY_BYTES);
export const CHAIN_REGISTRATION_FEE = BigInt(1000000000);
export const MAX_NUM_VALIDATORS = 199;
export const MAX_LENGTH_AGGREGATION_BITS = Math.ceil(MAX_NUM_VALIDATORS / 8);
export const MAX_LENGTH_NAME = 40;
export const MAX_UINT32 = 4294967295;
export const MAX_UINT64 = BigInt('18446744073709551615'); // BigInt((2 ** 64) - 1) - 1
export const MESSAGE_TAG_CERTIFICATE = 'LSK_CE_';
export const MIN_CHAIN_NAME_LENGTH = 1;
export const MAX_CHAIN_NAME_LENGTH = 32;
export const HASH_LENGTH = 32;
export const MIN_MODULE_NAME_LENGTH = 1;
export const MAX_MODULE_NAME_LENGTH = 32;
export const MIN_CROSS_CHAIN_COMMAND_NAME_LENGTH = 1;
export const MAX_CROSS_CHAIN_COMMAND_NAME_LENGTH = 32;
export const CHAIN_ID_LENGTH = 4;
export const CHAIN_ID_STRING_LENGTH = 2 * CHAIN_ID_LENGTH;
export const SUBSTORE_PREFIX_LENGTH = 2;

// Value is in beddows
export const MIN_RETURN_FEE_PER_BYTE_BEDDOWS = BigInt(1000);

// Custom prefix for all the stores for interoperability.
// It is hash('interoperability').slice(0, 4) but without changing the first byte unlike default store prefix
export const STORE_PREFIX = Buffer.from([0x83, 0xed, 0x0d, 0x25]);

// Cross chain command names
export const CROSS_CHAIN_COMMAND_REGISTRATION = 'registration';
export const CROSS_CHAIN_COMMAND_CHANNEL_TERMINATED = 'channelTerminated';
export const CROSS_CHAIN_COMMAND_SIDECHAIN_TERMINATED = 'sidechainTerminated';

export const enum CCMStatusCode {
	// Value of status of a new CCM which is not a response due do an error
	OK = 0,
	// Value of status of returned CCM due to error: channel unavailable
	CHANNEL_UNAVAILABLE = 1,
	// Value of status of returned CCM due to error: module not supported
	MODULE_NOT_SUPPORTED = 2,
	// Value of status of returned CCM due to error: cross-chain command not supported
	CROSS_CHAIN_COMMAND_NOT_SUPPORTED = 3,
	// Value of status of returned CCM due to error: failed ccm execution
	FAILED_CCM = 4,
	// Value of status of CCM that have been recovered with a message recovery command
	RECOVERED = 5,
}

export const CCM_SENT_STATUS_SUCCESS = 0;

// Commands
export const COMMAND_NAME_SIDECHAIN_REG = 'registerSidechain';
export const COMMAND_NAME_MAINCHAIN_REG = 'registerMainchain';
export const COMMAND_NAME_STATE_RECOVERY = 'recoverState';
export const COMMAND_NAME_MESSAGE_RECOVERY = 'recoverMessage';
export const COMMAND_NAME_STATE_RECOVERY_INIT = 'initializeStateRecovery';
export const COMMAND_NAME_LIVENESS_TERMINATION = 'terminateSidechainForLiveness';
export const RECOVERED_STORE_VALUE = Buffer.alloc(32);

// Events
export const EVENT_NAME_CHAIN_ACCOUNT_UPDATED = 'chainAccountUpdated';
export const EVENT_NAME_CCM_PROCESSED = 'ccmProcessed';
export const EVENT_NAME_CCM_SEND_SUCCESS = 'ccmSendSucess';
export const EVENT_NAME_INVALID_CERTIFICATE_SIGNATURE = 'invalidCertificateSignature';
export const EVENT_NAME_INVALID_OUTBOX_ROOT_VERIFICATION = 'invalidOutboxRootVerification';

export const CONTEXT_STORE_KEY_CCM_PROCESSING = 'CONTEXT_STORE_KEY_CCM_PROCESSING';
export const EVENT_TOPIC_CCM_EXECUTION = Buffer.from([5]);

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#empty-cross-chain-message
export const EmptyCCM = {
	module: '',
	crossChainCommand: '',
	nonce: BigInt(0),
	fee: BigInt(0),
	sendingChainID: EMPTY_BYTES,
	receivingChainID: EMPTY_BYTES,
	params: EMPTY_BYTES,
	status: 0,
};
