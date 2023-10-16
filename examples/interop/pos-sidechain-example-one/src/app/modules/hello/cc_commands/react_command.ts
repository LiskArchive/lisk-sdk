/* eslint-disable class-methods-use-this */

import { BaseCCCommand, CrossChainMessageContext, codec, cryptography, db } from 'lisk-sdk';
import { crossChainReactParamsSchema, CCReactMessageParams } from '../schema';
import { MAX_RESERVED_ERROR_STATUS, CROSS_CHAIN_COMMAND_NAME_REACT } from '../constants';
import { ReactionStore, ReactionStoreData } from '../stores/reaction';

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
		}
	}

	public async execute(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;
		// const methodContext = ctx.getMethodContext();
		// const { sendingChainID, status, receivingChainID } = ccm;

		const params = codec.decode<CCReactMessageParams>(crossChainReactParamsSchema, ccm.params);
		const { helloMessageID, reactionType, senderAddress } = params;
		const reactionSubstore = this.stores.get(ReactionStore);

		const messageCreatorAddress = cryptography.address.getAddressFromLisk32Address(
			helloMessageID.toString('utf-8'),
		);
		let msgReactions: ReactionStoreData;
		try {
			msgReactions = await reactionSubstore.get(ctx, messageCreatorAddress);
		} catch (error) {
			if (!(error instanceof db.NotFoundError)) {
				throw error;
			}

			ctx.logger.info({ helloMessageID, crossChainCommand: this.name }, error.message);

			return;
		}

		if (reactionType === 0) {
			// TODO: Check if the Likes array already contains the sender address. If yes, remove the address to unlike the post.
			msgReactions.reactions.like.push(senderAddress);
		}

		await reactionSubstore.set(ctx, helloMessageID, msgReactions);
	}
}
