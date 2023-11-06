/* eslint-disable import/extensions */
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import '@csstools/normalize.css';
import './index.scss';
import { App } from './app';

ReactDOM.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
	document.getElementById('root'),
);
