import * as React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import MainPage from './pages/MainPage';

const App: React.FC = () => (
	<Provider store={store}>
		<MainPage />
	</Provider>
);

export default App;
