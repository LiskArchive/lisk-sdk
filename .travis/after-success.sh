#!/usr/bin/env bash

TRAVIS_BUILD_NUMBER=$1
JOB_NUMBER=$2
TESTS_COUNT=$3
TEST_TYPE=$4
TRAVIS_BUILD_DIR=$5
TRAVIS_BRANCH=$6
TRAVIS_PULL_REQUEST_BRANCH=$7

if [ ${TEST_TYPE} == "FUNC" ]; then
  npm run fetchCoverage;
fi
bash .travis/send-report.sh \
    ${TRAVIS_BUILD_NUMBER} \
    ${JOB_NUMBER} \
    ${TESTS_COUNT} \
    ${TEST_TYPE} \
    ${TRAVIS_BUILD_DIR} \
    ${TRAVIS_BRANCH} \
    ${TRAVIS_PULL_REQUEST_BRANCH};
