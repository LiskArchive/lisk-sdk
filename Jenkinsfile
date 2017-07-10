node('lisk-js-01'){
  lock(resource: "lisk-js-01", inversePrecedence: true) {
    stage ('Prepare Workspace') {
      deleteDir()
      checkout scm
    }

    stage ('Build Dependencies') {
      try {
        sh '''#!/bin/bash
        # Install Deps
        npm install --verbose
        cp ~/.coveralls.yml .
        '''
      } catch (err) {
        currentBuild.result = 'FAILURE'
        error('Stopping build, installation failed')
      }
    }

    stage ('Run Eslint') {
      try {
        sh '''#!/bin/bash
        # Run Tests
        grunt eslint-ci
        '''
      } catch (err) {
        currentBuild.result = 'FAILURE'
        error('Stopping build, tests failed')
      }
    }

    stage ('Run tests') {
      try {
        sh '''#!/bin/bash
        # Run Tests
        npm run jenkins
        '''
      } catch (err) {
        currentBuild.result = 'FAILURE'
        error('Stopping build, tests failed')
      }
    }

    stage ('Set milestone') {
      milestone 1
      currentBuild.result = 'SUCCESS'
    }
  }
}
