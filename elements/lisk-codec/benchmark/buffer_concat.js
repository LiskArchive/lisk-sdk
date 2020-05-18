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
// Buffer.concat x 1,263,976 ops/sec ±6.44% (74 runs sampled)

const { Suite } = require('benchmark');
const { randomBytes } = require('crypto');
const suite = new Suite();
const buf1 = randomBytes(1024);
const buf2 = randomBytes(1024);

suite
  .add('Buffer.concat', () => {
    Buffer.concat([buf1, buf2]);
  })
  .on('cycle', function (event) {
    console.log(String(event.target));
  })
  .run({ async: true });
