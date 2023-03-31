import { utils } from '@liskhq/lisk-cryptography';
import { ChainStatus } from '../../../../src';
import {
	HASH_LENGTH,
	MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
	EMPTY_HASH,
	CHAIN_NAME_MAINCHAIN,
} from '../../../../src/modules/interoperability/constants';
import { TerminatedStateAccount } from '../../../../src/modules/interoperability/stores/terminated_state';
import { TerminatedOutboxAccount } from '../../../../src/modules/interoperability/stores/terminated_outbox';
import { GenesisInteroperability } from '../../../../src/modules/interoperability/types';

export const mainchainID = Buffer.from([0, 0, 0, 0]);
const mainchainTokenID = Buffer.concat([mainchainID, Buffer.alloc(4)]);

export const channelData = {
	inbox: {
		appendPath: [Buffer.alloc(HASH_LENGTH), Buffer.alloc(HASH_LENGTH)],
		root: utils.getRandomBytes(HASH_LENGTH),
		size: 18,
	},
	outbox: {
		appendPath: [Buffer.alloc(HASH_LENGTH), Buffer.alloc(HASH_LENGTH)],
		root: utils.getRandomBytes(HASH_LENGTH),
		size: 18,
	},
	partnerChainOutboxRoot: utils.getRandomBytes(HASH_LENGTH),
	messageFeeTokenID: mainchainTokenID,
	minReturnFeePerByte: MIN_RETURN_FEE_PER_BYTE_BEDDOWS,
};

export const activeValidator = {
	// utils.getRandomBytes(BLS_PUBLIC_KEY_LENGTH).toString('hex')
	blsKey: Buffer.from(
		'3c1e6f29e3434f816cd6697e56cc54bc8d80927bf65a1361b383aa338cd3f63cbf82ce801b752cb32f8ecb3f8cc16835',
		'hex',
	),
	bftWeight: BigInt(10),
};

export const activeValidators = [activeValidator];
export const chainValidators = {
	activeValidators,
	certificateThreshold: BigInt(20),
};

export const lastCertificate = {
	height: 567467,
	timestamp: 1000,
	stateRoot: Buffer.alloc(HASH_LENGTH),
	validatorsHash: Buffer.alloc(HASH_LENGTH),
};

export const chainData = {
	name: 'dummy',
	lastCertificate,
	status: ChainStatus.REGISTERED,
};

export const chainInfo = {
	chainID: Buffer.from([0, 0, 0, 1]),
	chainData,
	channelData,
	chainValidators,
};

export const terminatedStateAccount: TerminatedStateAccount = {
	stateRoot: lastCertificate.stateRoot,
	mainchainStateRoot: EMPTY_HASH,
	initialized: true,
};

export const terminatedOutboxAccount: TerminatedOutboxAccount = {
	outboxRoot: utils.getRandomBytes(HASH_LENGTH),
	outboxSize: 1,
	partnerChainInboxSize: 1,
};

export const genesisInteroperability: GenesisInteroperability = {
	ownChainName: CHAIN_NAME_MAINCHAIN,
	ownChainNonce: BigInt(123),
	chainInfos: [chainInfo],
	terminatedStateAccounts: [], // handle it in `describe('terminatedStateAccounts'`
	terminatedOutboxAccounts: [],
};
