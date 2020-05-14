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
    writeVarInt,
    readVarInt,
    writeSignedVarInt,
    readSignedVarInt,
} = require('../dist-node/varint');

const suite = new Suite();

suite
    .add('writeVarInt#uint32', () => {
        writeVarInt(2147483647, { dataType: 'uint32' });
    })
    .add('writeVarInt#uint64', () => {
        writeVarInt(BigInt('8294967295'), { dataType: 'uint64' });
    })
    .add('writeSignedVarInt#sint32', () => {
        writeSignedVarInt(2147483647, { dataType: 'sint32' });
    })
    .add('writeSignedVarInt#sint64', () => {
        writeSignedVarInt(BigInt('9223372036854775807'), {
            dataType: 'sint64',
        });
    })
    .add('readVarInt#uint32', () => {
        readVarInt(Buffer.from('ffffffff0f', 'hex'), { dataType: 'uint32' });
    })
    .add('readVarInt#uint64', () => {
        readVarInt(Buffer.from('ffffffffffffffffff01', 'hex'), {
            dataType: 'uint64',
        });
    })
    .add('readSignedVarInt#sint32', () => {
        readSignedVarInt(Buffer.from('feffffff0f', 'hex'), {
            dataType: 'sint32',
        });
    })
    .add('readSignedVarInt#sint64', () => {
        readSignedVarInt(Buffer.from('ffffffffffffffffff01', 'hex'), {
            dataType: 'sint64',
        });
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .run({ async: true });