#!/bin/bash

TRAVIS_BUILD_NUMBER=$1
JOB_NUMBER=$2
TEST_TYPE=$3
TRAVIS_BUILD_DIR=$4
TRAVIS_BRANCH=$5
TRAVIS_PULL_REQUEST_BRANCH=$6

if [ -z ${TRAVIS_BUILD_NUMBER+x} ] || [ -z ${JOB_NUMBER+x} ] || [ -z ${TEST_TYPE+x} ] || \
	[ -z ${TRAVIS_BUILD_DIR+x} ] || [ -z ${TRAVIS_BRANCH+x} ] || [ -z ${TRAVIS_PULL_REQUEST_BRANCH+x} ]; then
	echo "Provide all script parameters."
	exit 1
fi

COVERAGE_DIR=${TRAVIS_BUILD_DIR}/test

if [ ${TEST_TYPE} == "FUNC" ]; then
	REPORT_NAME=".coverage-func";
	unzip ${COVERAGE_DIR}/.coverage-func.zip -d ${COVERAGE_DIR}/${REPORT_NAME}
else
	REPORT_NAME=".coverage-unit";
fi

if [ ! -e ${COVERAGE_DIR}/${REPORT_NAME}/lcov.info ]; then
	echo "Cannot find the report at path $COVERAGE_DIR/$REPORT_NAME";
	exit 1
fi

if [ -n ${TRAVIS_PULL_REQUEST_BRANCH+x} ] && [ -n ${TRAVIS_PULL_REQUEST_BRANCH} ]; then
	BRANCH=${TRAVIS_PULL_REQUEST_BRANCH}
else
	BRANCH=${TRAVIS_BRANCH}
fi

COVERALLS_SERVICE_NAME="travis-ci"
COVERALLS_REPO_TOKEN=7s05KDqmPWkwZ6nzU5WtznKkt5FKDE3kv
COVERALLS_PARALLEL=true
COVERALLS_SERVICE_JOB_ID=JOB_NUMBER

yarn global add coveralls
cat ${COVERAGE_DIR}/${REPORT_NAME}/lcov.info | coveralls

if [ -z $? ] || [ $? -eq 1 ]; then
	echo ${COVERAGE_DIR}/${REPORT_NAME}/lcov.info "SEND TO COVERALLS"
else
	echo "Unable to create reports: " $?
fi
