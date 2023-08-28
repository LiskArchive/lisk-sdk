import { CCMsg, cryptography, codec, Transaction } from 'lisk-sdk';
import { MerkleTree } from '@liskhq/lisk-tree';
import { toBytes } from './utils';
import { MessageRecoveryParams } from 'lisk-framework/dist-node/modules/interoperability/types';
import {
	MODULE_NAME_INTEROPERABILITY,
	messageRecoveryParamsSchema,
	messageRecoveryInitializationParamsSchema,
} from 'lisk-framework';
import { InclusionProofWithHeightAndStateRoot } from './types';
import { MessageRecoveryInitializationParams } from 'lisk-framework/dist-node/modules/interoperability/mainchain/commands/initialize_message_recovery';
import { channelSchema } from './schemas';
import { Mainchain } from './Mainchain';
import { COMMAND_RECOVER_MESSAGE } from './constants';
import { Sidechain } from './Sidechain';

export class MessageRecoveryHelper {
	private _mainchain: Mainchain;
	private _sidechain: Sidechain;
	private readonly _senderPublicKey: Buffer;
	private readonly _fee: bigint;

	constructor(mainchain: Mainchain, sidechain: Sidechain, publicKey: Buffer, fee: bigint) {
		this._mainchain = mainchain;
		this._sidechain = sidechain;
		this._senderPublicKey = publicKey;
		this._fee = fee;
	}

	/**
	 * https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#message-recovery-initialization-command
	 *
	 * Naming is based on ```command: 'initializeMessageRecovery',```
	 */
	async initializeMessageRecoveryTransaction(
		inclusionProofAtLastCertifiedHeight: InclusionProofWithHeightAndStateRoot,
	): Promise<Transaction> {
		const inclusionProof = inclusionProofAtLastCertifiedHeight.inclusionProof;

		const messageRecoveryInitializationParams: MessageRecoveryInitializationParams = {
			// chainID: The ID of the sidechain whose terminated outbox account is to be initialized.
			chainID: Buffer.from(this._sidechain.getChainID(), 'hex'),
			// channel: The channel of this chain stored on the terminated sidechain.
			// since message recovery mechanism works only on mainchain, this will always refer to mainchain channel
			channel: codec.encode(
				channelSchema,
				this._sidechain.getChannelData(this._mainchain.getChainID()),
			),
			// bitmap: The bitmap of the inclusion proof of the channel in the sidechain state tree.
			bitmap: inclusionProof.bitmap,
			// siblingHashes: The sibling hashes of the inclusion proof of the channel in the sidechain state tree.
			siblingHashes: inclusionProof.siblingHashes,
		};

		// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#cross-chain-message-schema
		return new Transaction({
			module: MODULE_NAME_INTEROPERABILITY,
			command: 'initializeMessageRecovery',
			params: codec.encodeJSON(
				messageRecoveryInitializationParamsSchema,
				messageRecoveryInitializationParams,
			),
			fee: this._fee,
			nonce: BigInt(await this._mainchain.getNonce()),
			senderPublicKey: this._senderPublicKey,
			signatures: [],
		});
	}

	/**
	 * https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#message-recovery-command
	 * Naming is based on ```command: 'recoverMessage',```
	 */
	async createRecoverMessageTransaction(ccms: CCMsg[]): Promise<Transaction> {
		const proof = await this._generateProof(ccms);

		const messageRecoveryParams: MessageRecoveryParams = {
			// chainID: The ID of the terminated sidechain identifying the terminated outbox from which messages will be recovered.
			chainID: Buffer.from(this._sidechain.getChainID(), 'hex'),
			// crossChainMessages: The cross-chain messages to be recovered.
			crossChainMessages: [toBytes(this._getRecoverableCCMs(ccms))],
			// idxs: The indices of the messages to be recovered.
			idxs: proof.idxs as number[],
			// siblingHashes: The sibling hashes of the inclusion proof of the cross-chain messages in the sidechain outbox.
			siblingHashes: proof.siblingHashes as Buffer[],
		};

		// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0049.md#cross-chain-message-schema
		return new Transaction({
			module: MODULE_NAME_INTEROPERABILITY,
			command: COMMAND_RECOVER_MESSAGE,
			fee: this._fee,
			params: codec.encodeJSON(messageRecoveryParamsSchema, messageRecoveryParams),
			nonce: BigInt(await this._mainchain.getNonce()),
			senderPublicKey: this._senderPublicKey,
			signatures: [],
		});
	}

	private async _generateProof(ccms: CCMsg[]) {
		const merkleTree = new MerkleTree();
		await merkleTree.init(ccms.map(ccm => toBytes(ccm)));

		const recoverableCCMs = this._getRecoverableCCMs(ccms);

		const LEAF_PREFIX = Buffer.from('00', 'hex');
		const queryHash = cryptography.utils.hash(
			Buffer.concat(
				[LEAF_PREFIX, toBytes(recoverableCCMs)],
				LEAF_PREFIX.length + toBytes(recoverableCCMs).length,
			),
		);
		return await merkleTree.generateProof([queryHash]);
	}

	private _getRecoverableCCMs(ccms: CCMsg[]) {
		return ccms.filter(ccm => ccm.crossChainCommand === 'transferCrossChain')[0];
	}
}
