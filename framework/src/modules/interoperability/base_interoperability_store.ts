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
import { utils } from '@liskhq/lisk-cryptography';
import { regularMerkleTree } from '@liskhq/lisk-tree';
import {
	CCM_STATUS_OK,
	EMPTY_BYTES,
	MAINCHAIN_ID,
	CHAIN_TERMINATED,
	MIN_RETURN_FEE,
	EMPTY_FEE_ADDRESS,
	CCM_STATUS_MODULE_NOT_SUPPORTED,
	CCM_STATUS_CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
	CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED,
	MODULE_NAME_INTEROPERABILITY,
	MAX_UINT32,
} from './constants';
import { ccmSchema } from './schemas';
import {
	ChannelData,
	CCMsg,
	ChainAccount,
	SendInternalContext,
	OwnChainAccount,
	CCMApplyContext,
	TerminateChainContext,
} from './types';
import { getCCMSize, getIDAsKeyForStore } from './utils';
import {
	createCCCommandExecuteContext,
	createCCMsgBeforeApplyContext,
	createCCMsgBeforeSendContext,
} from './context';
import { BaseInteroperableMethod } from './base_interoperable_method';
import { BaseCCCommand } from './base_cc_command';
import { ImmutableStoreGetter, StoreGetter } from '../base_store';
import { NamedRegistry } from '../named_registry';
import { OwnChainAccountStore } from './stores/own_chain_account';
import { ChannelDataStore } from './stores/channel_data';
import { OutboxRootStore } from './stores/outbox_root';
import { TerminatedStateAccount, TerminatedStateStore } from './stores/terminated_state';
import { ChainAccountStore } from './stores/chain_account';
import { TerminatedOutboxAccount, TerminatedOutboxStore } from './stores/terminated_outbox';

export abstract class BaseInteroperabilityStore {
	public readonly context: StoreGetter | ImmutableStoreGetter;
	protected readonly stores: NamedRegistry;
	protected readonly interoperableModuleMethods = new Map<string, BaseInteroperableMethod>();

	public constructor(
		stores: NamedRegistry,
		context: StoreGetter | ImmutableStoreGetter,
		interoperableModuleMethods: Map<string, BaseInteroperableMethod>,
	) {
		this.context = context;
		this.stores = stores;
		this.interoperableModuleMethods = interoperableModuleMethods;
	}

	public async getOwnChainAccount(): Promise<OwnChainAccount> {
		const ownChainAccountStore = this.stores.get(OwnChainAccountStore);
		return ownChainAccountStore.get(this.context, getIDAsKeyForStore(MAINCHAIN_ID));
	}

	public async setOwnChainAccount(ownChainAccount: OwnChainAccount): Promise<void> {
		const ownChainAccountStore = this.stores.get(OwnChainAccountStore);
		await ownChainAccountStore.set(
			this.context as StoreGetter,
			getIDAsKeyForStore(MAINCHAIN_ID),
			ownChainAccount,
		);
	}

	public async getChannel(chainID: Buffer): Promise<ChannelData> {
		const channelAccountStore = this.stores.get(ChannelDataStore);
		return channelAccountStore.get(this.context, chainID);
	}

	public async setChannel(chainID: Buffer, channeldata: ChannelData): Promise<void> {
		const channelAccountStore = this.stores.get(ChannelDataStore);
		await channelAccountStore.set(this.context as StoreGetter, chainID, channeldata);
	}

	public async appendToInboxTree(chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.stores.get(ChannelDataStore);
		const channel = await channelSubstore.get(this.context, chainID);
		const updatedInbox = regularMerkleTree.calculateMerkleRoot({
			value: utils.hash(appendData),
			appendPath: channel.inbox.appendPath,
			size: channel.inbox.size,
		});
		await channelSubstore.set(this.context as StoreGetter, chainID, {
			...channel,
			inbox: updatedInbox,
		});
	}

	public async appendToOutboxTree(chainID: Buffer, appendData: Buffer) {
		const channelSubstore = this.stores.get(ChannelDataStore);
		const channel = await channelSubstore.get(this.context, chainID);
		const updatedOutbox = regularMerkleTree.calculateMerkleRoot({
			value: utils.hash(appendData),
			appendPath: channel.outbox.appendPath,
			size: channel.outbox.size,
		});
		await channelSubstore.set(this.context as StoreGetter, chainID, {
			...channel,
			outbox: updatedOutbox,
		});
	}

	public async addToOutbox(chainID: Buffer, ccm: CCMsg) {
		const serializedMessage = codec.encode(ccmSchema, ccm);
		await this.appendToOutboxTree(chainID, serializedMessage);

		const channelSubstore = this.stores.get(ChannelDataStore);
		const channel = await channelSubstore.get(this.context, chainID);

		const outboxRootSubstore = this.stores.get(OutboxRootStore);
		await outboxRootSubstore.set(this.context as StoreGetter, chainID, channel.outbox);
	}

