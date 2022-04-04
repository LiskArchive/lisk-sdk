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

import { codec } from '@liskhq/lisk-codec';
import { NotFoundError } from '@liskhq/lisk-chain';
import { hash } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import { SubStore } from '../../node/state_machine/types';
import {
	CROSS_CHAIN_COMMAND_ID_CHANNEL_TERMINATED,
	CCM_STATUS_OK,
	EMPTY_BYTES,
	MODULE_ID_INTEROPERABILITY,
	STORE_PREFIX_CHAIN_DATA,
	STORE_PREFIX_TERMINATED_STATE,
	STORE_PREFIX_CHANNEL_DATA,
	STORE_PREFIX_OUTBOX_ROOT,
	STORE_PREFIX_TERMINATED_OUTBOX,
	STORE_PREFIX_OWN_CHAIN_DATA,
	MAINCHAIN_ID,
	CHAIN_TERMINATED,
} from './constants';
import {
	chainAccountSchema,
	terminatedStateSchema,
	ccmSchema,
	channelSchema,
	outboxRootSchema,
	terminatedOutboxSchema,
	ownChainAccountSchema,
} from './schema';
import { BaseInteroperableModule } from './base_interoperable_module';
import {
	BeforeSendCCMsgAPIContext,
	ChannelData,
	CCMsg,
	CCUpdateParams,
	ChainAccount,
	SendInternalContext,
	TerminatedStateAccount,
	OwnChainAccount,
} from './types';
import { getIDAsKeyForStore } from './utils';

export abstract class BaseInteroperabilityStore {
	public readonly getStore: (moduleID: number, storePrefix: number) => SubStore;
	protected readonly _moduleID: number;
	protected readonly _interoperableModules = new Map<number, BaseInteroperableModule>();

	public constructor(
		moduleID: number,
		getStore: (moduleID: number, storePrefix: number) => SubStore,
		interoperableModules: Map<number, BaseInteroperableModule>,
	) {
		this._moduleID = moduleID;
		this._interoperableModules = interoperableModules;
		this.getStore = getStore;
		// eslint-disable-next-line no-console
		console.log(!this._moduleID, !this._interoperableModules, !this.getStore);
	}

	public async getOwnChainAccount(): Promise<OwnChainAccount> {
		const ownChainAccountStore = this.getStore(this._moduleID, STORE_PREFIX_OWN_CHAIN_DATA);
		return ownChainAccountStore.getWithSchema<OwnChainAccount>(
			getIDAsKeyForStore(MAINCHAIN_ID),
			ownChainAccountSchema,
		);
	}

	public async setOwnChainAccount(ownChainAccount: OwnChainAccount): Promise<void> {
		const ownChainAccountStore = this.getStore(this._moduleID, STORE_PREFIX_OWN_CHAIN_DATA);
		await ownChainAccountStore.setWithSchema(
			getIDAsKeyForStore(MAINCHAIN_ID),
			ownChainAccount,
			ownChainAccountSchema,
		);
	}

