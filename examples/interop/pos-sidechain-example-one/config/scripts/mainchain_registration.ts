import { keys as sidechainDevValidators } from '../default/dev-validators.json';
import { registerMainchain } from '../../../common/mainchain_registration';

(async () => {
	await registerMainchain(
		'mainchain-node-one',
		'pos-sidechain-example-one',
		sidechainDevValidators,
	);
})();
