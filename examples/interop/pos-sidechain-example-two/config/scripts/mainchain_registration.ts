import { keys as sidechainValidatorsKeys } from '../default/dev-validators.json';
import { keys as sidechainDevValidators } from '../default/dev-validators.json';
import { registerMainchain } from '../../../common/mainchain_registration';

(async () => {
	await registerMainchain('two', sidechainDevValidators, sidechainValidatorsKeys);
})();
