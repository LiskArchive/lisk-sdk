/* eslint-disable class-methods-use-this */

import { BaseCCCommand, CrossChainMessageContext, codec, cryptography, db } from 'lisk-sdk';
import { crossChainReactParamsSchema, CCReactMessageParams } from '../schemas';
import { MAX_RESERVED_ERROR_STATUS, CROSS_CHAIN_COMMAND_NAME_REACT } from '../constants';
import { ReactionStore, ReactionStoreData } from '../stores/reaction';
import { MessageStore } from '../stores/message';

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

		const params = codec.decode<CCReactMessageParams>(crossChainReactParamsSchema, ccm.params);
		const messageCreatorAddress = cryptography.address.getAddressFromLisk32Address(
			params.helloMessageID,
		);
		if (!(await this.stores.get(MessageStore).has(ctx, messageCreatorAddress))) {
			throw new Error('Message ID does not exists.');
		}
	}

	public async execute(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm, logger } = ctx;
		logger.info('Executing React CCM');
		// const methodContext = ctx.getMethodContext();
		// const { sendingChainID, status, receivingChainID } = ccm;
		const params = codec.decode<CCReactMessageParams>(crossChainReactParamsSchema, ccm.params);
		logger.info(params, 'parameters');
		const { helloMessageID, reactionType } = params;
		const reactionSubstore = this.stores.get(ReactionStore);
		const messageCreatorAddress = cryptography.address.getAddressFromLisk32Address(helloMessageID);
		let msgReactions: ReactionStoreData;

		try {
			msgReactions = await reactionSubstore.get(ctx, messageCreatorAddress);
		} catch (error) {
			if (!(error instanceof db.NotFoundError)) {
				logger.info({ helloMessageID, crossChainCommand: this.name }, (error as Error).message);
				logger.error({ error }, 'Error when getting the reaction substore');
				throw error;
			}
			logger.info(
				{ helloMessageID, crossChainCommand: this.name },
				`No entry exists for given helloMessageID ${helloMessageID}. Creating a default entry.`,
			);
			msgReactions = { reactions: { like: [] } };
		}
		if (reactionType === 0) {
			const hasLiked = msgReactions.reactions.like.indexOf(ctx.transaction.senderAddress);
			if (hasLiked > -1) {
				msgReactions.reactions.like = msgReactions.reactions.like.splice(hasLiked, 1);
			} else {
				msgReactions.reactions.like.push(ctx.transaction.senderAddress);
			}
		} else {
			logger.error({ reactionType }, 'invalid reaction type');
		}
		await reactionSubstore.set(ctx, messageCreatorAddress, msgReactions);
	}
}
