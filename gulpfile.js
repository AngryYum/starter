const namberVersion = '2' //сколько ласт версий браузера поддерживать


const {src,dest,parallel,series,watch} = require('gulp')
const sync = require('browser-sync').create()
const sass = require('gulp-sass')
const sourcemaps = require('gulp-sourcemaps')
const gcmq = require('gulp-group-css-media-queries')
const autoprefixer = require('gulp-autoprefixer')
const csso = require('gulp-csso')
const fileinclude = require('gulp-file-include')
const webpack = require('webpack-stream')
const ttf2woff2 = require('gulp-ttf2woff2')
const del = require('del')
const svgmin = require('gulp-svgmin')
const cheerio = require('gulp-cheerio')
const svgSprite = require('gulp-svg-sprite')
const replace = require('gulp-replace')
const webp = require('gulp-webp')
const imagemin = require('gulp-imagemin')
const smartgrid =  require('smart-grid')
const gulpif = require('gulp-if')

const isDev = process.argv.includes('--dev')
const isProd = !isDev
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
const woff2 = () => {
    return src('src/fonts/src/*.*')
        .pipe(ttf2woff2())
        .pipe(dest('src/fonts/dest/'))
}
const fonts = () => {
    return src(['src/fonts/dest/*.woff2' , 'src/fonts/dest/*.woff'])
        .pipe(dest('dest/fonts/'))
        .pipe(sync.stream())
}
const remove = () => {
    return del('dest/*')
}
const svg = () => {
    return src('src/imges/src/svg/*.svg')
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
        .pipe(dest('src/imges/dest/svg/'))
        .pipe(sync.stream())
}
const toWebp = () => {
    return src('src/imges/src/toWebp/**/*.*')
        .pipe(webp())
        .pipe(dest('src/imges/src/toWebp'))
}
const img = () => {
    return src('src/imges/src/**/*.*')
        .pipe(imagemin([
            imagemin.mozjpeg({
                quality: 75,
                progressive: true
            }),
            imagemin.optipng({
                optimizationLevel: 5
            }),
        ]))
        .pipe(dest('src/imges/dest/imges/'))
}
const exportImg = () => {
    return src('src/imges/dest/**/*.*')
        .pipe(dest('dest/imges/'))
        .pipe(sync.stream())
}
const startWatch = () => {
    watch(['src/**/*.sass', 'src/**/*.scss'], style)
    watch(['src/**/*.html' , 'src/*.html'], html)
    watch('src/**/*.js', scripts)
    watch('src/fonts/dest/*.woff2', fonts)
    watch('src/imges/dest/**/*.**', exportImg)
    watch('./smartgrid.js' , grid)
}

const grid = done => {
    delete require.cache[require.resolve('./smartgrid.js')]
    let settings = require('./smartgrid.js')
    smartgrid('./src/style/libs' , settings)
    done()
};



exports.woff2 = woff2
exports.svg = svg
exports.toWebp = toWebp
exports.img = img
exports.exportImg = exportImg
exports.grid = grid
exports.dev = series(remove , parallel(html, style, scripts, fonts, exportImg, server, startWatch))
exports.build = series(remove , parallel(html, style, scripts, fonts, exportImg))