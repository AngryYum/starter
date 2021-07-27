const namberVersion = '2' //сколько ласт версий браузера поддерживать


const {src,dest,parallel,series,watch} = require('gulp')
const sync = require('browser-sync').create()
const sass = require('gulp-sass')(require('sass'))
const sourcemaps = require('gulp-sourcemaps')
const gcmq = require('gulp-group-css-media-queries')
const autoprefixer = require('gulp-autoprefixer')
const csso = require('gulp-csso')
const fileinclude = require('gulp-file-include')
const webpack = require('webpack-stream')
const del = require('del')
const svgmin = require('gulp-svgmin')
const cheerio = require('gulp-cheerio')
const svgSprite = require('gulp-svg-sprite')
const replace = require('gulp-replace')
const gulpif = require('gulp-if')

const isDev = process.argv.includes('--dev')
let webConfig = {
    output: {
        filename: 'main.js'
    },
    module: {
        rules: [{
                test: /\.m?js$/,
                exclude: /(node_modules|bower_components)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        "presets": ["@babel/preset-env"],
                        "plugins": [
                            ["@babel/transform-runtime"]
                        ]
                    }
                }
            },
            {
                test: /\.s[ac]ss$/i,
                use: [
                    "style-loader",
                    "css-loader",
                    "sass-loader",
                ],
            },
        ],

    },
    mode: isDev ? 'development' : 'production',
    devtool: isDev ? 'eval-source-map' : 'none'
}
const server = () => {
    sync.init({
        server: {
            baseDir: 'dest'
        },
        notify: false,
    })
}
const html = () => {
    return src('src/*.html')
        .pipe(fileinclude({
            prefix: '@@',
            basepath: '@file'
        }))
        .pipe(dest('dest'))
        .pipe(sync.stream())
}
const style = () => {
    return src('src/style/main.sass')
        .pipe(gulpif(isDev,sourcemaps.init()))
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            overrideBrowserslist: [`last ${namberVersion} versions`]
        }))
        .pipe(gcmq())
        .pipe(csso())
        .pipe(gulpif(isDev, sourcemaps.write()))
        .pipe(dest('dest/style'))
        .pipe(sync.stream())
}
const scripts = () => {
    return src('src/scripts/main.js')
        .pipe(webpack(webConfig))
        .pipe(dest('dest/scripts'))
        .pipe(sync.stream())
}
const fonts = () => {
    return src(['src/fonts/*.woff2' , 'src/fonts/*.woff'])
        .pipe(dest('dest/fonts/'))
        .pipe(sync.stream())
}
const remove = () => {
    return del('dest/*')
}
const svg = () => {
    return src('src/images/src/svg/*.svg')
        .pipe(svgmin({
            js2svg: {
                pretty: true
            }
        }))
        .pipe(cheerio({
            run: function ($) {
                $('[fill]').removeAttr('fill')
                $('[stroke]').removeAttr('stroke')
                $('[style]').removeAttr('style')
            },
            parserOptions: {
                xmlMode: true
            }
        }))
        .pipe(replace('&gt;', '>'))
        .pipe(svgSprite({
            mode: {
                symbol: {
                    sprite: "../sprite.svg"
                }
            }
        }))
        .pipe(dest('src/images/dest/svg/'))
        .pipe(sync.stream())
}
const exportImg = () => {
    return src('src/images/dest/**/*.*')
        .pipe(dest('dest/images/'))
        .pipe(sync.stream())
}
const startWatch = () => {
    watch(['src/**/*.sass', 'src/**/*.scss'], style)
    watch(['src/**/*.html' , 'src/*.html'], html)
    watch('src/**/*.js', scripts)
    watch('src/fonts/dest/*.woff2', fonts)
    watch('src/images/dest/**/*.**', exportImg)
}



exports.svg = svg
exports.exportImg = exportImg
exports.dev = series(remove , parallel(html, style, scripts, fonts, exportImg, server, startWatch))
exports.build = series(remove , parallel(html, style, scripts, fonts, exportImg))