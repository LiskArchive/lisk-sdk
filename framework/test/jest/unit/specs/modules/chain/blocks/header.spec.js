/*
 * Copyright © 2019 Lisk Foundation
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

const { when } = require('jest-when');

describe('blocks/header', () => {
	describe('#validateBlockHeader', () => {
		describe('when previous block property is invalid', () => {});
		describe('when signature is invalid', () => {});
		describe('when a transaction included is invalid', () => {});
		describe('when payload exceeds maximum', () => {});
		describe('when payload length is incorrect', () => {});
		describe('when payload hash is incorrect', () => {});
	});

	describe('#verifyInMemory', () => {
		describe('when previous block id is invalid', () => {});
		describe('when previous block slot is invalid', () => {});
	});

	describe('#verify', () => {
		describe('when skip existing check is true and a transaction is inert', () => {});
		describe('when skip existing check is true and a transaction is allowed', () => {});
		describe('when skip existing check is true and a transaction is not verifiable', () => {});
		describe('when skip existing check is true and transactions are valid', () => {});
		describe('when skip existing check is false and block exists in database', () => {});
		describe('when skip existing check is false and block does not exist in database but transaction does', () => {});
	});

	describe('#apply', () => {
		describe('when block does not contain transactions', () => {});
		describe('when transaction is inert', () => {});
		describe('when transaction is not applicable', () => {});
		describe('when transactions are all valid', () => {});
	});

	describe('#applyGenesis', () => {
		describe('when transaction fails to be applied', () => {});
		describe('when transactions are all valid', () => {});
	});

	describe('#undo', () => {
		describe('when block does not contain transactions', () => {});
		describe('when transaction is inert', () => {});
		describe('when transactions are all valid', () => {});
	});

	describe('#save', () => {
		describe('when block does not contain transactions', () => {});
		describe('when block contains transactions', () => {});
	});

	describe('#remove', () => {
		describe('when saveTempBlock is false', () => {});
		describe('when saveTempBlock is true', () => {});
	});
});
