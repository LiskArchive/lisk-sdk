/*
 * Copyright © 2021 Lisk Foundation
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

import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { createFakeBlockHeader } from '../../../../../src/testing/create_block';
import { CommitPool } from '../../../../../src/node/consensus/certificate_generation/commit_pool';
import {
	computeCertificateFromBlockHeader,
	signCertificate,
} from '../../../../../src/node/consensus/certificate_generation/utils';
import { SingleCommit } from '../../../../../src/node/consensus/certificate_generation/types';

describe('CommitPool', () => {
	const networkIdentifier = Buffer.alloc(0);
	let commitPool: CommitPool;
	let bftAPI: any;
	let validatorsAPI: any;
	let blockTime;
	let network: any;

	beforeEach(() => {
		bftAPI = jest.fn();
		validatorsAPI = jest.fn();
		blockTime = 10;
		network = {};
		commitPool = new CommitPool({
			bftAPI,
			validatorsAPI,
			blockTime,
			network,
		});
	});

	describe('constructor', () => {
		it.todo('');
	});
	describe('job', () => {
		it.todo('');
	});
	describe('addCommit', () => {
		it.todo('');
	});
	describe('validateCommit', () => {
		it.todo('');
	});
	describe('getCommitsByHeight', () => {
		it.todo('');
	});

	describe('createSingleCommit', () => {
		const blockHeader = createFakeBlockHeader();
		const validatorInfo = {
			address: Buffer.alloc(0),
			blsPublicKey: getRandomBytes(48),
			blsSecretKey: getRandomBytes(32),
		};
		const certificate = computeCertificateFromBlockHeader(blockHeader);
		let expectedCommit: SingleCommit;

		beforeEach(() => {
			expectedCommit = {
				blockID: blockHeader.id,
				height: blockHeader.height,
				validatorAddress: validatorInfo.address,
				certificateSignature: signCertificate(
					validatorInfo.blsSecretKey,
					networkIdentifier,
					certificate,
				),
			};
		});

		it('should create a single commit', () => {
			expect(commitPool.createSingleCommit(blockHeader, validatorInfo, networkIdentifier)).toEqual(
				expectedCommit,
			);
		});
	});

	describe('verifyAggregateCommit', () => {
		it.todo('');
	});
	describe('getAggregageCommit', () => {
		it.todo('');
	});
	describe('_aggregateSingleCommits', () => {
		it.todo('');
	});
	describe('_selectAggregateCommit', () => {
		it.todo('');
	});
});
