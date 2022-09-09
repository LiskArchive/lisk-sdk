import { MethodContext } from '../../state_machine';
import { BaseInteroperableMethod } from './base_interoperable_method';
import { CCMsg } from './types';

export const MODULE_NAME_TOKEN = 'token';

export interface TokenCCMethod extends BaseInteroperableMethod {
	forwardMessageFee: (context: MethodContext, ccm: CCMsg) => Promise<boolean>;
}