	public async hasTerminatedStateAccount(chainID: Buffer): Promise<boolean> {
		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		return terminatedStateSubstore.has(this.context, chainID);
	}

	public async getChainAccount(chainID: Buffer): Promise<ChainAccount> {
		const chainSubstore = this.stores.get(ChainAccountStore);
		return chainSubstore.get(this.context, chainID);
	}

	public async getAllChainAccounts(startChainID: Buffer): Promise<ChainAccount[]> {
		const chainSubstore = this.stores.get(ChainAccountStore);
		const endBuf = utils.intToBuffer(MAX_UINT32, 4);
		const chainAccounts = await chainSubstore.iterate(this.context, {
			gte: startChainID,
			lte: endBuf,
		});

		return Promise.all(
			chainAccounts.map(async chainAccount => chainSubstore.get(this.context, chainAccount.key)),
		);
	}

	public async chainAccountExist(chainID: Buffer): Promise<boolean> {
		const chainSubstore = this.stores.get(ChainAccountStore);
		try {
			await chainSubstore.get(this.context, chainID);
		} catch (error) {
			if (!(error instanceof NotFoundError)) {
				throw error;
			}
			return false;
		}

		return true;
	}

	public async getTerminatedStateAccount(chainID: Buffer): Promise<TerminatedStateAccount> {
		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		return terminatedStateSubstore.get(this.context, chainID);
	}

	public async createTerminatedOutboxAccount(
		chainID: Buffer,
		outboxRoot: Buffer,
		outboxSize: number,
		partnerChainInboxSize: number,
	): Promise<void> {
		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);

		const terminatedOutbox = {
			outboxRoot,
			outboxSize,
			partnerChainInboxSize,
		};

