node('lisky-01') {
	lock(resource: 'lisky-01', inversePrecedence: true) {
		stage ('Prepare Workspace') {
			deleteDir()
			checkout scm
		}

		stage ('Build Dependencies') {
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

		stage ('Run Eslint') {
			try {
				sh 'grunt eslint'
			} catch (err) {
				currentBuild.result = 'FAILURE'
				error('Stopping build, tests failed')
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

		stage ('Run Snyk') {
			try {
				withCredentials([string(credentialsId: 'liskhq-snyk-token', variable: 'SNYK_TOKEN')]) {
					sh 'snyk test'
				}
			} catch (err) {
				currentBuild.result = 'FAILURE'
				error('Stopping build, snyk test failed')
			}
		}

		stage ('Set milestone') {
			milestone 1
			currentBuild.result = 'SUCCESS'
		}
	}
}
