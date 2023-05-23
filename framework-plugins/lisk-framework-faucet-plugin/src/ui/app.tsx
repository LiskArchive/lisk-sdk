/* eslint-disable arrow-body-style */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import * as React from 'react';
import { apiClient, cryptography } from '@liskhq/lisk-client';
import logo from './logo.svg';
import illustration from './illustration.svg';
import styles from './app.module.scss';

const validateAddress = (address: string, prefix: string): boolean => {
	try {
		return cryptography.address.validateLisk32Address(address, prefix);
	} catch (error) {
		return false;
	}
};

interface FaucetConfig {
	amount: string;
	applicationUrl: string;
	tokenPrefix: string;
	logoURL?: string;
	captchaSitekey?: string;
	faucetAddress?: string;
}

const defaultFaucetConfig: FaucetConfig = {
	amount: '10000000000',
	applicationUrl: 'ws://localhost:8080/ws',
	tokenPrefix: 'lsk',
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
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		grecaptcha: any;
	}
}

const WarningIcon = () => <span className={`${styles.icon} ${styles.warning}`}>&#xE8B2;</span>;

interface DialogProps {
	open?: boolean;
	onClose?: () => void;
}

const SuccessDialog: React.FC<DialogProps> = props => {
	return (
		<div className={`${styles.dialogRoot} ${props.open ? styles.dialogOpen : styles.dialogClose}`}>
			<div className={styles.dialogBackground}>
				<div className={styles.dialogModal}>
					<div className={styles.dialogHeader}>
						<div className={styles.dialogHeaderContent}>Success</div>
						<div className={styles.iconButton} onClick={props.onClose}>
							<span className={styles.icon}>close</span>;
						</div>
					</div>
					<div className={styles.dialogBody}>{props.children}</div>
				</div>
			</div>
		</div>
	);
};

export const App: React.FC = () => {
	const [input, updateInput] = React.useState('');
	const [errorMsg, updateErrorMsg] = React.useState('');
	const [showSuccessDialog, updateShowSuccessDialog] = React.useState(false);
	const [token, updateToken] = React.useState<string | undefined>();
	const [recaptchaReady, updateRecaptchaReady] = React.useState(false);
	const [config, setConfig] = React.useState<FaucetConfig>(defaultFaucetConfig);
	React.useEffect(() => {
		const initConfig = async () => {
			const fetchedConfig = await getConfig();
			setConfig({ ...fetchedConfig });
		};
		initConfig().catch(console.error);
	}, []);
	React.useEffect(() => {
		if (config.captchaSitekey === undefined) {
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			return () => {};
		}
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
	}, [config]);

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
			await client.invoke('faucet_fundTokens', {
				address: cryptography.address
					.getAddressFromLisk32Address(input, config.tokenPrefix)
					.toString('hex'),
				token,
			});
			updateErrorMsg('');
			updateShowSuccessDialog(true);
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			updateErrorMsg((error as Error)?.message ?? 'Fail to connect to server');
		}
	};
	return (
		<div className={styles.root}>
			<header className={styles.header}>
				<img src={config.logoURL ?? logo} className={styles.logo} alt="logo" />
			</header>
			<section className={styles.content}>
				<SuccessDialog
					open={showSuccessDialog}
					onClose={() => {
						updateInput('');
						updateShowSuccessDialog(false);
					}}
				>
					<p>
						Successfully submitted to transfer funds to:
						<br />
						{input}.
					</p>
				</SuccessDialog>
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
								placeholder={config.faucetAddress}
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
							<span className={styles.addressValue}>{config.faucetAddress}</span>
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
