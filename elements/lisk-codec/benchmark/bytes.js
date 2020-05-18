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

const { Suite } = require('benchmark');
const bytesEncodingOutput = require('../fixtures/validBytesEncodings.json')
const {
    readBytes,
    writeBytes,
} = require('../dist-node/bytes');
const { writeVarInt } = require('../dist-node/varint')
const suite = new Suite();
const data = bytesEncodingOutput.testCases[0].input.bytes.object.address.data;
const dataBuffer = Buffer.from(data);
const dataEncodedBuffer = Buffer.concat([
    writeVarInt(dataBuffer.length, { dataType: 'uint32' }),
    dataBuffer,
]);

suite
    .add('readBytes', () => {
        readBytes(dataEncodedBuffer, { dataType: 'bytes' });
    })
    .add('writeBytes', () => {
        writeBytes(dataBuffer, { dataType: 'bytes' });
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .run({ async: true });