# Life Engine JavaScript SDK



## Temporary workarounds for problems

Until Zalando fixes their NPM repository, you need to download the `.d.ts`
file for the `oauth2-client-js` library and copy it to
`node_modules/@zalando/oauth2-client-js/index.d.ts`.

Download the file from https://github.com/zalando/oauth2-client-js/blob/master/index.d.ts


# Development

You will need:

 - Node.js
 - Gulp available globally `npm install -g gulp-cli`
 - To install the dependencies `npm install` or `yarn`

Run `gulp` to build the library and watch for changes.


