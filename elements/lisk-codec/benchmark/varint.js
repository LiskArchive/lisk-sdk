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
const {
    readSInt32,
    readUInt32,
    readSInt64,
    readUInt64,
    writeSInt32,
    writeUInt32,
    writeSInt64,
    writeUInt64,
} = require('../dist-node/varint');

const suite = new Suite();

suite
    .add('writeUInt32', () => {
        writeUInt32(2147483647);
    })
    .add('writeUInt64', () => {
        writeUInt64(BigInt('8294967295'));
    })
    .add('writeSInt32', () => {
        writeSInt32(2147483647);
    })
    .add('writeSInt64', () => {
        writeSInt64(BigInt('9223372036854775807'));
    })
    .add('readUInt32', () => {
        readUInt32(Buffer.from('11ffffffff0f', 'hex'), 1);
    })
    .add('readUInt64', () => {
        readUInt64(Buffer.from('11ffffffffffffffffff01', 'hex'), 1);
    })
    .add('readSInt32', () => {
        readSInt32(Buffer.from('00feffffff0f', 'hex'), 1);
    })
    .add('readSInt64', () => {
        readSInt64(Buffer.from('00ffffffffffffffffff01', 'hex'), 1);
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .run({ async: true });