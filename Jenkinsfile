node('lisky-01') {
	lock(resource: 'lisky-01', inversePrecedence: true) {
		stage ('Prepare Workspace') {
			deleteDir()
			checkout scm
		}

		stage ('Install dependencies') {
			try {
				sh '''
				npm install --verbose
				cp ~/.coveralls.yml-lisky .coveralls.yml
				'''
			} catch (err) {
				currentBuild.result = 'FAILURE'
				error('Stopping build, installation failed')
			}
		}

		stage ('Run lint') {
			try {
				sh 'npm run lint'
			} catch (err) {
				currentBuild.result = 'FAILURE'
				error('Stopping build, linting failed')
			}
		}

		stage ('Run tests') {
			try {
				sh 'npm run test'
				withCredentials([string(credentialsId: 'liskhq-snyk-token', variable: 'SNYK_TOKEN')]) {
					sh 'snyk test'
				}
			} catch (err) {
				currentBuild.result = 'FAILURE'
				error('Stopping build, tests failed')
			}
		}

		stage ('Run vulnerabilities check') {
			try {
				withCredentials([string(credentialsId: 'liskhq-snyk-token', variable: 'SNYK_TOKEN')]) {
					sh 'snyk test'
				}
			} catch (err) {
				currentBuild.result = 'FAILURE'
				error('Stopping build, vulnerabilities check failed')
			}
		}

		stage ('Set milestone') {
			milestone 1
			currentBuild.result = 'SUCCESS'
		}
	}
}
