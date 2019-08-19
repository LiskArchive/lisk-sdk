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

describe('integration test (blocks) - chain/applyBlock', () => {
	describe('applyBlock', () => {
		describe('applyConfirmedStep', () => {
			describe('after applying new block fails', () => {
				it.todo('should have pooled transactions in queued state');

				it.todo('should revert applyconfirmedStep on block transactions');
			});

			describe('after applying a new block', () => {
				it.todo('should applyConfirmedStep');
			});
		});

		describe('saveBlock', () => {
			describe('when block contains invalid transaction - timestamp out of postgres integer range', () => {
				it.todo('should call a callback with proper error');
			});

			describe('when block is invalid - previousBlockId not exists', () => {
				it.todo('should call a callback with proper error');
			});
		});

		describe('saveBlockStep', () => {
			describe('when applying new block fails', () => {
				it.todo('should have pooled transactions in queued state');

				it.todo('should not save block');

				it.todo('should not save transactions');
			});

			describe('when applying a new block', () => {
				it.todo('should save block');

				it.todo('should save transactions');
			});
		});
	});
});
