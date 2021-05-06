/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as React from 'react';
import { apiClient } from '@liskhq/lisk-client';
import { validateBase32Address, getAddressFromBase32Address } from '@liskhq/lisk-cryptography';
import logo from './logo.svg';
import illustration from './illustration.svg';
import styles from './app.module.scss';

const validateAddress = (address: string, prefix: string): boolean => {
	try {
		return validateBase32Address(address, prefix);
	} catch (error) {
		return false;
	}
};

interface FaucetConfig {
	amount: string;
	applicationUrl: string;
	tokenPrefix: string;
	logoURL?: string;
	captchaSitekey: string;
}

const defaultFaucetConfig: FaucetConfig = {
	amount: '10000000000',
	applicationUrl: 'ws://localhost:8080/ws',
	tokenPrefix: 'lsk',
	captchaSitekey: 'temp',
};

export const getConfig = async () => {
	if (process.env.NODE_ENV === 'development') {
		return defaultFaucetConfig;
	}

	const apiResponse = await fetch('/api/config');
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const result: FaucetConfig = await apiResponse.json();

	return result;
};

declare global {
	interface Window {
		grecaptcha: any;
	}
}

const WarningIcon = () => <span className={`${styles.icon} ${styles.warning}`}>&#xE8B2;</span>;

export const App: React.FC = () => {
	const faucetAddress = 'lskdwsyfmcko6mcd357446yatromr9vzgu7eb8y99';
	const [input, updateInput] = React.useState('');
	const [errorMsg, updateErrorMsg] = React.useState('');
	const [token, updateToken] = React.useState<string | undefined>();
	const [recaptchaReady, updateRecaptchaReady] = React.useState(false);
	const [config, setConfig] = React.useState<FaucetConfig>(defaultFaucetConfig);
	React.useEffect(() => {
		const initConfig = async () => {
			const fetchedConfig = await getConfig();
			setConfig(fetchedConfig);
		};
		initConfig().catch(console.error);

		const script = document.createElement('script');
		script.src = 'https://www.google.com/recaptcha/api.js';
		script.async = true;
		script.defer = true;
		document.body.appendChild(script);
		const id = setInterval(() => {
			if (
				typeof window.grecaptcha !== 'undefined' &&
				// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
				typeof window.grecaptcha.render === 'function'
			) {
				clearInterval(id);
				if (recaptchaReady) {
					return;
				}
				// eslint-disable-next-line
				window.grecaptcha.render('recapcha', {
					sitekey: config.captchaSitekey,
					callback: (newToken: string) => updateToken(newToken),
				});
				updateRecaptchaReady(true);
			}
		}, 1000);
		return () => {
			document.body.removeChild(script);
		};
	}, []);

	const onChange = (val: string) => {
		updateInput(val);
		if (val === '') {
			updateErrorMsg('');
		}
	};

	const onSubmit = async () => {
		if (token === undefined) {
			updateErrorMsg('Recaptcha must be checked.');
			return;
		}
		try {
			const client = await apiClient.createWSClient(config.applicationUrl);
			await client.invoke('faucet:fundTokens', {
				address: getAddressFromBase32Address(input, config.tokenPrefix).toString('hex'),
				token,
			});
			updateErrorMsg('');
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			updateErrorMsg(error?.message ?? 'Fail to connect to server');
		}
	};
	return (
		<div className={styles.root}>
			<header className={styles.header}>
				<img src={config.logoURL ?? logo} className={styles.logo} alt="logo" />
			</header>
			<section className={styles.content}>
				<div className={styles.main}>
					<h1>All tokens are for testing purposes only</h1>
					<h2>
						Please enter your address to receive {config.amount}{' '}
						{config.tokenPrefix.toLocaleUpperCase()} tokens for free
					</h2>
					<div className={styles.inputArea}>
						<div className={styles.input}>
							<input
								className={`${errorMsg !== '' ? styles.error : ''}`}
								placeholder={faucetAddress}
								value={input}
								onChange={e => onChange(e.target.value)}
							/>
							{errorMsg ? <WarningIcon /> : <span />}
							{errorMsg ? <span className={styles.errorMsg}>{errorMsg}</span> : <span />}
						</div>
						<button
							disabled={!validateAddress(input, config.tokenPrefix) || !recaptchaReady}
							onClick={onSubmit}
						>
							Receive
						</button>
					</div>
					<div id="recapcha" className={styles.capcha}></div>
					<div className={styles.address}>
						<p>
							<span className={styles.addressLabel}>Faucet address:</span>
							<span className={styles.addressValue}>{faucetAddress}</span>
						</p>
					</div>
				</div>
				<div className={styles.background}>
					<img src={illustration} className={styles.illustration} alt="illustration" />
				</div>
			</section>
			<footer>
				<p className={styles.copyright}>© 2021 Lisk Foundation</p>
			</footer>
		</div>
	);
};
