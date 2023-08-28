// LIP 45

export const LSK_TOKEN_ID = Buffer.from('0400000000000000', 'hex');

export const STORE_PREFIX_INTEROPERABILITY = Buffer.from('83ed0d25', 'hex');
export const SUBSTORE_PREFIX_CHANNEL_DATA = Buffer.from('a000', 'hex');

export const HASH_LENGTH = 32;
export const CHAIN_ID_LENGTH = 4;
export const LOCAL_ID_LENGTH = 4;
export const TOKEN_ID_LENGTH = CHAIN_ID_LENGTH + LOCAL_ID_LENGTH;

export const EVENT_NAME_CCM_PROCESSED = 'ccmProcessed';

// These are defined here to avoid accidental key overlap, since all are using same db
export const DB_KEY_MESSAGE_RECOVERY = Buffer.from([1]);
export const DB_KEY_STATE_RECOVERY = Buffer.from([2]);
export const DB_KEY_EVENTS = Buffer.from([3]);

// https://github.com/LiskHQ/lips/blob/main/proposals/lip-0045.md#notation-and-constants
export const COMMAND_RECOVER_STATE = 'recoverState';
export const COMMAND_RECOVER_MESSAGE = 'recoverMessage';
