/*
 * Copyright © 2018 Lisk Foundation
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

const mocha = require('mocha');
const coMocha = require('co-mocha');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const _ = require('lodash');

coMocha(mocha);

process.env.NODE_ENV = 'test';

chai.use(sinonChai);
chai.use(chaiAsPromised);

// Cloning the constants object to remove immutability
global.expect = chai.expect;
global.sinonSandbox = sinon.createSandbox();
global._ = _;
