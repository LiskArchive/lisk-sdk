import { APIContext } from '../../state_machine';
import { BaseInteroperableAPI } from './base_interoperable_api';
import { CCMsg } from './types';

export const MODULE_NAME_TOKEN = 'token';

export interface TokenCCAPI extends BaseInteroperableAPI {
	forwardMessageFee: (context: APIContext, ccm: CCMsg) => Promise<boolean>;
}
