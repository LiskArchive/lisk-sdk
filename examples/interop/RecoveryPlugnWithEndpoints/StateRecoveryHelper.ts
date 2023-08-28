import { Transaction, codec, stateRecoveryParamsSchema, cryptography } from 'lisk-sdk';
import { StateRecoveryParams, InclusionProof } from './types';
import { Sidechain } from './Sidechain';

import { COMMAND_RECOVER_STATE } from './constants';
import {
	MODULE_NAME_INTEROPERABILITY,
	stateRecoveryInitParamsSchema,
	ChainAccountJSON,
} from 'lisk-framework';
import { StateRecoveryInitParams } from 'lisk-framework/dist-node/modules/interoperability/types';
import { chainDataSchema } from 'lisk-framework/dist-node/modules/interoperability/stores/chain_account';
import { COMMAND_NAME_STATE_RECOVERY_INIT } from 'lisk-framework/dist-node/modules/interoperability/constants';
import { Mainchain } from './Mainchain';

export class StateRecoveryHelper {
	async initializeStateRecoveryTransaction(sidechainAccountJSON: ChainAccountJSON) {
		const stateRecoveryInitParams: StateRecoveryInitParams = {
			chainID: cryptography.utils.intToBuffer(3, 4),
			bitmap: Buffer.alloc(0),
			siblingHashes: [],
			sidechainAccount: codec.encode(chainDataSchema, sidechainAccountJSON),
		};
		return new Transaction({
			module: MODULE_NAME_INTEROPERABILITY,
			command: COMMAND_NAME_STATE_RECOVERY_INIT,
			fee: BigInt(100000000),
			nonce: BigInt(0),
			params: codec.encode(stateRecoveryInitParamsSchema, stateRecoveryInitParams),
			senderPublicKey: cryptography.utils.getRandomBytes(32),
			signatures: [],
		});
	}

	async createStateRecoveryTransaction(
		siblingHashesAfterLastCertificate: InclusionProof,
		sidechain: Sidechain,
		mainchain: Mainchain,
	) {
		const inclusionProof = siblingHashesAfterLastCertificate.inclusionProof;
		const stateRecoveryParams: StateRecoveryParams = {
			chainID: Buffer.from(sidechain.getChainID(), 'hex'),
			module: 'token', // TODO: Will this always be SAME module ? (no NFT etc ?)
			siblingHashes: inclusionProof.siblingHashes,
			storeEntries: [
				{
					bitmap: inclusionProof.bitmap,
					storeKey: siblingHashesAfterLastCertificate.storeKey,
					// can rather do like this
					// const userBalance = await getBalances(this._client, this._senderLSKAddress, LSK_TOKEN_ID);
					// const storeValue = codec.encode(userStoreSchema, userBalance);
					storeValue: siblingHashesAfterLastCertificate.storeValue,
					substorePrefix: Buffer.from('0000', 'hex'),
				},
			],
		};

		// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#cross-chain-message-schema
		return new Transaction({
			module: MODULE_NAME_INTEROPERABILITY,
			command: COMMAND_RECOVER_STATE,
			// TODO: Can make this value dynamic from config ? What if it changes ?
			fee: BigInt(1000000000),
			params: codec.encodeJSON(stateRecoveryParamsSchema, stateRecoveryParams),
			nonce: BigInt(await mainchain.getNonce()),
			senderPublicKey: mainchain.publicKey,
			// TODO: It's not mentioned in LIP, why need this ?
			signatures: [],
		});
	}
}
