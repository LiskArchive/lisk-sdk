/* eslint-disable class-methods-use-this */

import { BaseCCCommand, CrossChainMessageContext, codec } from 'lisk-sdk';
import { crossChainReactParamsSchema, CCReactMessageParams } from '../schema';
import {
	MAX_RESERVED_ERROR_STATUS,
	CCM_STATUS_OK,
	CROSS_CHAIN_COMMAND_NAME_REACT,
} from '../constants';
import { ReactionStore } from '../stores/reaction';

export class ReactCCCommand extends BaseCCCommand {
	public schema = crossChainReactParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_REACT;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;

		if (ccm.status > MAX_RESERVED_ERROR_STATUS) {
			throw new Error('Invalid CCM status code.');
		} else if (ccm.status === CCM_STATUS_OK) {
			throw new Error('Bounced CCM.');
		}
	}

	public async execute(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		// const methodContext = ctx.getMethodContext();
		// const { sendingChainID, status, receivingChainID } = ccm;

		const params = codec.decode<CCReactMessageParams>(crossChainReactParamsSchema, ccm.params);
		const { helloMessageID, reactionType, senderAddress } = params;
		const reactionSubstore = this.stores.get(ReactionStore);

		const msgReactions = await reactionSubstore.get(ctx, helloMessageID);

		if (reactionType === 0) {
			// TODO: Check if the Likes array already contains the sender address. If yes, remove the address to unlike the post.
			msgReactions.reactions.like.push(senderAddress);
		}

		await reactionSubstore.set(ctx, helloMessageID, msgReactions);
	}
}
