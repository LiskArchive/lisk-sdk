export interface CreateHelloParams {
	message: string;
}

export const createHelloSchema = {
	$id: 'hello/createHello-params',
	title: 'CreateHelloCommand transaction parameter for the Hello module',
	type: 'object',
	required: ['message'],
	properties: {
		message: {
			dataType: 'string',
			fieldNumber: 1,
			minLength: 3,
			maxLength: 256,
		},
	},
};

export const configSchema = {
	$id: '/hello/config',
	type: 'object',
	properties: {
		maxMessageLength: {
			type: 'integer',
			format: 'uint32',
		},
		minMessageLength: {
			type: 'integer',
			format: 'uint32',
		},
		blacklist: {
			type: 'array',
			items: {
				type: 'string',
				minLength: 1,
				maxLength: 40,
			},
		},
	},
	required: ['maxMessageLength', 'minMessageLength', 'blacklist'],
};

export const getHelloCounterResponseSchema = {
	$id: 'modules/hello/endpoint/getHelloCounter',
	type: 'object',
	required: ['counter'],
	properties: {
		counter: {
			type: 'number',
			format: 'uint32',
		},
	},
};

export const getHelloResponseSchema = {
	$id: 'modules/hello/endpoint/getHello',
	type: 'object',
	required: ['message'],
	properties: {
		message: {
			type: 'string',
			format: 'utf8',
		},
	},
};

export const getHelloRequestSchema = {
	$id: 'modules/hello/endpoint/getHelloRequest',
	type: 'object',
	required: ['address'],
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
};

/**
 * Parameters of the cross-chain token transfer command
 */
export const crossChainReactParamsSchema = {
	/** The unique identifier of the schema. */
	$id: '/lisk/ccReactParams',
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
			dataType: 'bytes',
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
	helloMessageID: Buffer;
	receivingChainID: Buffer;
	senderAddress: Buffer;
	message: string;
}
