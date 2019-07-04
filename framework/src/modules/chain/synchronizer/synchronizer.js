const BlockSynchronizationMechanism = require('./block_synchronization_mechanism');
const FastChainSwitchingMechanism = require('./fast_chain_switching_mechanism');

const {
	verifySignature,
	verifyVersion,
	verifyReward,
	verifyId,
	verifyPayload,
	verifyForkOne,
	verifyBlockSlot,
} = require('../blocks/verify');

class Synchronizer {
	constructor({ storage, logger, slots, dpos, bft, activeDelegates }) {
		this.storage = storage;
		this.logger = logger;
		this.dpos = dpos;
		this.bft = bft;
		this.slots = slots;

		this.constants = {
			activeDelegates,
		};

		this.activeMechanism = null;
		this.blockSynchronizationMechanism = new BlockSynchronizationMechanism({
			storage,
			logger,
		});
		this.fastChainSwitchingMechanism = new FastChainSwitchingMechanism({
			storage,
			logger,
		});
	}

	/**
	 * Start the syncing mechanism
	 *
	 * @return {*}
	 */

	/**
	 * Start the syncing mechanism
	 * @param {Object} receivedBlock - The block you received from network, used to choose sync mechanism
	 * @return {*}
	 */
	async run(receivedBlock) {
		if (this.activeMechanism && this.activeMechanism.isActive) {
			throw new Error('Blocks Sychronizer is already running');
		}

		// Choose the right mechanism to sync
		this.activeMechanism = this._determineSyncMechanism(receivedBlock);

		if (!this.activeMechanism) {
			return this.logger.info(
				"Can't determine sync mechanism at the moment for block",
				receivedBlock
			);
		}

		return this.activeMechanism.run(receivedBlock);
	}

	/**
	 * Check if the current syncing mechanism is active
	 * @return {*|never|boolean}
	 */
	isActive() {
		return this.activeMechanism ? this.activeMechanism.isActive : false;
	}

	/**
	 * Determine and return the syncing mechanism strategy to follow
	 * @private
	 */
	// eslint-disable-next-line class-methods-use-this, no-unused-vars
	async _determineSyncMechanism(receivedBlock) {
		// Get last block from the persistence layer
		const lastBlock = this._lastBlock();

		// Moving to a Different Chain
		// 1. Step: Validate new tip of chain
		const result = exportedInterface.verifyBlockBeforeChainSync(
			lastBlock,
			receivedBlock
		);
		if (!result.verified) {
			throw Error(
				`Block verification for chain synchronization failed with errors: ${result.errors.join()}`
			);
		}

		// 2. Step: Check whether current chain justifies triggering the block synchronization mechanism
		const finalizedBlock = await this.storage.entities.Block.getOne({
			height_eq: this.bft.finalizedHeight,
		});
		const finalizedBlockSlot = this.slots.getSlotNumber(
			finalizedBlock.timestamp
		);
		const currentBlockSlot = this.slots.getSlotNumber();
		const THREE_ROUNDS = this.constants.activeDelegates * 3;

		if (finalizedBlockSlot < currentBlockSlot - THREE_ROUNDS) {
			return this.blockSynchronizationMechanism;
		}

		// 3. Step: Check whether B justifies fast chain switching mechanism
		const TWO_ROUNDS = this.constants.activeDelegates * 2;
		if (Math.abs(receivedBlock.height - lastBlock.height) > TWO_ROUNDS) {
			return null;
		}

		const blockRound = this.slots.calcRound(receivedBlock.height);
		const delegateList = await this.dpos.getRoundDelegates(blockRound);
		if (delegateList.includes(receivedBlock.generatorPublicKey)) {
			return this.fastChainSwitchingMechanism;
		}

		return null;
	}

	/**
	 * Return the last block from storage
	 *
	 * @return {Promise<*>}
	 * @private
	 */
	async _lastBlock() {
		return this.storage.entities.Block.getOne(
			{},
			{ limit: 1, sort: 'height:desc' }
		);
	}
}

/**
 * Perform all checks outlined in Step 1 of the section "Processing Blocks" except for checking height, parentBlockID and delegate slot (block B may be in the future and assume different delegates that are not active in the round of block A). If any check fails, the peer that sent block B is banned and the node aborts the process of moving to a different chain.
 *
 * https://github.com/LiskHQ/lips/blob/master/proposals/lip-0014.md#moving-to-a-different-chain
 *
 * @param lastBlock
 * @param receivedBlock
 */
const verifyBlockBeforeChainSync = (lastBlock, receivedBlock) => {
	let result = { verified: false, errors: [] };

	result = verifySignature(receivedBlock, result);
	result = verifyVersion(receivedBlock, this.exceptions, result);
	result = verifyReward(
		this.blockReward,
		receivedBlock,
		this.exceptions,
		result
	);
	result = verifyId(receivedBlock, result);
	result = verifyPayload(
		receivedBlock,
		this.constants.maxTransactionsPerBlock,
		this.constants.maxPayloadLength,
		result
	);

	result = verifyForkOne(this.roundsModule, receivedBlock, lastBlock, result);
	result = verifyBlockSlot(this.slots, receivedBlock, lastBlock, result);

	result.verified = result.errors.length === 0;
	result.errors.reverse();

	return result;
};

const exportedInterface = {
	Synchronizer,
	verifyBlockBeforeChainSync,
};

module.exports = exportedInterface;
