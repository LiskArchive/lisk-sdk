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
import { utils } from '@liskhq/lisk-cryptography';
import { SparseMerkleTree } from '@liskhq/lisk-db';
import {
	CommandExecuteContext,
	CommandVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../../../state_machine/types';
import { ChannelData } from '../../types';
import { BaseInteroperabilityCommand } from '../../base_interoperability_command';
import { MainchainInteroperabilityInternalMethod } from '../internal_method';
import { getMainchainID } from '../../utils';
import { EMPTY_BYTES } from '../../constants';
import { messageRecoveryInitializationParamsSchema } from '../../schemas';
import { OwnChainAccountStore } from '../../stores/own_chain_account';
import { ChainAccountStore } from '../../stores/chain_account';
import { TerminatedStateStore } from '../../stores/terminated_state';
import { ChannelDataStore, channelSchema } from '../../stores/channel_data';
import { TerminatedOutboxStore } from '../../stores/terminated_outbox';

export interface MessageRecoveryInitializationParams {
	chainID: Buffer;
	channel: Buffer;
	bitmap: Buffer;
	siblingHashes: Buffer[];
}

// LIP: https://github.com/LiskHQ/lips/blob/main/proposals/lip-0054.md#message-recovery-initialization-command
export class InitializeMessageRecoveryCommand extends BaseInteroperabilityCommand<MainchainInteroperabilityInternalMethod> {
	public schema = messageRecoveryInitializationParamsSchema;

	public async verify(
		context: CommandVerifyContext<MessageRecoveryInitializationParams>,
	): Promise<VerificationResult> {
		const { params } = context;

		const ownchainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		const mainchainID = getMainchainID(ownchainAccount.chainID);
		if (params.chainID.equals(mainchainID) || params.chainID.equals(ownchainAccount.chainID)) {
			throw new Error('Chain ID is not valid.');
		}

		const chainAccountExist = await this.stores.get(ChainAccountStore).has(context, params.chainID);
		if (!chainAccountExist) {
			throw new Error('Chain is not registered.');
		}

		const terminatedAccountExists = await this.stores
			.get(TerminatedStateStore)
			.has(context, params.chainID);
		if (!terminatedAccountExists) {
			throw new Error('Terminated state account not present.');
		}

		const terminatedAccount = await this.stores
			.get(TerminatedStateStore)
			.get(context, params.chainID);

		const terminatedOutboxAccountExists = await this.stores
			.get(TerminatedOutboxStore)
			.has(context, params.chainID);
		if (terminatedOutboxAccountExists) {
			throw new Error('Terminated outbox account already exists.');
		}

		const ownChainAccount = await this.stores.get(OwnChainAccountStore).get(context, EMPTY_BYTES);
		const queryKey = Buffer.concat([
			// key contains both module and store key
			this.stores.get(ChannelDataStore).key,
			utils.hash(ownChainAccount.chainID),
		]);
		const query = {
			key: queryKey,
			value: utils.hash(params.channel),
			bitmap: params.bitmap,
		};

		const smt = new SparseMerkleTree();
		const valid = await smt.verify(terminatedAccount.stateRoot, [queryKey], {
			siblingHashes: params.siblingHashes,
			queries: [query],
		});

		if (!valid) {
			throw new Error('Message recovery initialization proof of inclusion is not valid.');
		}

		return {
			status: VerifyStatus.OK,
		};
	}

	public async execute(
		context: CommandExecuteContext<MessageRecoveryInitializationParams>,
	): Promise<void> {
		const { params } = context;
		const partnerChannel = codec.decode<ChannelData>(channelSchema, params.channel);
		const channel = await this.stores.get(ChannelDataStore).get(context, params.chainID);
		await this.internalMethod.createTerminatedOutboxAccount(
			context,
			params.chainID,
			channel.outbox.root,
			channel.outbox.size,
			partnerChannel.inbox.size,
		);
	}
}
