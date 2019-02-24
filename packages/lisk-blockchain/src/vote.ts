import { StateStore } from './state_store';
import { Transaction } from './types';

export const applyVote = async (
	store: StateStore,
	tx: Transaction,
): Promise<ReadonlyArray<Error>> => {};

export const undoVote = async (
	store: StateStore,
	tx: Transaction,
): Promise<ReadonlyArray<Error>> => {};
