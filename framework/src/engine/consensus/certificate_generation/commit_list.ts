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

import { SingleCommit } from './types';

export enum COMMIT_SORT {
	ASC = 1,
	DSC = -1,
}

export class CommitList {
	private readonly _commitMap: Map<number, SingleCommit[]> = new Map<number, SingleCommit[]>();

	public getByHeight(height: number) {
		return this._commitMap.get(height) ?? [];
	}

	public getHeights() {
		return [...this._commitMap.keys()];
	}

	public size() {
		let sum = 0;
		for (const [, value] of this._commitMap) {
			sum += value.length;
		}
		return sum;
	}

	public add(commit: SingleCommit) {
		const currentCommits = this._commitMap.get(commit.height) ?? [];

		this._commitMap.set(commit.height, [...currentCommits, commit]);
	}

	public exists(commit: SingleCommit) {
		const currentCommits = this._commitMap.get(commit.height) ?? [];

		return currentCommits.some(
			aCommit =>
				aCommit.blockID.equals(commit.blockID) &&
				aCommit.validatorAddress.equals(commit.validatorAddress),
		);
	}

	public deleteByHeight(height: number) {
		if (this._commitMap.delete(height)) {
			// Delete empty array entry
			if (this._commitMap.get(height) && this._commitMap.get(height)?.length === 0) {
				this._commitMap.delete(height);
			}
		}
	}

	public getAll(sortOrder = COMMIT_SORT.ASC) {
		return [...this._commitMap.values()].flat().sort((a, b) => sortOrder * (a.height - b.height));
	}

	public deleteSingle(commit: SingleCommit) {
		const commitList = this._commitMap.get(commit.height);
		if (!commitList) {
			return;
		}

		const index = commitList.findIndex(
			c => c.blockID.equals(commit.blockID) && c.validatorAddress.equals(commit.validatorAddress),
		);

		commitList.splice(index, 1);

		if (commitList.length === 0) {
			this._commitMap.delete(commit.height);
		}
	}
}
