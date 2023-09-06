import { intToBuffer } from '@liskhq/lisk-cryptography/dist-node/utils';
import {
	BYTE_LENGTH,
	DB_KEY_LEGACY_BRACKET,
	DB_KEY_TRANSACTIONS_BLOCK_ID,
	DB_KEY_TRANSACTIONS_ID,
	DB_KEY_BLOCKS_ID,
	DB_KEY_BLOCKS_HEIGHT,
} from './constants';

// INFO: Here ID refers to hashed value of 32 length
export const buildTxIDDbKey = (ID: Buffer): Buffer => Buffer.concat([DB_KEY_TRANSACTIONS_ID, ID]);

export const buildBlockIDDbKey = (ID: Buffer): Buffer => Buffer.concat([DB_KEY_BLOCKS_ID, ID]);
export const buildTxsBlockIDDbKey = (ID: Buffer): Buffer =>
	Buffer.concat([DB_KEY_TRANSACTIONS_BLOCK_ID, ID]);

// INFO: Generated Buffer is further used as `ID` for ```getBlockByID (ID:Buffer)```
export const buildBlockHeightDbKey = (height: number): Buffer =>
	Buffer.concat([DB_KEY_BLOCKS_HEIGHT, intToBuffer(height, BYTE_LENGTH)]);

export const buildLegacyBracketDBKey = (snapshotBlockID: Buffer): Buffer =>
	Buffer.concat([DB_KEY_LEGACY_BRACKET, snapshotBlockID]);
