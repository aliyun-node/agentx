TESTS = $(shell ls -S `find test -type f -name "*.test.js" -print`)
REPORTER = spec
TIMEOUT = 3000
MOCHA_OPTS =
ISTANBUL = ./node_modules/.bin/istanbul
MOCHA = ./node_modules/mocha/bin/_mocha
COVERALLS = ./node_modules/coveralls/bin/coveralls.js

clean:
	@rm -rf node_modules

install:
	@npm install --registry=http://r.cnpmjs.org

test:
	@$(MOCHA) -R $(REPORTER) -t $(TIMEOUT) \
		$(MOCHA_OPTS) \
		$(TESTS)

test-cov:
	@$(ISTANBUL) cover --report html $(MOCHA) -- -t $(TIMEOUT) -R spec $(TESTS)

test-coveralls:
	@$(ISTANBUL) cover --report lcovonly $(MOCHA) -- -t $(TIMEOUT) -R spec $(TESTS)
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@cat ./coverage/lcov.info | $(COVERALLS) && rm -rf ./coverage

debug:
	@node-debug \
		$(MOCHA) --timeout 0 \
		$(MOCHA_OPTS) \
		$(TESTS)

.PHONY: test
