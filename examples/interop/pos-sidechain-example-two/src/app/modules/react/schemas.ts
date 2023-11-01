/**
 * Parameters of the reactCrossChain CCM
 */
export interface CCReactMessageParams {
	/**
	 * A number indicating the type of the reaction.
	 */
	reactionType: number;
	/**
	 * ID of the Hello message being reacted to.
	 */
	helloMessageID: string;
	/** Optional field for data / messages. */
	data: string;
}

/**
 * Parameters of the react reactCrossChain command
 */
export interface CCReactCommandParams extends CCReactMessageParams {
	/**
	 * The chain ID of the receiving chain.
	 *
	 * `maxLength` and `minLength` are equal to 4.
	 */
	receivingChainID: Buffer;
	/**
	 * The fee for sending the CCM across chains.
	 */
	messageFee: bigint;
}

/**
 * Schema for the parameters of the reactCrossChain CCM
 */
export const CCReactMessageParamsSchema = {
	/** The unique identifier of the schema. */
	$id: '/lisk/react/ccmParams',
	type: 'object',
	/** The required parameters for the CCM. */
	required: ['reactionType', 'helloMessageID', 'data'],
	/** A list describing the required parameters for the CCM. */
	properties: {
		reactionType: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		helloMessageID: {
			dataType: 'string',
			fieldNumber: 2,
		},
		data: {
			dataType: 'string',
			fieldNumber: 3,
			minLength: 0,
			maxLength: 64,
		},
	},
};

/**
 * Schema for the parameters of the react reactCrossChain command
 */
export const CCReactCommandParamsSchema = {
	/** The unique identifier of the schema. */
	$id: '/lisk/react/ccCommandParams',
	type: 'object',
	/** The required parameters for the command. */
	required: ['reactionType', 'helloMessageID', 'receivingChainID', 'data', 'messageFee'],
	/** A list describing the available parameters for the command. */
	properties: {
		reactionType: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		helloMessageID: {
			dataType: 'string',
			fieldNumber: 2,
		},
		data: {
			dataType: 'string',
			fieldNumber: 3,
			minLength: 0,
			maxLength: 64,
		},
		receivingChainID: {
			dataType: 'bytes',
			fieldNumber: 4,
			minLength: 4,
			maxLength: 4,
		},
		messageFee: {
			dataType: 'uint64',
			fieldNumber: 5,
		},
	},
};
