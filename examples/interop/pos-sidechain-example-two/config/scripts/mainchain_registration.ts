import { keys as sidechainDevValidators } from '../default/dev-validators.json';
import { registerMainchain } from '../../../common/mainchain_registration';

(async () => {
	await registerMainchain(
		'mainchain-node-two',
		'pos-sidechain-example-two',
		sidechainDevValidators,
	);
})();
