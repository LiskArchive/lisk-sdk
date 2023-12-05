const reactionType = {
	dataType: 'uint32',
	fieldNumber: 1,
};

const helloMessageID = {
	dataType: 'string',
	fieldNumber: 2,
};

const data = {
	dataType: 'string',
	fieldNumber: 3,
	minLength: 0,
	maxLength: 64,
};

// Schema for the parameters of the crossChainReact CCM
export const CCReactMessageParamsSchema = {
	// The unique identifier of the schema.
	$id: '/lisk/react/ccReactMessageParams',
	type: 'object',
	// The required parameters for the CCM.
	required: ['reactionType', 'helloMessageID', 'data'],
	// A list describing the required parameters for the CCM.
	properties: {
		reactionType,
		helloMessageID,
		data,
	},
};

// Schema for the parameters of the react crossChainReact command
export const CCReactCommandParamsSchema = {
	// The unique identifier of the schema.
	$id: '/lisk/react/ccReactCommandParams',
	type: 'object',
	// The required parameters for the command.
	required: ['reactionType', 'helloMessageID', 'receivingChainID', 'data', 'messageFee'],
	// A list describing the available parameters for the command.
	properties: {
		reactionType,
		helloMessageID,
		data,
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
