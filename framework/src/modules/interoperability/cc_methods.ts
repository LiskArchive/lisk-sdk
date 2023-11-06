import { MethodContext } from '../../state_machine';
import { BaseCCMethod } from './base_cc_method';
import { CCMsg } from './types';

export const MODULE_NAME_TOKEN = 'token';

export interface TokenCCMethod extends BaseCCMethod {
	forwardMessageFee: (context: MethodContext, ccm: CCMsg) => Promise<boolean>;
}
