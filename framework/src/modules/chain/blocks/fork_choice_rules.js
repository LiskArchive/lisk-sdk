/**
 * Determine if Case 2 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
// eslint-disable-next-line class-methods-use-this
function isValidBlock(lastBlock, currentBlock) {
	return (
		lastBlock.height + 1 === currentBlock.height &&
		lastBlock.id === currentBlock.previousBlock
	);
}

/**
 * Determine if Case 1 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
// eslint-disable-next-line class-methods-use-this
function isIdenticalBlock(lastBlock, currentBlock) {
	return lastBlock.id === currentBlock.id;
}

/**
 * Determine if two blocks are duplicates
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
// eslint-disable-next-line class-methods-use-this
function isDuplicateBlock(lastBlock, currentBlock) {
	return (
		lastBlock.height === currentBlock.height &&
		lastBlock.heightPrevoted === currentBlock.heightPrevoted &&
		lastBlock.previousBlock === currentBlock.previousBlock
	);
}

/**
 * Determine if Case 3 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {*|boolean}
 * @private
 */
function isDoubleForging(lastBlock, currentBlock) {
	return (
		isDuplicateBlock(lastBlock, currentBlock) &&
		lastBlock.generatorPublicKey === currentBlock.generatorPublicKey
	);
}

/**
 * Determine if Case 4 fulfills
 * @param slots
 * @param lastBlock
 * @param currentBlock
 * @param lastReceivedAt
 * @param currentReceivedAt
 * @return {*|boolean}
 * @private
 */
function isTieBreak({
	slots,
	lastBlock,
	currentBlock,
	lastReceivedAt,
	currentReceivedAt,
}) {
	return (
		isDuplicateBlock(lastBlock, currentBlock) &&
		slots.getSlotNumber(lastBlock.timestamp) <
			slots.getSlotNumber(currentBlock.timestamp) &&
		!this._receivedInSlot(lastBlock, lastReceivedAt) &&
		this._receivedInSlot(currentBlock, currentReceivedAt)
	);
}

/**
 * Determine if Case 5 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 */
// eslint-disable-next-line class-methods-use-this
function isDifferentChain(lastBlock, currentBlock) {
	return (
		lastBlock.heightPrevoted < currentBlock.heightPrevoted ||
		(lastBlock.height < currentBlock.height &&
			lastBlock.heightPrevoted === currentBlock.heightPrevoted)
	);
}

module.exports = {
	isTieBreak,
	isDoubleForging,
	isDifferentChain,
	isIdenticalBlock,
	isValidBlock,
};
