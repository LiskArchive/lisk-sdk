module.exports = {
	Signature: {
		id: 'Signature',
		type: 'object',
		required: ['transactionId', 'publicKey', 'signature'],
		properties: {
			transactionId: {
				type: 'string',
				format: 'id',
				example: '222675625422353767',
				minLength: 1,
				maxLength: 20,
				description:
					'Unique identifier of the multisignature transaction to sign.',
			},
			publicKey: {
				type: 'string',
				format: 'publicKey',
				example:
					'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
				description:
					'Public key of the account that intends to sign the multisignature transaction.',
			},
			signature: {
				type: 'string',
				format: 'signature',
				example:
					'2821d93a742c4edf5fd960efad41a4def7bf0fd0f7c09869aed524f6f52bf9c97a617095e2c712bd28b4279078a29509b339ac55187854006591aa759784c205',
				description:
					'Signature to sign the transaction.\nThe signature can be generated locally, either by using Lisk Commander or with Lisk Elements.\n',
			},
		},
	},
	CommonBlock: {
		id: 'CommonBlock',
		type: 'object',
		required: ['id', 'height', 'previousBlock'],
		properties: {
			id: {
				type: 'string',
				format: 'id',
				minLength: 1,
				maxLength: 20,
				example: '6258354802676165798',
			},
			height: {
				type: 'integer',
				example: 123,
				minimum: 1,
			},
			previousBlock: {
				type: 'string',
				format: 'id',
				example: '15918760246746894806',
			},
		},
	},
	Peer: {
		id: 'Peer',
		type: 'object',
		required: ['wsPort', 'state'],
		properties: {
			ip: {
				type: 'string',
				example: '127.0.0.1',
				format: 'ip',
				description: 'IPv4 address of the peer node.',
			},
			httpPort: {
				type: 'integer',
				example: 8000,
				minimum: 1,
				maximum: 65535,
				description:
					'The port the peer node uses for HTTP requests, e.g. API calls.',
			},
			wsPort: {
				type: 'integer',
				example: 8001,
				minimum: 1,
				maximum: 65535,
				description:
					'The port the peer node uses for Websocket Connections, e.g. P2P broadcasts.',
			},
			os: {
				type: 'string',
				example: 'debian',
				description: 'The Operating System, that the peer node runs on.',
			},
			version: {
				type: 'string',
				example: 'v0.8.0',
				format: 'version',
				description: 'The version of Lisk Core that the peer node runs on.',
			},
			protocolVersion: {
				type: 'string',
				example: 1,
				format: 'protocolVersion',
				description:
					'The protocol version of Lisk Core that the peer node runs on.',
			},
			state: {
				type: 'integer',
				example: 2,
				minimum: 0,
				maximum: 2,
				description:
					'The state of the Peer.\nAvailable values: Connected, Disconnected, Banned\n',
			},
			height: {
				type: 'integer',
				example: 123,
				description:
					'Network height on the peer node.\nRepresents the current number of blocks in the chain on the peer node.\n',
			},
			broadhash: {
				type: 'string',
				example:
					'258974416d58533227c6a3da1b6333f0541b06c65b41e45cf31926847a3db1ea',
				format: 'hex',
				description:
					'Broadhash on the peer node.\nBroadhash is established as an aggregated rolling hash of the past five blocks present in the database.\n',
			},
			nonce: {
				type: 'string',
				example: 'sYHEDBKcScaAAAYg',
				minLength: 1,
				description: 'Unique Identifier for the peer.\nRandom string.\n',
			},
		},
	},
	PeersList: {
		id: 'PeersList',
		type: 'object',
		required: ['peers'],
		properties: {
			peers: {
				type: 'array',
				items: {
					type: 'object',
					required: ['wsPort', 'state'],
					properties: {
						ip: {
							type: 'string',
							example: '127.0.0.1',
							format: 'ip',
							description: 'IPv4 address of the peer node.',
						},
						httpPort: {
							type: 'integer',
							example: 8000,
							minimum: 1,
							maximum: 65535,
							description:
								'The port the peer node uses for HTTP requests, e.g. API calls.',
						},
						wsPort: {
							type: 'integer',
							example: 8001,
							minimum: 1,
							maximum: 65535,
							description:
								'The port the peer node uses for Websocket Connections, e.g. P2P broadcasts.',
						},
						os: {
							type: 'string',
							example: 'debian',
							description: 'The Operating System, that the peer node runs on.',
						},
						version: {
							type: 'string',
							example: 'v0.8.0',
							format: 'version',
							description:
								'The version of Lisk Core that the peer node runs on.',
						},
						protocolVersion: {
							type: 'string',
							example: 1,
							format: 'protocolVersion',
							description:
								'The protocol version of Lisk Core that the peer node runs on.',
						},
						state: {
							type: 'integer',
							example: 2,
							minimum: 0,
							maximum: 2,
							description:
								'The state of the Peer.\nAvailable values: Connected, Disconnected, Banned\n',
						},
						height: {
							type: 'integer',
							example: 123,
							description:
								'Network height on the peer node.\nRepresents the current number of blocks in the chain on the peer node.\n',
						},
						broadhash: {
							type: 'string',
							example:
								'258974416d58533227c6a3da1b6333f0541b06c65b41e45cf31926847a3db1ea',
							format: 'hex',
							description:
								'Broadhash on the peer node.\nBroadhash is established as an aggregated rolling hash of the past five blocks present in the database.\n',
						},
						nonce: {
							type: 'string',
							example: 'sYHEDBKcScaAAAYg',
							minLength: 1,
							description: 'Unique Identifier for the peer.\nRandom string.\n',
						},
					},
				},
			},
		},
	},
	WSPeerHeaders: {
		id: 'WSPeerHeaders',
		type: 'object',
		required: ['httpPort', 'wsPort', 'version', 'nethash', 'nonce'],
		properties: {
			httpPort: {
				type: 'integer',
				example: 8000,
				minimum: 1,
				maximum: 65535,
			},
			wsPort: {
				type: 'integer',
				example: 8001,
				minimum: 1,
				maximum: 65535,
			},
			os: {
				type: 'string',
				example: 'debian',
			},
			version: {
				type: 'string',
				example: 'v0.8.0',
				format: 'version',
			},
			protocolVersion: {
				type: 'string',
				example: 1,
				format: 'protocolVersion',
			},
			height: {
				type: 'integer',
				example: 123,
			},
			nethash: {
				type: 'string',
				maxLength: 64,
			},
			broadhash: {
				type: 'string',
				example:
					'258974416d58533227c6a3da1b6333f0541b06c65b41e45cf31926847a3db1ea',
				format: 'hex',
			},
			nonce: {
				type: 'string',
				example: 'sYHEDBKcScaAAAYg',
				minLength: 16,
				maxLength: 16,
			},
		},
	},
	WSPeerUpdateRequest: {
		id: 'WSPeerUpdateRequest',
		type: 'object',
		required: ['data', 'socketId'],
		properties: {
			data: {
				type: 'object',
				required: ['nonce'],
				properties: {
					nethash: {
						type: 'string',
						maxLength: 64,
					},
					broadhash: {
						type: 'string',
						format: 'hex',
					},
					height: {
						type: 'integer',
						minimum: 1,
					},
					nonce: {
						type: 'string',
						minLength: 16,
						maxLength: 16,
					},
				},
			},
			socketId: {
				type: 'string',
			},
		},
	},
	WSSignaturesList: {
		id: 'WSSignaturesList',
		type: 'object',
		required: ['nonce', 'signatures'],
		properties: {
			nonce: {
				type: 'string',
				example: 'sYHEDBKcScaAAAYg',
				minLength: 16,
				maxLength: 16,
			},
			signatures: {
				type: 'array',
				items: {
					type: 'object',
				},
				minItems: 1,
				maxItems: 25,
			},
		},
	},
	WSBlocksList: {
		id: 'WSBlocksList',
		type: 'array',
		items: {
			type: 'object',
		},
	},
	WSBlocksCommonRequest: {
		id: 'WSBlocksCommonRequest',
		type: 'object',
		required: ['ids'],
		properties: {
			ids: {
				type: 'string',
				format: 'csv',
			},
		},
	},
	WSTransactionsRequest: {
		id: 'WSTransactionsRequest',
		type: 'object',
		required: ['nonce', 'transactions'],
		properties: {
			nonce: {
				type: 'string',
				example: 'sYHEDBKcScaAAAYg',
				minLength: 16,
				maxLength: 16,
			},
			transactions: {
				type: 'array',
				items: {
					type: 'object',
				},
				minItems: 1,
				maxItems: 25,
			},
		},
	},
	WSAccessObject: {
		id: 'WSAccessObject',
		type: 'object',
		required: ['peer', 'authKey', 'updateType'],
		properties: {
			peer: {
				type: 'object',
				required: ['wsPort', 'state'],
				properties: {
					ip: {
						type: 'string',
						example: '127.0.0.1',
						format: 'ip',
						description: 'IPv4 address of the peer node.',
					},
					httpPort: {
						type: 'integer',
						example: 8000,
						minimum: 1,
						maximum: 65535,
						description:
							'The port the peer node uses for HTTP requests, e.g. API calls.',
					},
					wsPort: {
						type: 'integer',
						example: 8001,
						minimum: 1,
						maximum: 65535,
						description:
							'The port the peer node uses for Websocket Connections, e.g. P2P broadcasts.',
					},
					os: {
						type: 'string',
						example: 'debian',
						description: 'The Operating System, that the peer node runs on.',
					},
					version: {
						type: 'string',
						example: 'v0.8.0',
						format: 'version',
						description: 'The version of Lisk Core that the peer node runs on.',
					},
					protocolVersion: {
						type: 'string',
						example: 1,
						format: 'protocolVersion',
						description:
							'The protocol version of Lisk Core that the peer node runs on.',
					},
					state: {
						type: 'integer',
						example: 2,
						minimum: 0,
						maximum: 2,
						description:
							'The state of the Peer.\nAvailable values: Connected, Disconnected, Banned\n',
					},
					height: {
						type: 'integer',
						example: 123,
						description:
							'Network height on the peer node.\nRepresents the current number of blocks in the chain on the peer node.\n',
					},
					broadhash: {
						type: 'string',
						example:
							'258974416d58533227c6a3da1b6333f0541b06c65b41e45cf31926847a3db1ea',
						format: 'hex',
						description:
							'Broadhash on the peer node.\nBroadhash is established as an aggregated rolling hash of the past five blocks present in the database.\n',
					},
					nonce: {
						type: 'string',
						example: 'sYHEDBKcScaAAAYg',
						minLength: 1,
						description: 'Unique Identifier for the peer.\nRandom string.\n',
					},
				},
			},
			authKey: {
				type: 'string',
			},
			updateType: {
				type: 'integer',
				minimum: 0,
				maximum: 1,
			},
		},
	},
	WSTransactionsResponse: {
		id: 'WSTransactionsResponse',
		type: 'object',
		required: ['transactions'],
		properties: {
			transactions: {
				type: 'array',
				uniqueItems: true,
				maxItems: 100,
				items: {
					type: 'object',
				},
			},
		},
	},
	WSSignaturesResponse: {
		id: 'WSSignaturesResponse',
		required: ['signatures'],
		properties: {
			signatures: {
				type: 'array',
				uniqueItems: true,
				maxItems: 100,
				items: {
					type: 'object',
				},
			},
		},
	},
	WSBlocksBroadcast: {
		id: 'WSBlocksBroadcast',
		type: 'object',
		required: ['block', 'nonce'],
		properties: {
			nonce: {
				type: 'string',
				example: 'sYHEDBKcScaAAAYg',
				minLength: 16,
				maxLength: 16,
			},
			block: {
				type: 'object',
				required: ['id', 'height', 'timestamp', 'generatorPublicKey'],
				properties: {
					id: {
						type: 'string',
						format: 'id',
						minLength: 1,
						maxLength: 20,
						example: '6258354802676165798',
					},
					version: {
						type: 'integer',
						example: 0,
						minimum: 0,
					},
					height: {
						type: 'integer',
						example: 123,
						minimum: 1,
					},
					timestamp: {
						description: 'Unix Timestamp',
						type: 'integer',
						example: 28227090,
					},
					generatorAddress: {
						type: 'string',
						format: 'address',
						example: '12668885769632475474L',
					},
					generatorPublicKey: {
						type: 'string',
						format: 'publicKey',
						example:
							'968ba2fa993ea9dc27ed740da0daf49eddd740dbd7cb1cb4fc5db3a20baf341b',
					},
					payloadLength: {
						type: 'integer',
						example: 117,
						minimum: 0,
					},
					payloadHash: {
						type: 'string',
						format: 'hex',
						example:
							'4e4d91be041e09a2e54bb7dd38f1f2a02ee7432ec9f169ba63cd1f193a733dd2',
					},
					blockSignature: {
						type: 'string',
						format: 'signature',
						example:
							'a3733254aad600fa787d6223002278c3400be5e8ed4763ae27f9a15b80e20c22ac9259dc926f4f4cabdf0e4f8cec49308fa8296d71c288f56b9d1e11dfe81e07',
					},
					confirmations: {
						type: 'integer',
						example: 200,
					},
					previousBlockId: {
						type: 'string',
						format: 'id',
						example: '15918760246746894806',
					},
				},
			},
		},
	},
};
