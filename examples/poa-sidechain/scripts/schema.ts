import { NUM_BYTES_ADDRESS } from 'lisk-framework/dist-node/modules/poa/constants';

const validator = {
	type: 'object',
	required: ['address', 'weight'],
	properties: {
		address: {
			dataType: 'bytes',
			minLength: NUM_BYTES_ADDRESS,
			maxLength: NUM_BYTES_ADDRESS,
			fieldNumber: 1,
		},
		weight: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
	},
};

export const updateAuthorityWithoutSigSchema = {
	$id: '/poa/command/updateAuthority',
	type: 'object',
	required: ['newValidators', 'threshold', 'validatorsUpdateNonce'],
	properties: {
		newValidators: {
			type: 'array',
			fieldNumber: 1,
			items: validator,
		},
		threshold: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		validatorsUpdateNonce: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
	},
};
