VERSION 0.8

PROJECT earthly-technologies/core

ARG EARTHLY_LIB_VERSION=3.0.1
IMPORT github.com/EarthBuild/lib/utils/git:$EARTHLY_LIB_VERSION AS git

npm-base:
    FROM node:22.20.0-alpine3.22@sha256:cb3143549582cc5f74f26f0992cdef4a422b22128cb517f94173a5f910fa4ee7
    # renovate: datasource=npm packageName=npm
    ENV npm_version=11.6.1
    RUN npm i -g npm@$npm_version
    WORKDIR /code
    COPY package.json package-lock.json .
    RUN npm ci

code:
    FROM +npm-base
    COPY --dir src .
    COPY tsconfig.json .

lint:
    FROM +code
    COPY --dir .github .
    COPY \
      .editorconfig \
      .gitignore \
      .prettierignore \
      action.yml \
      Earthfile \
      eslint.config.js \
      package.json \
      README.md \
      vite.config.ts \
      vitest.config.ts \
      .
    RUN npm run-script lint

compile:
    FROM +code
    RUN npm run-script package
    SAVE ARTIFACT dist AS LOCAL dist

test-compile-was-run:
    FROM alpine:3.22@sha256:4bcff63911fcb4448bd4fdacec207030997caf25e9bea4045fa6c8c44de311d1
    COPY +compile/dist /from-git
    COPY +compile/dist /from-compile
    RUN diff -r /from-git /from-compile >/dev/null || (echo "dist and +compile/dist are different, did you forget to run earthly +compile?" && exit 1)

test:
    FROM +code
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
    RUN grep -E '^earthly version v.*linux/(arm|amd)64; Alpine Linux' version.output

    # validate cache was used
    RUN node dist/setup/index.js | tee output2
    RUN grep 'Found tool in cache' output2

merge-release-to-major-branch:
    FROM alpine/git:2.49.1@sha256:e67f8df098804a09c8cd54510b076a44a475a0ef9e25371fc8601f9cd81ae092
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
    BUILD +compile
    BUILD +test
    BUILD +test-run
    BUILD +test-compile-was-run
