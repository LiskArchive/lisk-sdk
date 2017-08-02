/* eslint-disable import/prefer-default-export */
import Vorpal from 'vorpal';

export const setUpVorpalWithCommand = (command, capturedOutput) => {
	const vorpal = new Vorpal();
	vorpal.use(command);
	vorpal.pipe((outputs) => {
		outputs.forEach(output => capturedOutput.push(output));
		return '';
	});
	return vorpal;
};
