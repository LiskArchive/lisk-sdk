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
    readBoolean,
    writeBoolean,
} = require('../dist-node/boolean');

const suite = new Suite();

suite
    .add('readBoolean', () => {
        readBoolean(Buffer.from('01', 'hex'), { dataType: 'boolean' });
    })
    .add('writeBoolean', () => {
        writeBoolean(true, { dataType: 'boolean' });
    })
    .on('cycle', function (event) {
        console.log(String(event.target));
    })
    .run({ async: true });