		await terminatedOutboxSubstore.set(this.context as StoreGetter, chainID, terminatedOutbox);
	}

	public async hasTerminatedOutboxAccount(chainID: Buffer) {
		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);
		return terminatedOutboxSubstore.has(this.context, chainID);
	}

	public async setTerminatedOutboxAccount(
		chainID: Buffer,
		params: Partial<TerminatedOutboxAccount>,
	): Promise<boolean> {
		// Passed params is empty, no need to call this method
		if (Object.keys(params).length === 0) {
			return false;
		}
		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);

		const doesOutboxExist = await terminatedOutboxSubstore.has(this.context, chainID);

		if (!doesOutboxExist) {
			return false;
		}

		const account = await terminatedOutboxSubstore.get(this.context, chainID);

		const terminatedOutbox = {
			...account,
			...params,
		};

		await terminatedOutboxSubstore.set(this.context as StoreGetter, chainID, terminatedOutbox);

		return true;
	}

	public async terminatedOutboxAccountExist(chainID: Buffer) {
		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);

		return terminatedOutboxSubstore.has(this.context, chainID);
	}

	public async getTerminatedOutboxAccount(chainID: Buffer) {
		const terminatedOutboxSubstore = this.stores.get(TerminatedOutboxStore);

		return terminatedOutboxSubstore.get(this.context, chainID);
	}

	public async createTerminatedStateAccount(chainID: Buffer, stateRoot?: Buffer): Promise<boolean> {
		const chainSubstore = this.stores.get(ChainAccountStore);
		const isExist = await this.chainAccountExist(chainID);
		let terminatedState: TerminatedStateAccount;

		if (stateRoot) {
			if (isExist) {
				const chainAccount = await chainSubstore.get(this.context, chainID);
				chainAccount.status = CHAIN_TERMINATED;
				await chainSubstore.set(this.context as StoreGetter, chainID, chainAccount);
				const outboxRootSubstore = this.stores.get(OutboxRootStore);
				await outboxRootSubstore.del(this.context as StoreGetter, chainID);
			}
			terminatedState = {
				stateRoot,
				mainchainStateRoot: EMPTY_BYTES,
				initialized: true,
			};
		} else if (isExist) {
			const chainAccount = await chainSubstore.get(this.context, chainID);
			chainAccount.status = CHAIN_TERMINATED;
			await chainSubstore.set(this.context as StoreGetter, chainID, chainAccount);
			const outboxRootSubstore = this.stores.get(OutboxRootStore);
			await outboxRootSubstore.del(this.context as StoreGetter, chainID);

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
			if (ownChainAccount.id.equals(getIDAsKeyForStore(MAINCHAIN_ID))) {
				// If the account does not exist on the mainchain, the input chainID is invalid.
				return false;
			}
			const chainAccount = await chainSubstore.get(this.context, getIDAsKeyForStore(MAINCHAIN_ID));
			terminatedState = {
				stateRoot: EMPTY_BYTES,
				mainchainStateRoot: chainAccount.lastCertificate.stateRoot,
				initialized: false,
			};
		}

		const terminatedStateSubstore = this.stores.get(TerminatedStateStore);
		await terminatedStateSubstore.set(this.context as StoreGetter, chainID, terminatedState);

		return true;
	}

	public async terminateChainInternal(
		chainID: Buffer,
		terminateChainContext: TerminateChainContext,
	): Promise<boolean> {
		const messageSent = await this.sendInternal({
			module: MODULE_NAME_INTEROPERABILITY,
			crossChainCommand: CROSS_CHAIN_COMMAND_NAME_CHANNEL_TERMINATED,
			receivingChainID: chainID,
			fee: BigInt(0),
			status: CCM_STATUS_OK,
			params: EMPTY_BYTES,
			eventQueue: terminateChainContext.eventQueue,
			feeAddress: EMPTY_FEE_ADDRESS,
			getMethodContext: terminateChainContext.getMethodContext,
			getStore: terminateChainContext.getStore,
			logger: terminateChainContext.logger,
			chainID: terminateChainContext.chainID,
		});

		if (!messageSent) {
			return false;
		}

		return this.createTerminatedStateAccount(chainID);
	}

	public async apply(
		ccmApplyContext: CCMApplyContext,
		interoperableCCCommands: Map<string, BaseCCCommand[]>,
	): Promise<void> {
		const { ccm, eventQueue, logger, chainID, getMethodContext, getStore } = ccmApplyContext;
		const isTerminated = await this.hasTerminatedStateAccount(ccm.sendingChainID);
		if (isTerminated) {
			return;
		}

		const beforeCCMApplyContext = createCCMsgBeforeApplyContext(
			{
				logger,
				ccm,
				eventQueue,
				getMethodContext,
				getStore,
				chainID,
				feeAddress: ccmApplyContext.feeAddress,
			},
			ccmApplyContext.ccu,
			ccmApplyContext.trsSender,
		);

		for (const mod of this.interoperableModuleMethods.values()) {
			if (mod?.beforeApplyCCM) {
				try {
					await mod.beforeApplyCCM(beforeCCMApplyContext);
				} catch (error) {
					return;
				}
			}
		}

		if (ccm.status !== CCM_STATUS_OK || ccm.fee < MIN_RETURN_FEE * BigInt(getCCMSize(ccm))) {
			return;
		}

		const ccCommands = interoperableCCCommands.get(ccm.module);

		// When moduleID is not supported
		if (!ccCommands) {
			const beforeCCMSendContext = createCCMsgBeforeSendContext({
				ccm,
				eventQueue,
				getMethodContext,
				logger,
				chainID,
				getStore,
				feeAddress: EMPTY_FEE_ADDRESS,
			});

			await this.sendInternal({
				eventQueue: beforeCCMSendContext.eventQueue,
				feeAddress: beforeCCMSendContext.feeAddress,
				getMethodContext: beforeCCMSendContext.getMethodContext,
				getStore: beforeCCMSendContext.getStore,
				logger: beforeCCMSendContext.logger,
				chainID: beforeCCMSendContext.chainID,
				crossChainCommand: ccm.crossChainCommand,
				module: ccm.module,
				fee: BigInt(0),
				params: ccm.params,
				receivingChainID: ccm.receivingChainID,
				status: CCM_STATUS_MODULE_NOT_SUPPORTED,
			});

			return;
		}
		const ccCommand = ccCommands.find(cmd => cmd.name === ccm.crossChainCommand);

		// When commandID is not supported
		if (!ccCommand) {
			const beforeCCMSendContext = createCCMsgBeforeSendContext({
				ccm,
				eventQueue,
				getMethodContext,
				logger,
				chainID,
				getStore,
				feeAddress: EMPTY_FEE_ADDRESS,
			});

			await this.sendInternal({
				eventQueue: beforeCCMSendContext.eventQueue,
				feeAddress: beforeCCMSendContext.feeAddress,
				getMethodContext: beforeCCMSendContext.getMethodContext,
				getStore: beforeCCMSendContext.getStore,
				logger: beforeCCMSendContext.logger,
				chainID: beforeCCMSendContext.chainID,
				crossChainCommand: ccm.crossChainCommand,
				module: ccm.module,
				fee: BigInt(0),
				params: ccm.params,
				receivingChainID: ccm.receivingChainID,
				status: CCM_STATUS_CROSS_CHAIN_COMMAND_NOT_SUPPORTED,
			});

			return;
		}

		const ccCommandExecuteContext = createCCCommandExecuteContext({
			ccm,
			ccmSize: getCCMSize(ccm),
			eventQueue,
			logger,
			chainID,
			getMethodContext,
			getStore,
			feeAddress: ccmApplyContext.feeAddress,
		});

		await ccCommand.execute(ccCommandExecuteContext);
	}

	// Different in mainchain and sidechain so to be implemented in each module store separately
	public abstract isLive(chainID: Buffer, timestamp?: number): Promise<boolean>;
	public abstract sendInternal(sendContext: SendInternalContext): Promise<boolean>;

	// To be implemented in base class
	public abstract getInboxRoot(chainID: Buffer): Promise<void>;
	public abstract getOutboxRoot(chainID: Buffer): Promise<void>;
}
