let gulp = require('gulp');
let gutil = require('gulp-util');
let webpack = require('webpack');
let webpackConfig = require('./webpack.config.js');

gulp.task('webpack', function (callback) {
    webpack(webpackConfig, function (err, stats) {
        if (err) {
            throw new gutil.PluginError('webpack', err);
        }

        gutil.log('[webpack] Completed\n' + stats.toString({
                assets: true,
                chunks: false,
                chunkModules: false,
                colors: true,
                hash: false,
                timings: false,
                version: false
            }));

        callback();
    });
});

let defaultTasks = ['webpack'];
gulp.task('release', defaultTasks);

gulp.task('default', defaultTasks, function () {
    gulp.watch(["src/**/*.ts"], defaultTasks);
});
