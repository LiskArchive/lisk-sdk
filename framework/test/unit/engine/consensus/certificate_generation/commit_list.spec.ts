/*
 * Copyright © 2022 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';
import {
	CommitList,
	COMMIT_SORT,
} from '../../../../../src/engine/consensus/certificate_generation/commit_list';
import { SingleCommit } from '../../../../../src/engine/consensus/certificate_generation/types';

describe('CommitList', () => {
	const sampleHeight = 10;
	const singleSampleCommit = {
		blockID: utils.getRandomBytes(32),
		certificateSignature: utils.getRandomBytes(96),
		height: sampleHeight,
		validatorAddress: utils.getRandomBytes(20),
	};
	const sampleCommits = Array.from(
		{ length: 10 },
		index =>
			({
				blockID: utils.getRandomBytes(32),
				certificateSignature: utils.getRandomBytes(96),
				height: sampleHeight * (index as number),
				validatorAddress: utils.getRandomBytes(20),
			} as SingleCommit),
	);

	const height10 = 10;
	const height20 = 20;
	const height30 = 30;

	const commitsHeight10 = Array.from(
		{ length: 5 },
		_ =>
			({
				blockID: utils.getRandomBytes(32),
				certificateSignature: utils.getRandomBytes(96),
				height: height10,
				validatorAddress: utils.getRandomBytes(20),
			} as SingleCommit),
	);

	const commitsHeight20 = Array.from(
		{ length: 5 },
		_ =>
			({
				blockID: utils.getRandomBytes(32),
				certificateSignature: utils.getRandomBytes(96),
				height: height20,
				validatorAddress: utils.getRandomBytes(20),
			} as SingleCommit),
	);

	const commitsHeight30 = Array.from(
		{ length: 5 },
		_ =>
			({
				blockID: utils.getRandomBytes(32),
				certificateSignature: utils.getRandomBytes(96),
				height: height30,
				validatorAddress: utils.getRandomBytes(20),
			} as SingleCommit),
	);

	describe('constructor', () => {
		let commitList: CommitList;

		beforeEach(() => {
			commitList = new CommitList();
		});

		it('should initialize _commitMap', () => {
			// Assert
			expect(commitList['_commitMap']).toBeDefined();
			expect(commitList.getAll()).toBeArrayOfSize(0);
		});
	});

	describe('add', () => {
		let commitList: CommitList;

		beforeEach(() => {
			commitList = new CommitList();
			sampleCommits.forEach(c => commitList.add(c));
		});

		it('should get all the commits that are added', () => {
			// Assert
			expect(commitList.getAll()).toHaveLength(sampleCommits.length);
			expect(commitList.getAll()).toContainAllValues(sampleCommits);
		});
	});

	describe('getByHeight', () => {
		let commitList: CommitList;

		beforeEach(() => {
			commitList = new CommitList();
			commitsHeight10.forEach(c => commitList.add(c));
			commitsHeight20.forEach(c => commitList.add(c));
		});

		it('should get all the commits by height', () => {
			// Assert
			expect(commitList.getByHeight(height10)).toHaveLength(5);
			expect(commitList.getByHeight(height10)).toContainAllValues(commitsHeight10);
			expect(commitList.getByHeight(height20)).toHaveLength(5);
			expect(commitList.getByHeight(height20)).toContainAllValues(commitsHeight20);
		});
	});

	describe('getHeights', () => {
		let commitList: CommitList;

		beforeEach(() => {
			commitList = new CommitList();
			commitsHeight10.forEach(c => commitList.add(c));
			commitsHeight20.forEach(c => commitList.add(c));
			commitsHeight30.forEach(c => commitList.add(c));
		});

		it('should get all the heights', () => {
			// Assert
			expect(commitList.getHeights()).toHaveLength(3);
			expect(commitList.getHeights()).toContainAllValues([height10, height20, height30]);
		});
	});

	describe('exists', () => {
		let commitList: CommitList;

		beforeEach(() => {
			commitList = new CommitList();
		});

		it('should return true after adding a commit', () => {
			// Assert
			expect(commitList.exists(singleSampleCommit)).toBeFalse();
			commitList.add(singleSampleCommit);
			expect(commitList.exists(singleSampleCommit)).toBeTrue();
		});
	});

	describe('deleteCommitsByHeight', () => {
		let commitList: CommitList;

		beforeEach(() => {
			commitList = new CommitList();
			commitsHeight10.forEach(c => commitList.add(c));
			commitsHeight20.forEach(c => commitList.add(c));
		});

		it(`should delete commits for height ${height10}`, () => {
			// Assert
			expect(commitList.getAll()).toHaveLength(commitsHeight10.length + commitsHeight20.length);
			commitList.deleteByHeight(height10);
			expect(commitList.getAll()).toHaveLength(commitsHeight20.length);
			expect(commitList.getAll()).toContainAllValues(commitsHeight20);
		});
	});

	describe('getAllCommits', () => {
		let commitList: CommitList;

		beforeEach(() => {
			commitList = new CommitList();
			commitsHeight10.forEach(c => commitList.add(c));
			commitsHeight20.forEach(c => commitList.add(c));
			commitsHeight30.forEach(c => commitList.add(c));
		});

		it('should return all the added commits in ASC order', () => {
			// Arrange
			const ascSortedList = [...commitsHeight10, ...commitsHeight20, ...commitsHeight30].sort(
				(a, b) => a.height - b.height,
			);
			// Assert
			expect(commitList.getAll()).toHaveLength(
				commitsHeight10.length + commitsHeight20.length + commitsHeight30.length,
			);
			expect(commitList.getAll()).toEqual(ascSortedList);
		});

		it('should return all the added commits in DESC order', () => {
			// Arrange
			const descSortedList = [...commitsHeight10, ...commitsHeight20, ...commitsHeight30].sort(
				(a, b) => b.height - a.height,
			);
			// Assert
			expect(commitList.getAll(COMMIT_SORT.DSC)).toHaveLength(
				commitsHeight10.length + commitsHeight20.length + commitsHeight30.length,
			);
			expect(commitList.getAll(COMMIT_SORT.DSC)).toEqual(descSortedList);
		});
	});

	describe('deleteSingleCommit', () => {
		let commitList: CommitList;

		beforeEach(() => {
			commitList = new CommitList();
			commitList.add(singleSampleCommit);
			commitsHeight10.forEach(c => commitList.add(c));
		});

		it('should delete the single commit and should not exist in the _commitMap', () => {
			expect(commitList.exists(singleSampleCommit)).toBeTrue();
			// Act
			commitList.deleteSingle(singleSampleCommit);
			// Assert
			expect(commitList.exists(singleSampleCommit)).toBeFalse();
		});

		it('should not delete anything if the height does not exist', () => {
			const originalSize = commitList.size();

			commitList.deleteSingle({
				...singleSampleCommit,
				height: 9999,
			});
			expect(commitList.size()).toBe(originalSize);
		});

		it('should not delete anything if commit does not exist', () => {
			const originalSize = commitList.size();

			commitList.deleteSingle({
				...singleSampleCommit,
				validatorAddress: utils.getRandomBytes(20),
			});
			expect(commitList.size()).toBe(originalSize);
		});
	});
});