	public async appendToInboxTree(chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA);
		const channel = await channelSubstore.getWithSchema<ChannelData>(chainID, channelSchema);
		const updatedInbox = regularMerkleTree.calculateMerkleRoot({
			value: hash(appendData),
			appendPath: channel.inbox.appendPath,
			size: channel.inbox.size,
		});
		await channelSubstore.setWithSchema(
			chainID,
			{ ...channel, inbox: updatedInbox },
			channelSchema,
		);
	}

	public async appendToOutboxTree(chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA);
		const channel = await channelSubstore.getWithSchema<ChannelData>(chainID, channelSchema);
		const updatedOutbox = regularMerkleTree.calculateMerkleRoot({
			value: hash(appendData),
			appendPath: channel.outbox.appendPath,
			size: channel.outbox.size,
		});
		await channelSubstore.setWithSchema(
			chainID,
			{ ...channel, outbox: updatedOutbox },
			channelSchema,
		);
	}

	public async addToOutbox(chainID: Buffer, ccm: CCMsg) {
		const serializedMessage = codec.encode(ccmSchema, ccm);
		await this.appendToOutboxTree(chainID, serializedMessage);

		const channelSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHANNEL_DATA);
		const channel = await channelSubstore.getWithSchema<ChannelData>(chainID, channelSchema);

		const outboxRootSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_OUTBOX_ROOT);
		await outboxRootSubstore.setWithSchema(chainID, channel.outbox.root, outboxRootSchema);
	}

	public async hasTerminatedStateAccount(chainID: Buffer): Promise<boolean> {
		const terminatedStateSubstore = this.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);
		return terminatedStateSubstore.has(chainID);
	}

	public async getChainAccount(chainID: Buffer): Promise<ChainAccount> {
		const chainSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA);
		return chainSubstore.getWithSchema<ChainAccount>(chainID, chainAccountSchema);
	}

	public async chainAccountExist(chainID: Buffer): Promise<boolean> {
		const chainSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA);
		try {
			await chainSubstore.getWithSchema<ChainAccount>(chainID, chainAccountSchema);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return false;
		}

		return true;
	}

	public async getTerminatedStateAccount(chainID: Buffer): Promise<TerminatedStateAccount> {
		const terminatedStateSubstore = this.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);
		return terminatedStateSubstore.getWithSchema<TerminatedStateAccount>(
			chainID,
			terminatedStateSchema,
		);
	}

	public async createTerminatedOutboxAccount(
		chainID: Buffer,
		outboxRoot: Buffer,
		outboxSize: number,
		partnerChainInboxSize: number,
	): Promise<void> {
		const terminatedOutboxSubstore = this.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_OUTBOX,
		);

		const terminatedOutbox = {
			outboxRoot,
			outboxSize,
			partnerChainInboxSize,
		};

		await terminatedOutboxSubstore.setWithSchema(chainID, terminatedOutbox, terminatedOutboxSchema);
	}

	public async createTerminatedStateAccount(chainID: number, stateRoot?: Buffer): Promise<boolean> {
		const chainIDAsStoreKey = getIDAsKeyForStore(chainID);
		const chainSubstore = this.getStore(MODULE_ID_INTEROPERABILITY, STORE_PREFIX_CHAIN_DATA);
		const isExist = await this.chainAccountExist(chainIDAsStoreKey);
		let terminatedState: TerminatedStateAccount;

		if (stateRoot) {
			if (isExist) {
				const chainAccount = await chainSubstore.getWithSchema<ChainAccount>(
					chainIDAsStoreKey,
					chainAccountSchema,
				);
				chainAccount.status = CHAIN_TERMINATED;
				await chainSubstore.setWithSchema(chainIDAsStoreKey, chainAccount, chainAccountSchema);
				const outboxRootSubstore = this.getStore(
					MODULE_ID_INTEROPERABILITY,
					STORE_PREFIX_OUTBOX_ROOT,
				);
				await outboxRootSubstore.del(chainIDAsStoreKey);
			}
			terminatedState = {
				stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			};
		} else if (isExist) {
			const chainAccount = await chainSubstore.getWithSchema<ChainAccount>(
				chainIDAsStoreKey,
				chainAccountSchema,
			);
			chainAccount.status = CHAIN_TERMINATED;
			await chainSubstore.setWithSchema(chainIDAsStoreKey, chainAccount, chainAccountSchema);
			const outboxRootSubstore = this.getStore(
				MODULE_ID_INTEROPERABILITY,
				STORE_PREFIX_OUTBOX_ROOT,
			);
			await outboxRootSubstore.del(chainIDAsStoreKey);

			terminatedState = {
				stateRoot: chainAccount.lastCertificate.stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			};
		}

		// State root is not available, set it to empty bytes temporarily.
		// This should only happen on a sidechain.
		else {
			// Processing on the mainchain
			const ownChainAccount = await this.getOwnChainAccount();
			if (ownChainAccount.id === MAINCHAIN_ID) {
				// If the account does not exist on the mainchain, the input chainID is invalid.
				return false;
			}
			const chainAccount = await chainSubstore.getWithSchema<ChainAccount>(
				getIDAsKeyForStore(MAINCHAIN_ID),
				chainAccountSchema,
			);
			terminatedState = {
				stateRoot: EMPTY_BYTES,
				mainchainStateRoot: chainAccount.lastCertificate.stateRoot,
				initialized: false,
			};
		}

		const terminatedStateSubstore = this.getStore(
			MODULE_ID_INTEROPERABILITY,
			STORE_PREFIX_TERMINATED_STATE,
		);
		await terminatedStateSubstore.setWithSchema(
			chainIDAsStoreKey,
			terminatedState,
			terminatedStateSchema,
		);

		return true;
	}

	public async terminateChainInternal(
		chainID: number,
		beforeSendContext: BeforeSendCCMsgAPIContext,
	): Promise<boolean> {
		const messageSent = await this.sendInternal({
			moduleID: MODULE_ID_INTEROPERABILITY,
			crossChainCommandID: CROSS_CHAIN_COMMAND_ID_CHANNEL_TERMINATED,
			receivingChainID: chainID,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: EMPTY_BYTES,
			timestamp: Date.now(),
			beforeSendContext,
		});

		if (!messageSent) {
			return false;
		}

		return this.createTerminatedStateAccount(chainID);
	}

	// Different in mainchain and sidechain so to be implemented in each module store separately
	public abstract isLive(chainID: Buffer, timestamp?: number): Promise<boolean>;
	public abstract sendInternal(sendContext: SendInternalContext): Promise<boolean>;

	// To be implemented in base class
	public abstract apply(ccu: CCUpdateParams, ccm: CCMsg): Promise<void>;
	public abstract getInboxRoot(chainID: number): Promise<void>;
	public abstract getOutboxRoot(chainID: number): Promise<void>;
	public abstract getChannel(chainID: number): Promise<void>; // TODO: Update to Promise<ChannelData> after implementation
}
