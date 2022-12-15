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

import { chain, aggregateCommitSchema, ccmSchema } from 'lisk-sdk';

const pluginSchemaIDPrefix = '/lisk/plugins/chainConnector';

export const configSchema = {
	$id: `${pluginSchemaIDPrefix}/config`,
	type: 'object',
	properties: {
		mainchainIPCPath: {
			type: 'string',
			description: 'The IPC path to a mainchain node',
		},
		sidechainIPCPath: {
			type: 'string',
			description: 'The IPC path to a sidechain node',
		},
		ccuFrequency: {
			type: 'integer',
			description: 'Number of blocks after which a CCU should be created',
		},
	},
	required: ['mainchainIPCPath'],
	default: {
		ccmFrequency: 10,
		livenessFrequency: 86400,
	},
};

export const validatorsDataSchema = {
	$id: `${pluginSchemaIDPrefix}/validatorsData`,
	type: 'object',
	required: ['validators', 'certificateThreshold'],
	properties: {
		validators: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				required: ['blsKey', 'bftWeight'],
				properties: {
					address: { dataType: 'bytes', fieldNumber: 1 },
					blsKey: { dataType: 'bytes', fieldNumber: 2 },
					bftWeight: { dataType: 'uint64', fieldNumber: 3 },
				},
			},
		},
		certificateThreshold: { dataType: 'uint64', fieldNumber: 2 },
		validatorsHash: { dataType: 'bytes', fieldNumber: 3 },
	},
};

export const blockHeadersInfoSchema = {
	$id: `${pluginSchemaIDPrefix}/blockHeaders`,
	type: 'object',
	properties: {
		blockHeaders: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...chain.blockHeaderSchema,
			},
		},
	},
};

export const aggregateCommitsInfoSchema = {
	$id: `${pluginSchemaIDPrefix}/aggregateCommits`,
	type: 'object',
	properties: {
		aggregateCommits: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...aggregateCommitSchema,
			},
		},
	},
};

export const validatorsHashPreimageInfoSchema = {
	$id: `${pluginSchemaIDPrefix}/validatorsHashPreimage`,
	type: 'object',
	properties: {
		validatorsHashPreimage: {
			type: 'array',
			fieldNumber: 1,
			items: {
				...validatorsDataSchema,
			},
		},
	},
};

export const ccmsFromEventsSchema = {
	$id: `${pluginSchemaIDPrefix}/ccmsFromEvents`,
	type: 'object',
	properties: {
		ccmsFromEvents: {
			type: 'array',
			fieldNumber: 1,
			items: {
				type: 'object',
				properties: {
					ccms: {
						type: 'array',
						fieldNumber: 1,
						items: {
							...ccmSchema,
						},
					},
					height: { dataType: 'uint32', fieldNumber: 2 },
					inclusionProof: {
						type: 'object',
						fieldNumber: 3,
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
						},
					},
				},
			},
		},
	},
};

export declare const crossChainUpdateTransactionParams: {
	$id: string;
	type: string;
	required: string[];
	properties: {
		sendingChainID: {
			dataType: string;
			fieldNumber: number;
			minLength: number;
			maxLength: number;
		};
		certificate: {
			dataType: string;
			fieldNumber: number;
		};
		activeValidatorsUpdate: {
			type: string;
			fieldNumber: number;
			items: {
				type: string;
				required: string[];
				properties: {
					blsKey: {
						dataType: string;
						fieldNumber: number;
						minLength: number;
						maxLength: number;
					};
					bftWeight: {
						dataType: string;
						fieldNumber: number;
					};
				};
			};
		};
		certificateThreshold: {
			dataType: string;
			fieldNumber: number;
		};
		inboxUpdate: {
			type: string;
			fieldNumber: number;
			required: string[];
			properties: {
				crossChainMessages: {
					type: string;
					fieldNumber: number;
					items: {
						dataType: string;
					};
				};
				messageWitnessHashes: {
					type: string;
					fieldNumber: number;
					items: {
						dataType: string;
						minLength: number;
						maxLength: number;
					};
				};
				outboxRootWitness: {
					type: string;
					fieldNumber: number;
					required: string[];
					properties: {
						bitmap: {
							dataType: string;
							fieldNumber: number;
						};
						siblingHashes: {
							type: string;
							fieldNumber: number;
							items: {
								dataType: string;
								minLength: number;
								maxLength: number;
							};
						};
					};
				};
			};
		};
	};
};
