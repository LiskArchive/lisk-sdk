/* eslint-disable @typescript-eslint/no-empty-function */
import { Application } from 'lisk-sdk';

// @ts-expect-error Unused variable error happens here until at least one module is registered
export const registerPlugins = (_app: Application): void => {};
