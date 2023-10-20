/**
 * Parameters of the cross-chain token transfer command
 */
export const crossChainReactParamsSchema = {
	/** The unique identifier of the schema. */
	$id: '/lisk/ccReactParams',
	type: 'object',
	/** The required parameters for the command. */
	required: [
		'reactionType',
		'helloMessageID',
		'receivingChainID',
		'data',
		'messageFee',
		'messageFeeTokenID',
	],
	/** A list describing the available parameters for the command. */
	properties: {
		reactionType: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		/**
		 * ID of the message.
		 */
		helloMessageID: {
			dataType: 'string',
			fieldNumber: 2,
		},
		/**
		 * The chain ID of the receiving chain.
		 *
		 * `maxLength` and `minLength` are equal to 4.
		 */
		receivingChainID: {
			dataType: 'bytes',
			fieldNumber: 3,
			minLength: 4,
			maxLength: 4,
		},
		/** Optional field for data / messages. */
		data: {
			dataType: 'string',
			fieldNumber: 4,
			minLength: 0,
			maxLength: 64,
		},
		messageFee: {
			dataType: 'uint64',
			fieldNumber: 5,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			fieldNumber: 6,
			minLength: 8,
			maxLength: 8,
		},
	},
};

export const crossChainReactMessageSchema = {
	/** The unique identifier of the schema. */
	$id: '/lisk/ccReactMessage',
	type: 'object',
	/** The required parameters for the command. */
	required: ['reactionType', 'helloMessageID', 'data'],
	/** A list describing the available parameters for the command. */
	properties: {
		reactionType: {
			dataType: 'uint32',
			fieldNumber: 1,
		},
		/**
		 * ID of the message.
		 */
		helloMessageID: {
			dataType: 'string',
			fieldNumber: 2,
		},
		/** Optional field for data / messages. */
		data: {
			dataType: 'string',
			fieldNumber: 3,
			minLength: 0,
			maxLength: 64,
		},
	},
};

export interface CCReactMessageParams {
	reactionType: number;
	helloMessageID: string;
	data: string;
}
