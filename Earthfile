VERSION 0.8

ARG EARTHBUILD_LIB_VERSION=3.0.1
IMPORT github.com/EarthBuild/lib/utils/git:$EARTHBUILD_LIB_VERSION AS git

npm-base:
    FROM node:24.13.1-alpine3.23@sha256:4f696fbf39f383c1e486030ba6b289a5d9af541642fc78ab197e584a113b9c03
    # renovate: datasource=npm packageName=npm
    ENV npm_version=11.9.0
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

fmt:
    LOCALLY
    RUN npx prettier --write .

compile:
    FROM +code
    RUN npm run-script package
    SAVE ARTIFACT dist AS LOCAL dist

test-compile-was-run:
    FROM alpine:3.23@sha256:25109184c71bdad752c8312a8623239686a9a2071e8825f20acb8f2198c3f659
    COPY +compile/dist /from-git
    COPY +compile/dist /from-compile
    RUN diff -r /from-git /from-compile >/dev/null || (echo "dist and +compile/dist are different, did you forget to run earth +compile?" && exit 1)

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
    RUN test "$(cat earthbuild-path)" = "/root/.earth/bin"
    # [a-zA-Z0-9]* attempt to match a commit hash
    RUN export PATH="$(cat earthbuild-path):$PATH" && earth --version | tee version.output
    RUN grep -E '^earth version v.*linux/(arm|amd)64; Alpine Linux' version.output

    # validate cache was used
    RUN node dist/setup/index.js | tee output2
    RUN grep 'Found tool in cache' output2

merge-release-to-major-branch:
    FROM alpine/git:v2.52.0@sha256:3b7890cb947afd3f71adab55aa6b549ad0f8ddc4b9ed28b027563d73d49d8e11
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
