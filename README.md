# Life Engine JavaScript SDK

## Development

You will need:

 - Node.js
 - Gulp available globally `npm install -g gulp-cli`
 - To install the dependencies `npm install` or `yarn`

Run `gulp` to build the library and watch for changes.


## Testing

Copy `test.config.example.js` to `test.config.js`, edit to fit your environment
and open up `test.html` in a browser.


## Releases

(This doesn't happen often so it's easy to forget)

1. Update new version number in package.json
2. Commit a new tag pointing to the correct revision
3. `npm publish`
