import { Application, genesisBlockDevnet, configDevnet, utils } from 'lisk-sdk';

const app = Application.defaultApplication(
	genesisBlockDevnet,
	utils.objects.mergeDeep(configDevnet, { label: '<%= appName %>' }),
);

export default app;
