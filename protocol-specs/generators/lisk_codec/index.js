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


const prepareProtobuffers = () => protobuf.loadSync('./generators/lisk_codec/proto_files/numbers.proto');
const { Number32, SignedNumber32, Number64, SignedNumber64 } = prepareProtobuffers();


const generateValidNumberEncodings = () => {
	const input = {
		message32: {
			object: {
				number: 10,
			},
			schema: {
					type: 'object',
					properties: {
						number: {
							dataType: 'uint32',
							fieldNumber: 1
						}
					}
			},
		},
		messageSigned32: {
			object: {
				number: -10,
			},
			schema: {
				type: 'object',
				properties: {
					number: {
						dataType: 'sint32',
						fieldNumber: 1
					}
				}
			},
		},
		message64: {
			object: {
				number: 372036854775807,
			},
			schema: {
				type: 'object',
				properties: {
					number: {
						dataType: 'uint64',
						fieldNumber: 1
					}
				}
			},
		},
		messageSigned64: {
			object: {
				number: -223372036854775807,
			},
			schema: {
				type: 'object',
				properties: {
					number: {
						dataType: 'sint64',
						fieldNumber: 1
					}
				}
			},
		},
	}



	const numberEncoded32 = Number32.encode(input.message32.object).finish();
	const signedNumberEncoded32 = SignedNumber32.encode(input.messageSigned32.object).finish();
	const numberEncoded64 = Number64.encode(input.message64.object).finish();
	const signedNumberEncoded64 = SignedNumber64.encode(input.messageSigned64.object).finish();

	return {
		input: {
			message32: input.message32,
			messageSigned32: input.message32,
			message64: input.message64,
			messageSigned64: input.messageSigned64,
		},
		output: {
			numberEncoded32: numberEncoded32.toString('hex'),
			signedNumberEncoded32: signedNumberEncoded32.toString('hex'),
			numberEncoded64: numberEncoded64.toString('hex'),
			signedNumberEncoded64: signedNumberEncoded64.toString('hex'),
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
