/**
 * Determine if Case 2 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
// eslint-disable-next-line class-methods-use-this
const isValidBlock = (lastBlock, currentBlock) =>
	lastBlock.height + 1 === currentBlock.height &&
	lastBlock.id === currentBlock.previousBlock;

/**
 * Determine if Case 1 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
// eslint-disable-next-line class-methods-use-this
const isIdenticalBlock = (lastBlock, currentBlock) =>
	lastBlock.id === currentBlock.id;

/**
 * Determine if two blocks are duplicates
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 * @private
 */
// eslint-disable-next-line class-methods-use-this
const isDuplicateBlock = (lastBlock, currentBlock) =>
	lastBlock.height === currentBlock.height &&
	lastBlock.prevotedConfirmedUptoHeight ===
		currentBlock.prevotedConfirmedUptoHeight &&
	lastBlock.previousBlock === currentBlock.previousBlock;

/**
 * Determine if Case 3 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {*|boolean}
 * @private
 */
const isDoubleForging = (lastBlock, currentBlock) =>
	isDuplicateBlock(lastBlock, currentBlock) &&
	lastBlock.generatorPublicKey === currentBlock.generatorPublicKey;

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
const isTieBreak = ({
	slots,
	lastBlock,
	currentBlock,
	lastReceivedAt,
	currentReceivedAt,
}) =>
	isDuplicateBlock(lastBlock, currentBlock) &&
	slots.getSlotNumber(lastBlock.timestamp) <
		slots.getSlotNumber(currentBlock.timestamp) &&
	!slots.isWithinTimeslot(
		slots.getSlotNumber(lastBlock.timestamp),
		lastReceivedAt
	) &&
	slots.isWithinTimeslot(
		slots.getSlotNumber(currentBlock.timestamp),
		currentReceivedAt
	);

/**
 * Determine if Case 5 fulfills
 * @param lastBlock
 * @param currentBlock
 * @return {boolean}
 */
// eslint-disable-next-line class-methods-use-this
const isDifferentChain = (lastBlock, currentBlock) =>
	lastBlock.prevotedConfirmedUptoHeight <
		currentBlock.prevotedConfirmedUptoHeight ||
	(lastBlock.height < currentBlock.height &&
		lastBlock.prevotedConfirmedUptoHeight ===
			currentBlock.prevotedConfirmedUptoHeight);

module.exports = {
	isTieBreak,
	isDoubleForging,
	isDifferentChain,
	isIdenticalBlock,
	isValidBlock,
	isDuplicateBlock,
};
