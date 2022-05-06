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
 *
 */

import {
	prepareQuestions,
	transformAsset,
	transformNestedAsset,
} from '../../../../src/utils/reader';
import {
	tokenTransferParamsSchema,
	keysRegisterParamsSchema,
	dposVoteParamsSchema,
} from '../../../helpers/transactions';

describe('prompt', () => {
	describe('prepareQuestions', () => {
		it('should return array of questions for given asset schema', () => {
			const questions = prepareQuestions(tokenTransferParamsSchema);
			expect(questions).toEqual([
				{ type: 'input', name: 'tokenID', message: 'Please enter: tokenID: ' },
				{ type: 'input', name: 'amount', message: 'Please enter: amount: ' },
				{
					type: 'input',
					name: 'recipientAddress',
					message: 'Please enter: recipientAddress: ',
				},
				{ type: 'input', name: 'data', message: 'Please enter: data: ' },
			]);
		});
	});

	describe('transformAsset', () => {
		it('should transform result according to asset schema', () => {
			const questions = prepareQuestions(keysRegisterParamsSchema);
			const transformedAsset = transformAsset(keysRegisterParamsSchema, {
				numberOfSignatures: '4',
				mandatoryKeys: 'a,b',
				optionalKeys: 'c,d',
			});
			expect(questions).toEqual([
				{
					type: 'input',
					name: 'numberOfSignatures',
					message: 'Please enter: numberOfSignatures: ',
				},
				{
					type: 'input',
					name: 'mandatoryKeys',
					message: 'Please enter: mandatoryKeys(comma separated values (a,b)): ',
				},
				{
					type: 'input',
					name: 'optionalKeys',
					message: 'Please enter: optionalKeys(comma separated values (a,b)): ',
				},
			]);
			expect(transformedAsset).toEqual({
				numberOfSignatures: 4,
				mandatoryKeys: ['a', 'b'],
				optionalKeys: ['c', 'd'],
			});
		});
	});

	describe('transformNestedAsset', () => {
		it('should transform result according to nested asset schema', () => {
			const questions = prepareQuestions(dposVoteParamsSchema);
			const transformedAsset = transformNestedAsset(dposVoteParamsSchema, [
				{ votes: 'a,100' },
				{ votes: 'b,300' },
			]);

			expect(questions).toEqual([
				{
					type: 'input',
					name: 'votes',
					message: 'Please enter: votes(delegateAddress, amount): ',
				},
				{
					type: 'confirm',
					name: 'askAgain',
					message: 'Want to enter another votes(delegateAddress, amount)',
				},
			]);
			expect(transformedAsset).toEqual({
				votes: [
					{ delegateAddress: 'a', amount: 100 },
					{ delegateAddress: 'b', amount: 300 },
				],
			});
		});
	});
});
