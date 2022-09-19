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

const peerInfo = {
	ipAddress: '1.1.1.1',
	wsPort: 1111,
	chainID: '10000000',
	networkVersion: '2.0',
	nonce: 'iNIgD0Mb3s/RMaXbs',
	os: 'darwin',
	height: 123,
};
const peerInfoSchema = {
	$id: '/peerInfo',
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
		chainID: {
			dataType: 'string',
			fieldNumber: 3,
		},
		networkVersion: {
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
};

const peerInfoWithOptionalProps = {
	ipAddress: '1.1.1.1',
	wsPort: 1111,
	os: 'darwin',
};

const objectEncoded = PeerInfo.encode(peerInfo).finish();
const objectOptionalPropEncoded = PeerInfo.encode(peerInfoWithOptionalProps).finish();

module.exports = {
	validPeerInfoEncodingsTestCases: [
		{
			description: 'Encoding of peer info sample',
			input: { object: peerInfo, schema: peerInfoSchema },
			output: { value: objectEncoded },
		},
		{
			description: 'Encoding of peer info sample with optional property',
			input: { object: peerInfoWithOptionalProps, schema: peerInfoSchema },
			output: { value: objectOptionalPropEncoded },
		},
	],

	validPeerInfoDecodingsTestCases: [
		{
			description: 'Decoding of peer info sample',
			input: { value: objectEncoded, schema: peerInfoSchema },
			output: { object: peerInfo },
		},
	],
};
