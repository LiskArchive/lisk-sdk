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

'use strict';

const BaseGenerator = require('../base_generator');
const protobuf = require('protobufjs');


const prepareProtobuffers = () => protobuf.loadSync('./proto_files/numbers.proto');
const { Number32, Number64 } = prepareProtobuffers();


const generateValidNumberEncodings = () => {
	const message = {
		number: 10,
	}

	const numberEncoded32 = Number32.encode(message).finish();
	const numberEncoded64 = Number64.encode(message).finish();

	return {
		input: {
			message,
		},
		output: {
			numberEncoded32: numberEncoded32.toString('hex'),
			numberEncoded64: numberEncoded64.toString('hex'),
		}
	}


}


const validNumberEncodingsSuite = () => ({
	title: 'Valid number encodings',
	summary: 'Examples of encoding numbers as required by lisk-codec',
	config: 'devnet',
	runner: 'lisk_codec',
	handler: 'validNumberEncodings',
	testCases: generateValidNumberEncodings(),
});


module.exports = BaseGenerator.runGenerator(
	'lisk_codec',
	[
		validNumberEncodingsSuite,
	],
);
