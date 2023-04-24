import { keys as sidechainValidatorsKeys } from '../../config/default/dev-validators.json';
import { keys as sidechainDevValidators } from '../default/dev-validators.json';
import { registerMainchain } from '../../../common/mainchain_registration';

(async () => {
	await registerMainchain('one', sidechainDevValidators, sidechainValidatorsKeys);
})();
