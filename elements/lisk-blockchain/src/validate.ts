import * as Ajv from 'ajv';
import { BlockchainError } from './error';

export const validator = new Ajv({ allErrors: true });

export const validateReward = (): BlockchainError | undefined => undefined;

export const validatePayload = (): BlockchainError | undefined => undefined;

export const validateId = (): BlockchainError | undefined => undefined;

export const validateVersion = (): BlockchainError | undefined => undefined;

export const validateSignature = (): BlockchainError | undefined => undefined;

export const validatePriviousId = (): BlockchainError | undefined => undefined;
