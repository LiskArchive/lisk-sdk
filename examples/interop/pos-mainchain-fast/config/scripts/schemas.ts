import {
	CHAIN_ID_LENGTH,
	MIN_CHAIN_NAME_LENGTH,
	MAX_CHAIN_NAME_LENGTH,
	BLS_PUBLIC_KEY_LENGTH,
	MAX_NUM_VALIDATORS,
	NUMBER_ACTIVE_VALIDATORS_MAINCHAIN,
	BLS_SIGNATURE_LENGTH,
} from 'lisk-framework';

export const sidechainRegParams = {
	$id: '/modules/interoperability/mainchain/sidechainRegistration',
	type: 'object',
	required: ['chainID', 'name', 'sidechainValidators', 'sidechainCertificateThreshold'],
	properties: {
		chainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		name: {
			dataType: 'string',
			fieldNumber: 2,
			minLength: MIN_CHAIN_NAME_LENGTH,
			maxLength: MAX_CHAIN_NAME_LENGTH,
		},
		sidechainValidators: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				required: ['blsKey', 'bftWeight'],
				properties: {
					blsKey: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: BLS_PUBLIC_KEY_LENGTH,
						maxLength: BLS_PUBLIC_KEY_LENGTH,
					},
					bftWeight: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
			minItems: 1,
			maxItems: MAX_NUM_VALIDATORS,
		},
		sidechainCertificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
	},
};

export const mainchainRegParams = {
	$id: '/modules/interoperability/sidechain/mainchainRegistration',
	type: 'object',
	required: [
		'ownChainID',
		'ownName',
		'mainchainValidators',
		'mainchainCertificateThreshold',
		'signature',
		'aggregationBits',
	],
	properties: {
		ownChainID: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: CHAIN_ID_LENGTH,
			maxLength: CHAIN_ID_LENGTH,
		},
		ownName: {
			dataType: 'string',
			fieldNumber: 2,
			minLength: MIN_CHAIN_NAME_LENGTH,
			maxLength: MAX_CHAIN_NAME_LENGTH,
		},
		mainchainValidators: {
			type: 'array',
			fieldNumber: 3,
			items: {
				type: 'object',
				required: ['blsKey', 'bftWeight'],
				properties: {
					blsKey: {
						dataType: 'bytes',
						fieldNumber: 1,
						minLength: BLS_PUBLIC_KEY_LENGTH,
						maxLength: BLS_PUBLIC_KEY_LENGTH,
					},
					bftWeight: {
						dataType: 'uint64',
						fieldNumber: 2,
					},
				},
			},
			minItems: 1,
			maxItems: NUMBER_ACTIVE_VALIDATORS_MAINCHAIN,
		},
		mainchainCertificateThreshold: {
			dataType: 'uint64',
			fieldNumber: 4,
		},
		signature: {
			dataType: 'bytes',
			fieldNumber: 5,
			minItems: BLS_SIGNATURE_LENGTH,
			maxItems: BLS_SIGNATURE_LENGTH,
		},
		aggregationBits: {
			dataType: 'bytes',
			fieldNumber: 6,
		},
	},
};
