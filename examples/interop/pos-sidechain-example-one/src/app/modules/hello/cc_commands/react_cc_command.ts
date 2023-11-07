/* eslint-disable class-methods-use-this */

import { BaseCCCommand, CrossChainMessageContext, codec, cryptography, db } from 'lisk-sdk';
import { CCReactMessageParamsSchema, CCReactMessageParams } from '../schemas';
import { MAX_RESERVED_ERROR_STATUS, CROSS_CHAIN_COMMAND_NAME_REACT } from '../constants';
import { ReactionStore, ReactionStoreData } from '../stores/reaction';
import { MessageStore } from '../stores/message';

export class ReactCCCommand extends BaseCCCommand {
	public schema = CCReactMessageParamsSchema;

	public get name(): string {
		return CROSS_CHAIN_COMMAND_NAME_REACT;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verify(ctx: CrossChainMessageContext): Promise<void> {
		const { ccm } = ctx;

		if (ccm.status > MAX_RESERVED_ERROR_STATUS) {
			throw new Error('Invalid CCM status code.');
		}

		const params = codec.decode<CCReactMessageParams>(CCReactMessageParamsSchema, ccm.params);
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
		// const { sendingChainID, status, receivingChainID } = ccm;
		// Decode the provided CCM parameters
		const params = codec.decode<CCReactMessageParams>(CCReactMessageParamsSchema, ccm.params);
		logger.info(params, 'parameters');
		// Get helloMessageID and reactionType from the parameters
		const { helloMessageID, reactionType } = params;
		const reactionSubstore = this.stores.get(ReactionStore);
		const messageCreatorAddress = cryptography.address.getAddressFromLisk32Address(helloMessageID);
		let msgReactions: ReactionStoreData;

		// Get existing reactions for a Hello message, or initialize an empty reaction object, if none exists,yet.
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

		let likes = msgReactions.reactions.like;
		// Check if the reactions is a like
		if (reactionType === 0) {
			const hasLiked = likes.indexOf(ctx.transaction.senderAddress);
			// If the sender has already liked the message
			if (hasLiked > -1) {
				// Remove the sender address from the likes for the message
				likes = likes.splice(hasLiked, 1);
				// If the sender has not liked the message yet
			} else {
				// Add the sender address to the likes of the message
				likes.push(ctx.transaction.senderAddress);
			}
		} else {
			logger.error({ reactionType }, 'invalid reaction type');
		}
		msgReactions.reactions.like = likes;
		// Update the reaction store with the reactions for the specified Hello message
		await reactionSubstore.set(ctx, messageCreatorAddress, msgReactions);
	}
}
