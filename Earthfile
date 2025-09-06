VERSION 0.8

PROJECT earthly-technologies/core

ARG EARTHLY_LIB_VERSION=3.0.1
IMPORT github.com/earthly/lib/utils/git:$EARTHLY_LIB_VERSION AS git

npm-base:
    FROM node:21.7-alpine3.19@sha256:1e13649e44d505d5410164f5b7325e4ff1ae551e87e6e4f17d74f6b9b0affbff
    COPY ./package.json ./
    COPY ./package-lock.json ./
    RUN npm install
    # Output these back in case npm install changes them.
    SAVE ARTIFACT package.json AS LOCAL ./package.json
    SAVE ARTIFACT package-lock.json AS LOCAL ./package-lock.json

code:
    FROM +npm-base
    WORKDIR /code
    COPY package.json package-lock.json .
    RUN npm ci
    COPY --dir src .

lint:
    FROM +code
    COPY .eslintrc.cjs .
    RUN npm run-script lint

compile:
    FROM +code
    WORKDIR /code
    RUN npm ci
    COPY tsconfig.json .
    RUN npm run-script package
    SAVE ARTIFACT dist AS LOCAL dist
    SAVE ARTIFACT node_modules AS LOCAL node_modules

test-compile-was-run:
    FROM alpine:3.20@sha256:b3119ef930faabb6b7b976780c0c7a9c1aa24d0c75e9179ac10e6bc9ac080d0d
    COPY +compile/dist /from-git
    COPY +compile/dist /from-compile
    RUN diff -r /from-git /from-compile >/dev/null || (echo "dist and +compile/dist are different, did you forget to run earthly +compile?" && exit 1)

test:
    FROM +code
    COPY tsconfig.json .
    COPY vite.config.ts vitest.config.ts .
    RUN npm test

test-run:
    FROM +npm-base
    COPY --dir +compile/dist .
    ENV RUNNER_TOOL_CACHE=/tmp/cache-dir
    RUN node dist/setup/index.js | tee output
    RUN ! grep 'Found tool in cache' output
    RUN cat output | grep '^::add-path::' | sed 's/::add-path:://g' > earthly-path
    RUN test "$(cat earthly-path)" = "/root/.earthly/bin"
    # [a-zA-Z0-9]* attempt to match a commit hash
    RUN export PATH="$(cat earthly-path):$PATH" && earthly --version | tee version.output
    RUN grep '^earthly version v.*linux/amd64; Alpine Linux' version.output

    # validate cache was used
    RUN node dist/setup/index.js | tee output2
    RUN grep 'Found tool in cache' output2

lint-newline:
    FROM alpine:3.20@sha256:b3119ef930faabb6b7b976780c0c7a9c1aa24d0c75e9179ac10e6bc9ac080d0d
    WORKDIR /everything
    COPY . .
    # test that line endings are unix-style
    RUN set -e; \
        code=0; \
        for f in $(find . -type f \( -iname '*.ts' -o -iname 'Earthfile' \) | grep -v node_modules); do \
            if ! dos2unix < "$f" | cmp - "$f"; then \
                echo "$f contains windows-style newlines and must be converted to unix-style (use dos2unix to fix)"; \
                code=1; \
            fi; \
        done; \
        exit $code
    # test file ends with a single newline
    RUN set -e; \
        code=0; \
        for f in $(find . -type f \( -iname '*.ts' -o -iname 'Earthfile' \) | grep -v node_modules); do \
            if [ "$(tail -c 1 $f)" != "$(printf '\n')" ]; then \
                echo "$f does not end with a newline"; \
                code=1; \
            fi; \
        done; \
        exit $code
    # check for files with trailing newlines
    RUN set -e; \
        code=0; \
        for f in $(find . -type f \( -iname '*.ts' -o -iname 'Earthfile' \) | grep -v node_modules); do \
            if [ "$(tail -c 2 $f)" == "$(printf '\n\n')" ]; then \
                echo "$f has trailing newlines"; \
                code=1; \
            fi; \
        done; \
        exit $code

# update-dist-for-renovate re-compiles the project and commits the new build to the same branch.
update-dist-for-renovate:
    FROM alpine/git@sha256:af916bb957a0a7106f86b3e4e583b1e1444957518d8e4132d6a37259c912a277
    RUN git config --global user.name "renovate[bot]" && \
        git config --global user.email "renovate[bot]@users.noreply.github.com" && \
        git config --global url."git@github.com:".insteadOf "https://github.com/"

    ARG git_repo="EarthBuild/actions-setup"
    ARG git_url="git@github.com:$git_repo"
    ARG SECRET_PATH=littleredcorvette-id_rsa
    DO --pass-args git+DEEP_CLONE --GIT_URL=$git_url --SECRET_PATH=$SECRET_PATH

    ARG --required EARTHLY_GIT_BRANCH
    RUN --mount=type=secret,id=$SECRET_PATH,mode=0400,target=/root/.ssh/id_rsa \
         git checkout $EARTHLY_GIT_BRANCH
    COPY --dir +compile/dist .
    RUN git add dist && git commit -m "update dist for Renovate" || echo nothing to commit
    RUN --push --mount=type=secret,id=$SECRET_PATH,mode=0400,target=/root/.ssh/id_rsa \
         git push origin $EARTHLY_GIT_BRANCH

merge-release-to-major-branch:
    FROM alpine/git@sha256:af916bb957a0a7106f86b3e4e583b1e1444957518d8e4132d6a37259c912a277
    RUN git config --global user.name "littleredcorvette" && \
        git config --global user.email "littleredcorvette@users.noreply.github.com" && \
        git config --global url."git@github.com:".insteadOf "https://github.com/"

    ARG git_repo="earthly/actions-setup"
    ARG git_url="git@github.com:$git_repo"
    ARG SECRET_PATH=littleredcorvette-id_rsa
    DO --pass-args git+DEEP_CLONE --GIT_URL=$git_url --SECRET_PATH=$SECRET_PATH

    ARG --required RELEASE_TAG
    LET tag=${RELEASE_TAG#refs/tags/}
    LET major=$tag
    SET major=$(echo ${major%.*})
    SET major=$(echo ${major%.*})
    RUN --mount=type=secret,id=$SECRET_PATH,mode=0400,target=/root/.ssh/id_rsa \
         git checkout $major && git merge --ff-only $tag
    RUN --push --mount=type=secret,id=$SECRET_PATH,mode=0400,target=/root/.ssh/id_rsa \
    git push origin $major

all:
    BUILD +lint
    BUILD +lint-newline
    BUILD +compile
    BUILD +test
    BUILD +test-run
    BUILD +test-compile-was-run
