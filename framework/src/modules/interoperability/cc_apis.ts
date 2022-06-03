import { APIContext } from '../../state_machine';
import { BaseInteroperableAPI } from './base_interoperable_api';
import { CCMsg } from './types';

export interface TokenCCAPI extends BaseInteroperableAPI {
	forwardMessageFee: (context: APIContext, ccm: CCMsg) => Promise<boolean>;
}
