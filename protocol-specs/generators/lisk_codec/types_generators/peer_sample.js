/*
 * Copyright © 2020 Lisk Foundation
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

const protobuf = require('protobufjs');

const prepareProtobuffersObjects = () =>
	protobuf.loadSync('./generators/lisk_codec/proto_files/peer_sample.proto');

const { PeerInfo } = prepareProtobuffersObjects();

const generateValidPeerInfoEncodings = () => {
	const input = {
		object: {
			object: {
				ipAddress: '1.1.1.1',
				wsPort: 1111,
				networkId: '+P5+zD4p9Y852KU4+aNbgLS2q5Z08DAOJeM/9BJ0rjI=',
				protocolVersion: '2.0',
				nonce: 'iNIgD0Mb3s/RMaXbs',
				os: 'darwin',
				height: 123,
			},
			schema: {
				$id: 'peerInfo',
				type: 'object',
				properties: {
					ipAddress: {
						dataType: 'string',
						fieldNumber: 1,
					},
					wsPort: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					networkId: {
						dataType: 'string',
						fieldNumber: 3,
					},
					protocolVersion: {
						dataType: 'string',
						fieldNumber: 4,
					},
					nonce: {
						dataType: 'string',
						fieldNumber: 5,
					},
					os: {
						dataType: 'string',
						fieldNumber: 6,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 7,
					},
				},
				required: ['ipAddress', 'wsPort'],
			},
		},
		objectOptionalProp: {
			object: {
				ipAddress: '1.1.1.1',
				wsPort: 1111,
				os: 'darwin',
			},
			schema: {
				$id: 'peerInfo',
				type: 'object',
				properties: {
					ipAddress: {
						dataType: 'string',
						fieldNumber: 1,
					},
					wsPort: {
						dataType: 'uint32',
						fieldNumber: 2,
					},
					networkId: {
						dataType: 'string',
						fieldNumber: 3,
					},
					protocolVersion: {
						dataType: 'string',
						fieldNumber: 4,
					},
					nonce: {
						dataType: 'string',
						fieldNumber: 5,
					},
					os: {
						dataType: 'string',
						fieldNumber: 6,
					},
					height: {
						dataType: 'uint32',
						fieldNumber: 7,
					},
				},
				required: ['ipAddress', 'wsPort'],
			},
		},
	};

	const objectEncoded = PeerInfo.encode(input.object.object).finish();
	const objectOptionalPropEncoded = PeerInfo.encode(input.objectOptionalProp.object).finish();

	return [
		{
			description: 'Encoding of peer info sample',
			input: input.object,
			output: { value: objectEncoded.toString('hex') },
		},
		{
			description: 'Encoding of peer info sample with optional property',
			input: input.objectOptionalProp,
			output: { value: objectOptionalPropEncoded.toString('hex') },
		},
	];
};

module.exports = generateValidPeerInfoEncodings;
