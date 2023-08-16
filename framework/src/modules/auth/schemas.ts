/*
 * Copyright © 2021 Lisk Foundation
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
 */

import {
	ADDRESS_LENGTH,
	ED25519_PUBLIC_KEY_LENGTH,
	ED25519_SIGNATURE_LENGTH,
	MAX_NUMBER_OF_SIGNATURES,
} from './constants';

export const registerMultisignatureParamsSchema = {
	$id: '/auth/command/regMultisig',
	type: 'object',
	properties: {
		numberOfSignatures: {
			dataType: 'uint32',
			fieldNumber: 1,
			minimum: 1,
			maximum: 64,
		},
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			fieldNumber: 2,
			minItems: 0,
			maxItems: 64,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			fieldNumber: 3,
			minItems: 0,
			maxItems: 64,
		},
		signatures: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_SIGNATURE_LENGTH,
				maxLength: ED25519_SIGNATURE_LENGTH,
			},
			fieldNumber: 4,
		},
	},
	required: ['numberOfSignatures', 'mandatoryKeys', 'optionalKeys', 'signatures'],
};

export const sortMultisignatureGroupRequestSchema = {
	$id: '/auth/command/sortMultisig',
	required: ['mandatory', 'optional'],
	type: 'object',
	properties: {
		mandatory: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					publicKey: {
						type: 'string',
						minLength: ED25519_PUBLIC_KEY_LENGTH * 2,
						maxLength: ED25519_PUBLIC_KEY_LENGTH * 2,
						fieldNumber: 1,
					},
					signature: {
						type: 'string',
						minLength: ED25519_SIGNATURE_LENGTH * 2,
						maxLength: ED25519_SIGNATURE_LENGTH * 2,
						fieldNumber: 2,
					},
				},
			},
			minItems: 1,
			maxItems: MAX_NUMBER_OF_SIGNATURES,
		},
		optional: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					publicKey: {
						type: 'string',
						minLength: ED25519_PUBLIC_KEY_LENGTH * 2,
						maxLength: ED25519_PUBLIC_KEY_LENGTH * 2,
						fieldNumber: 3,
					},
					signature: {
						type: 'string',
						minLength: 0,
						maxLength: ED25519_SIGNATURE_LENGTH * 2,
						fieldNumber: 4,
					},
				},
			},
			minItems: 0,
			maxItems: MAX_NUMBER_OF_SIGNATURES,
		},
	},
};

export const multisigRegMsgSchema = {
	$id: '/auth/command/regMultisigMsg',
	type: 'object',
	required: ['address', 'nonce', 'numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
	properties: {
		address: {
			dataType: 'bytes',
			fieldNumber: 1,
			minLength: ADDRESS_LENGTH,
			maxLength: ADDRESS_LENGTH,
		},
		nonce: {
			dataType: 'uint64',
			fieldNumber: 2,
		},
		numberOfSignatures: {
			dataType: 'uint32',
			fieldNumber: 3,
		},
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			fieldNumber: 4,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			fieldNumber: 5,
		},
	},
};

export const configSchema = {
	$id: '/auth/config',
	type: 'object',
	properties: {},
};

export const genesisAuthStoreSchema = {
	$id: '/auth/module/genesis',
	type: 'object',
	required: ['authDataSubstore'],
	properties: {
		authDataSubstore: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['address', 'authAccount'],
				properties: {
					address: {
						dataType: 'bytes',
						fieldNumber: 1,
					},
					authAccount: {
						type: 'object',
						fieldNumber: 2,
						required: ['nonce', 'numberOfSignatures', 'mandatoryKeys', 'optionalKeys'],
						properties: {
							nonce: {
								dataType: 'uint64',
								fieldNumber: 1,
							},
							numberOfSignatures: {
								dataType: 'uint32',
								fieldNumber: 2,
							},
							mandatoryKeys: {
								type: 'array',
								fieldNumber: 3,
								items: {
									dataType: 'bytes',
									minLength: ED25519_PUBLIC_KEY_LENGTH,
									maxLength: ED25519_PUBLIC_KEY_LENGTH,
								},
							},
							optionalKeys: {
								type: 'array',
								fieldNumber: 4,
								items: {
									dataType: 'bytes',
									minLength: ED25519_PUBLIC_KEY_LENGTH,
									maxLength: ED25519_PUBLIC_KEY_LENGTH,
								},
							},
						},
					},
				},
			},
		},
	},
};

export const addressRequestSchema = {
	$id: '/auth/addressRequest',
	type: 'object',
	properties: {
		address: {
			type: 'string',
			format: 'lisk32',
		},
	},
	required: ['address'],
};

export const transactionRequestSchema = {
	$id: '/auth/transactionRequest',
	type: 'object',
	properties: {
		transaction: {
			type: 'string',
			format: 'hex',
		},
	},
	required: ['transaction'],
};

export const verifyResultSchema = {
	$id: '/auth/verifyResult',
	type: 'object',
	properties: {
		verified: {
			type: 'boolean',
		},
	},
	required: ['verified'],
};

export const sortMultisignatureGroupResponseSchema = {
	$id: '/auth/sortMultisignatureGroupResponse',
	type: 'object',
	properties: {
		mandatoryKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			fieldNumber: 1,
			minItems: 0,
			maxItems: 64,
		},
		optionalKeys: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_PUBLIC_KEY_LENGTH,
				maxLength: ED25519_PUBLIC_KEY_LENGTH,
			},
			fieldNumber: 2,
			minItems: 0,
			maxItems: 64,
		},
		signatures: {
			type: 'array',
			items: {
				dataType: 'bytes',
				minLength: ED25519_SIGNATURE_LENGTH,
				maxLength: ED25519_SIGNATURE_LENGTH,
			},
			fieldNumber: 3,
		},
	},
	required: ['mandatoryKeys', 'optionalKeys', 'signatures'],
};

export const multiSigRegMsgTagSchema = {
	$id: '/auth/mutliSignatureRegistrationSignatureMessageTagResponse',
	type: 'object',
	properties: {
		tag: {
			type: 'string',
		},
	},
	required: ['tag'],
};
