/*
 * Copyright © 2018 Lisk Foundation
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

'use strict';

const { maxBy, groupBy } = require('lodash');
const ForkChoiceRule = require('../blocks/fork_choice_rule');

class BlockSynchronizationMechanism {
	constructor({
		storage,
		logger,
		bft,
		slots,
		channel,
		blocks,
		activeDelegates,
		processorModule,
	}) {
		this.storage = storage;
		this.logger = logger;
		this.bft = bft;
		this.slots = slots;
		this.channel = channel;
		this.blocks = blocks;
		this.processorModule = processorModule;
		this.constants = {
			activeDelegates,
		};
		this.active = false;
	}

	async run(receivedBlock) {
		this.active = true;
		const { connectedPeers: peers } = await this.channel.invoke(
			'network:getNetworkStatus',
		);
		if (!peers.length) {
			throw new Error('Connected peers list is empty');
		}

		const bestPeer = this._computeBestPeer(peers);

		await this._requestAndValidateLastBlock(receivedBlock, bestPeer);

		await this._revertToLastCommonBlock(receivedBlock, bestPeer);
	}

	get isActive() {
		return this.active;
	}

	/**
	 * Check if this sync mechanism is valid for the received block
	 *
	 * @param {object} receivedBlock - The blocked received from the network
	 * @return {Promise.<Boolean|undefined>} - If the mechanism applied to received block
	 * @throws {Error} - In case want to abort the sync pipeline
	 */
	// eslint-disable-next-line no-unused-vars
	async isValidFor(receivedBlock) {
		// 2. Step: Check whether current chain justifies triggering the block synchronization mechanism
		const finalizedBlock = await this.storage.entities.Block.getOne({
			height_eq: this.bft.finalizedHeight,
		});
		const finalizedBlockSlot = this.slots.getSlotNumber(
			finalizedBlock.timestamp,
		);
		const currentBlockSlot = this.slots.getSlotNumber();
		const threeRounds = this.constants.activeDelegates * 3;

		return finalizedBlockSlot < currentBlockSlot - threeRounds;
	}

	/**
	 * Requests the last common block id in common with the targeted peer.
	 * In order to do that, sends a set of network calls which include a set of block ids
	 * corresponding to the first block of descendent consecutive rounds (starting from the last one)
	 * @param peer
	 * @return {Promise<string>}
	 * @private
	 */
	async _requestLastCommonBlockId(peer) {
		// The node requests the last common block C from P (Peer).
		const [block] = await this.storage.entities.Block.get({
			sort: 'height:desc',
			limit: 1,
		});

		const { height: tipHeight } = block;
		const numberOfRoundsSinceGenesis =
			tipHeight / this.constants.activeDelegates;
		const numberOfRoundsPerRequest = 5;
		let highestCommonBlockId;
		let requestCounter = 0;

		// TODO: I am assuming we try to perform a X number of calls to the peer before
		// giving up. We have to discuss this, as we can also perform one single call with a bigger array.
		// This would simplify the code a bit more.
		while (!highestCommonBlockId && requestCounter < numberOfRoundsPerRequest) {
			const blockIds = [];

			// Compute the list of block ids
			// TODO: Maybe we can avoid using ugly class for loop here. Feel free to change it
			for (let j = numberOfRoundsSinceGenesis; j > 0; j--) {
				const heightFirstBlockRound = j - 1 * this.constants.activeDelegates;

				const [firstBlockRound] = await this.storage.entities.Block.get(
					{ height: heightFirstBlockRound },
					{
						sort: 'height:desc',
						limit: 1,
					},
				);

				if (firstBlockRound) {
					blockIds.push(firstBlockRound.id);
				}
			}

			// Request the highest common block id with the previously computed list
			// to the given peer
			const { data } = await this.channel.invoke('network:requestFromPeer', {
				procedure: 'getHighestCommonBlockId',
				peerId: peer.id,
				data: blockIds,
			});

			highestCommonBlockId = data;
			requestCounter++;
		}

		return highestCommonBlockId;
	}

	/**
	 * Reverts the current chain so the new tip of the chain corresponds to the
	 * last common block.
	 * @param {Object} peer - The selected peer to target.
	 * @return {Promise<void>}
	 * @private
	 */
	async _revertToLastCommonBlock(receivedBlock, peer) {
		// FIXME: Maybe we need to return the full block instead of just the id, as the only use case  is this one and it requires the block height.
		// We can also not do this and request the full block to the peer but this results in unnecessary network calls
		const lastCommonBlockId = await this._requestLastCommonBlockId(peer);

		const chainHeightFinalized = this.bft.finalizedHeight;

		if (!lastCommonBlockId) {
			// TODO: halt the execution of the syncing mechanism as stated in the LIP
		}

		if (lastCommonBlockId.height < chainHeightFinalized) {
			this.channel.invoke('network:applyPenalty', {
				peerId: peer.id,
				penalty: 100,
			});
			this.channel.publish('chain:processor:sync', { block: receivedBlock });
			throw new Error('');
		}

		// TODO: Delete blocks on system chain from current tip to `lastCommonBlockId`
	}

	/**
	 * Requests the last full block from an specific peer and performs
	 * validations against this block after it has been received.
	 * If valid, the full block is returned.
	 * If invalid, an exception is thrown.
	 *
	 * This behavior is defined in section `2. Step: Obtain tip of chain` in LIP-0014
	 * @link https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
	 * @param {Object} receivedBlock - The block received from the network that
	 * triggered this syncing mechanism.
	 * @param {Object } peer - Peer object containing a peer id, necessary to target
	 * the peer specifically to request its last block of its chain.
	 * @return {Promise<Object>}
	 * @private
	 */
	async _requestAndValidateLastBlock(receivedBlock, peer) {
		const { data: networkLastBlock } = await this.channel.invoke(
			'network:requestFromPeer',
			{
				procedure: 'getLastBlock',
				peerId: peer.id,
			},
		);

		try {
			await this.processorModule.validateDetached(networkLastBlock);
			// For networkLastBlock to be valid, it needs to be in a different chain,
			// as this syncing mechanism is only triggered when a block from a different
			// chain is received. We have to re validate this condition upon requesting
			// the full block from the peer.
			if (
				!ForkChoiceRule.isDifferentChain(
					this.blocks.lastBlock,
					networkLastBlock,
				)
			) {
				throw new Error('Block is not in a different chain');
			}

			return networkLastBlock;
		} catch (err) {
			this.channel.invoke('network:applyPenalty', {
				peerId: peer.id,
				penalty: 100,
			});
			this.channel.publish('chain:processor:sync', { block: receivedBlock });
			throw err;
		} finally {
			this.active = false;
		}
	}

	/**
	 * From an input list of peers, computes the best peer to continue working with
	 * according to the set of rules defined in Step 1. of Block Synchroniztion Mechanism
	 * @link https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#block-synchronization-mechanism
	 * @param peers
	 * @return {Array<Object>}
	 * @private
	 */
	_computeBestPeer(peers) {
		// Largest subset of peers with largest prevotedConfirmedUptoHeight
		const largestSubsetByPrevotedConfirmedUptoHeight = this._computeLargestSubsetMaxBy(
			peers,
			peer => peer.prevotedConfirmedUptoHeight,
		);
		// Largest subset of peers with largest height
		const largestSubsetByHeight = this._computeLargestSubsetMaxBy(
			largestSubsetByPrevotedConfirmedUptoHeight,
			peer => peer.height,
		);
		// Group peers by their block Id
		// Output: {{'lastBlockId':[peers], 'anotherBlockId': [peers]}
		const peersGroupedByBlockId = groupBy(
			largestSubsetByHeight,
			peer => peer.lastBlockId,
		);

		const blockIds = Object.keys(peersGroupedByBlockId);
		let maxNumberOfPeersInSet = 0;
		let selectedPeers = [];
		let selectedBlockId = blockIds[0];
		// Find the largest subset
		// eslint-disable-next-line no-restricted-syntax
		for (const blockId of blockIds) {
			const peersByBlockId = peersGroupedByBlockId[blockId];
			const numberOfPeersInSet = peersByBlockId.length;
			if (
				numberOfPeersInSet > maxNumberOfPeersInSet ||
				(numberOfPeersInSet === maxNumberOfPeersInSet &&
					blockId < selectedBlockId)
			) {
				maxNumberOfPeersInSet = numberOfPeersInSet;
				selectedPeers = peersByBlockId;
				selectedBlockId = blockId;
			}
		}

		const peersTip = {
			prevotedConfirmedUptoHeight: peers[0].prevotedConfirmedUptoHeight,
			height: peers[0].height,
		};

		if (!ForkChoiceRule.isDifferentChain(this.blocks.lastBlock, peersTip)) {
			throw new Error('Violation of fork choice rule');
		}

		return selectedPeers[Math.floor(Math.random() * selectedPeers.length)];
	}

	/**
	 * Computes the largest subset of an array of object literals by the maximum
	 * value of the property returned in `condition` function
	 *
	 * @param {Array<Object>} arrayOfObjects
	 * @param {Function} propertySelectorFunc
	 * @return {Array<Object>}
	 * @private
	 *
	 * @example
	 *
	 * const input = [{id: 1, height: 2}, {id: 2, height: 3}, {id: 3, height: 3}]
	 * const output = _computeLargestSubsetMaxBy(input, item => item.height);
	 *
	 * `output` equals to: [{id: 2, height: 3}, {id: 3, height: 3}]
	 */
	// eslint-disable-next-line class-methods-use-this
	_computeLargestSubsetMaxBy(arrayOfObjects, propertySelectorFunc) {
		const maximumBy = maxBy(arrayOfObjects, propertySelectorFunc);
		const absoluteMax = propertySelectorFunc(maximumBy);
		const largestSubset = [];
		// eslint-disable-next-line no-restricted-syntax
		for (const item of arrayOfObjects) {
			if (propertySelectorFunc(item) === absoluteMax) {
				largestSubset.push(item);
			}
		}
		return largestSubset;
	}
}

module.exports = { BlockSynchronizationMechanism };
