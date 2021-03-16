import * as React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { Main } from './pages/main';

export const App: React.FC = () => (
	<Provider store={store}>
		<Main />
	</Provider>
);
