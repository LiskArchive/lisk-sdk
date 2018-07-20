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
 *
 */

const baseTransaction = {
	type: 'object',
	required: [
		'id',
		'type',
		'amount',
		'fee',
		'senderPublicKey',
		'recipientId',
		'timestamp',
		'asset',
		'signature',
	],
	properties: {
		id: {
			type: 'string',
			format: 'number',
			minLength: 1,
			maxLength: 20,
		},
		amount: {
			type: 'string',
			format: 'number',
		},
		fee: {
			type: 'string',
			format: 'number',
		},
		type: {
			type: 'integer',
			minimum: 0,
			maximum: 7,
		},
		timestamp: {
			type: 'integer',
		},
		senderId: {
			type: 'string',
			format: 'address',
		},
		senderPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		senderSecondPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		recipientId: {
			type: 'string',
			format: 'address',
		},
		recipientPublicKey: {
			type: 'string',
			format: 'publicKey',
		},
		signature: {
			type: 'string',
			format: 'signature',
		},
		signSignature: {
			type: 'string',
			format: 'signature',
		},
		signatures: {
			type: 'array',
			uniqueItems: true,
			items: {
				type: 'string',
				format: 'signature',
			},
		},
		asset: {
			type: 'object',
		},
	},
};

export const transferTransaction = () => {
	const schema = Object.assign({}, baseTransaction);
	schema.properties.amount = {
		type: 'string',
		minimum: 1,
	};
	schema.properties.asset = {
		type: 'object',
		properties: {
			data: {
				type: 'string',
				maximum: 64,
			},
		},
	};
	return schema;
};

export const signatureTransaction = () => {
	const schema = Object.assign({}, baseTransaction);
	schema.properties.asset = {
		type: 'object',
		required: ['signature'],
		properties: {
			signature: {
				type: 'object',
				properties: {
					publicKey: {
						type: 'string',
						format: 'publicKey',
					},
				},
			},
		},
	};
	return schema;
};

export const delegateTransaction = () => {
	const schema = Object.assign({}, baseTransaction);
	schema.properties.asset = {
		type: 'object',
		required: ['signature'],
		properties: {
			signature: {
				type: 'object',
				required: ['username'],
				properties: {
					username: {
						type: 'string',
						maximum: 20,
					},
				},
			},
		},
	};
	return schema;
};

export const voteTransaction = () => {
	const schema = Object.assign({}, baseTransaction);
	schema.properties.asset = {
		type: 'object',
		required: ['votes'],
		properties: {
			votes: {
				type: 'array',
				uniqueItems: true,
				minItems: 1,
				maxItems: 33,
				items: {
					type: 'string',
					format: 'actionPublicKey',
				},
			},
		},
	};
	return schema;
};

export const multiTransaction = () => {
	const schema = Object.assign({}, baseTransaction);
	schema.properties.asset = {
		type: 'object',
		required: ['min', 'lifetime', 'keysgroup'],
		properties: {
			multisignature: {
				type: 'object',
				properties: {
					min: {
						type: 'integer',
						minimum: 1,
					},
					lifetime: {
						type: 'integer',
						minimum: 1,
					},
					keysgroup: {
						type: 'array',
						uniqueItems: true,
						minItems: 1,
						maxItems: 16,
						items: {
							type: 'string',
							format: 'actionPublicKey',
						},
					},
				},
			},
		},
	};
	return schema;
};

export const dappTransaction = () => {
	const schema = Object.assign({}, baseTransaction);
	schema.properties.asset = {
		type: 'object',
		required: ['name'],
		properties: {
			dapp: {
				type: 'object',
				properties: {
					icon: {
						type: 'string',
						format: 'url',
					},
					category: {
						type: 'number',
					},
					type: {
						type: 'number',
					},
					link: {
						type: 'string',
						format: 'url',
					},
					tags: {
						type: 'string',
					},
					description: {
						type: 'string',
					},
					name: {
						type: 'string',
					},
				},
			},
		},
	};
	return schema;
};
