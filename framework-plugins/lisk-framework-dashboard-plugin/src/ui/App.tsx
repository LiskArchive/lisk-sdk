import * as React from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import MainPage from './pages/MainPage';

interface DashboardConfig {
	applicationUrl: string;
}

declare global {
	interface Window {
		DASHBOARD_CONFIG: DashboardConfig;
	}
}

const App: React.FC = () => {
	const { applicationUrl } = window.DASHBOARD_CONFIG;

	return (
		<Provider store={store}>
			<MainPage applicationUrl={applicationUrl} />
		</Provider>
	);
};

export default App;
