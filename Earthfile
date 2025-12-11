VERSION 0.8

ARG EARTHBUILD_LIB_VERSION=3.0.1
IMPORT github.com/EarthBuild/lib/utils/git:$EARTHBUILD_LIB_VERSION AS git

npm-base:
    FROM node:24.12.0-alpine3.23@sha256:eb37f58646a901dc7727cf448cae36daaefaba79de33b5058dab79aa4c04aefb
    # renovate: datasource=npm packageName=npm
    ENV npm_version=11.6.4
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
    FROM alpine:3.23@sha256:51183f2cfa6320055da30872f211093f9ff1d3cf06f39a0bdb212314c5dc7375
    COPY +compile/dist /from-git
    COPY +compile/dist /from-compile
    RUN diff -r /from-git /from-compile >/dev/null || (echo "dist and +compile/dist are different, did you forget to run earthly +compile?" && exit 1)

test:
    FROM +code
    COPY vite.config.ts vitest.config.ts .
    RUN --secret GITHUB_TOKEN npm test

test-run:
    FROM +npm-base
    COPY --dir +compile/dist .
    ENV RUNNER_TOOL_CACHE=/tmp/cache-dir
    RUN node dist/setup/index.js | tee output
    RUN ! grep 'Found tool in cache' output
    RUN cat output | grep '^::add-path::' | sed 's/::add-path:://g' > earthbuild-path
    RUN test "$(cat earthbuild-path)" = "/root/.earthly/bin"
    # [a-zA-Z0-9]* attempt to match a commit hash
    RUN export PATH="$(cat earthbuild-path):$PATH" && earthly --version | tee version.output
    RUN grep -E '^earthly version v.*linux/(arm|amd)64; Alpine Linux' version.output

    # validate cache was used
    RUN node dist/setup/index.js | tee output2
    RUN grep 'Found tool in cache' output2

merge-release-to-major-branch:
    FROM alpine/git:2.49.1@sha256:c0280cf9572316299b08544065d3bf35db65043d5e3963982ec50647d2746e26
    RUN git config --global user.name "littleredcorvette" && \
        git config --global user.email "littleredcorvette@users.noreply.github.com" && \
        git config --global url."git@github.com:".insteadOf "https://github.com/"

    ARG git_repo="earthbuild/actions-setup"
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
