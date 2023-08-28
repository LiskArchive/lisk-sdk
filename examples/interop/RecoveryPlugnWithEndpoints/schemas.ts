import { ccmSchema } from 'lisk-sdk';

export const ccmsInfoSchema = {
	$id: 'msgRecoveryPlugin/ccmsFromEvents',
	type: 'object',
	properties: {
		ccms: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...ccmSchema,
			},
		},
	},
};

const HASH_LENGTH = 32;

const CHAIN_ID_LENGTH = 4;
const LOCAL_ID_LENGTH = 4;
const TOKEN_ID_LENGTH = CHAIN_ID_LENGTH + LOCAL_ID_LENGTH;

const inboxOutboxProps = {
	appendPath: {
		type: 'array',
		items: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
		},
		fieldNumber: 1,
	},
	size: {
		dataType: 'uint32',
		fieldNumber: 2,
	},
	root: {
		dataType: 'bytes',
		minLength: HASH_LENGTH,
		maxLength: HASH_LENGTH,
		fieldNumber: 3,
	},
};

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#channel-data-substore
export const channelSchema = {
	$id: '/modules/interoperability/channel',
	type: 'object',
	required: [
		'inbox',
		'outbox',
		'partnerChainOutboxRoot',
		'messageFeeTokenID',
		'minReturnFeePerByte',
	],
	properties: {
		inbox: {
			type: 'object',
			fieldNumber: 1,
			required: ['appendPath', 'size', 'root'],
			properties: inboxOutboxProps,
		},
		outbox: {
			type: 'object',
			fieldNumber: 2,
			required: ['appendPath', 'size', 'root'],
			properties: inboxOutboxProps,
		},
		partnerChainOutboxRoot: {
			dataType: 'bytes',
			minLength: HASH_LENGTH,
			maxLength: HASH_LENGTH,
			fieldNumber: 3,
		},
		messageFeeTokenID: {
			dataType: 'bytes',
			minLength: TOKEN_ID_LENGTH,
			maxLength: TOKEN_ID_LENGTH,
			fieldNumber: 4,
		},
		minReturnFeePerByte: {
			dataType: 'uint64',
			fieldNumber: 5,
		},
	},
};

export const inclusionProofsSchema = {
	$id: `scripts/recovery/inclusionProofs`,
	type: 'object',
	properties: {
		inclusionProofs: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['height', 'inclusionProof', 'stateRoot', 'storeValue', 'storeKey'],
				properties: {
					height: { dataType: 'uint32', fieldNumber: 1 },
					inclusionProof: {
						type: 'object',
						fieldNumber: 2,
						required: ['siblingHashes', 'bitmap', 'key', 'value'],
						properties: {
							siblingHashes: {
								type: 'array',
								fieldNumber: 1,
								items: {
									dataType: 'bytes',
								},
							},
							bitmap: {
								dataType: 'bytes',
								fieldNumber: 2,
							},
							key: {
								dataType: 'bytes',
								fieldNumber: 3,
							},
							value: {
								dataType: 'bytes',
								fieldNumber: 4,
							},
						},
					},
					stateRoot: { dataType: 'bytes', fieldNumber: 3 },
					storeValue: { dataType: 'bytes', fieldNumber: 4 },
					storeKey: { dataType: 'bytes', fieldNumber: 5 },
				},
			},
		},
	},
};
export const inclusionProofsWithHeightAndStateRootSchema = {
	$id: `scripts/recovery/inclusionProofs`,
	type: 'object',
	properties: {
		inclusionProofs: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					height: { dataType: 'uint32', fieldNumber: 1 },
					inclusionProof: {
						type: 'object',
						fieldNumber: 2,
						properties: {
							siblingHashes: {
								type: 'array',
								fieldNumber: 1,
								items: {
									dataType: 'bytes',
								},
							},
							bitmap: {
								dataType: 'bytes',
								fieldNumber: 2,
							},
							key: {
								dataType: 'bytes',
								fieldNumber: 3,
							},
							value: {
								dataType: 'bytes',
								fieldNumber: 4,
							},
						},
					},
					stateRoot: { dataType: 'bytes', fieldNumber: 3 },
				},
			},
		},
	},
};
