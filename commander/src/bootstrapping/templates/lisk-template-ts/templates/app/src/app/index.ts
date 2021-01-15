import app from './app';
import './plugins';
import './modules';

// TODO: This needed to be removed when start command is implemented
app.run().catch(error => {
	console.error('Application cause error: ', error);
});
