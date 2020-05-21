/* eslint-env node */
/* eslint global-require: "off", max-lines: "off", import/no-dynamic-require: "off", max-len: "off", "compat/compat": "off" */

const fs = require('fs');

const realcwd = fs.realpathSync(process.cwd());
if (process.cwd() !== realcwd) process.chdir(realcwd);

const path = require('path');
const slash = require('slash');
const webpack = require('webpack');
const weblog = require('webpack-log');
const zopfli = require('@gfx/zopfli');

const logger = weblog({ name: 'webpack-config' });

const ENV = require('./app.env.js');
const APP = require('./app.config.js');
const UTILS = require('./webpack.utils.js');

ENV.SITEMAP = ENV.SITEMAP.map((i) => Object.assign(i, {
    path: path.posix.join(APP.PUBLIC_PATH, i.url, 'index.html'),
}));

if (ENV.STANDALONE) {
    logger.info(`Name: ${ENV.PACKAGE_NAME}`);
    logger.info(`Enviroment: ${ENV.NODE_ENV}`);
    logger.info(`Debug: ${ENV.DEBUG ? 'enabled' : 'disabled'}`);
    logger.info(`Config: ${JSON.stringify(APP, null, '    ')}`);
}

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('./plugin.html.js');
const WebpackNotifierPlugin = require('webpack-notifier');
const ImageminPlugin = require('imagemin-webpack');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const BrowserSyncPlugin = (ENV.WATCH ? require('browser-sync-webpack-plugin') : () => {});
const StyleLintPlugin = (ENV.USE_LINTERS ? require('stylelint-webpack-plugin') : () => {});
const CompressionPlugin = (ENV.PROD && !ENV.DEBUG ? require('compression-webpack-plugin') : () => {});
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const UglifyJsPlugin = (ENV.PROD && !ENV.DEBUG ? require('uglifyjs-webpack-plugin') : () => {});
const { default: EagerImportsPlugin } = require('eager-imports-webpack-plugin');
const SpriteLoaderPlugin = require('./plugin.svg-sprite.js');

const FaviconsPlugin = (APP.USE_FAVICONS ? require('./plugin.favicons.js') : () => {});
const HtmlBeautifyPlugin = (APP.HTML_PRETTY ? require('html-beautify-webpack-plugin') : () => {});
const BabelConfig = require('./babel.config.js');

const BANNER_STRING = [
    `ENV.NODE_ENV=${ENV.NODE_ENV} | ENV.DEBUG=${ENV.DEBUG}`,
    fs.readFileSync(path.join(ENV.SOURCE_PATH, 'humans.txt')),
].join('\n');

module.exports = {
    watchOptions: {
        ignored: /node_modules/,
    },

    devServer: {
        compress: false,
        contentBase: path.resolve(__dirname, 'source'),
        overlay: { warnings: false, errors: true },
        publicPath: path.posix.resolve(APP.PUBLIC_PATH, '/'),
        watchContentBase: true,
    },

    entry: {
        app: [
            // `${ENV.SOURCE_PATH}/js/polyfills.js`, // this always first
            `${ENV.SOURCE_PATH}/css/app.scss`,
            `${ENV.SOURCE_PATH}/js/app.js`,
        ],
    },

    output: {
        filename: 'js/[name].min.js',
        chunkFilename: 'js/[name].min.js',
        path: ENV.OUTPUT_PATH,
        publicPath: APP.PUBLIC_PATH,
        hashFunction: 'md5',
    },

    optimization: {
        ...(!ENV.PROD || ENV.DEBUG
            ? {
                namedChunks: true,
                namedModules: true,
                chunkIds: 'named',
                moduleIds: 'named',
            }
            : {}),
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /(node_modules)(.+)\.(js|mjs|cjs)(\?.*)?$/,
                    chunks: 'initial',
                    name: 'vendor',
                    enforce: true,
                },
            },
        },
        minimizer:
            ENV.PROD && !ENV.DEBUG
                ? [
                    new UglifyJsPlugin({
                        cache: !ENV.DEBUG,
                        test: /\.(js)(\?.*)?$/i,
                        parallel: true,
                        sourceMap: true,
                        extractComments: {
                            condition: 'some',
                            filename: (file) => `${file}.LICENSE`,
                            banner: (file) => [`License information can be found in ${file}`, BANNER_STRING].join('\n'),
                        },
                        uglifyOptions: {
                            output: {
                                comments: false,
                            },
                        },
                    }),
                ]
                : [],
    },

    performance:
        ENV.PROD && !ENV.DEBUG
            ? {
                assetFilter: (asset) => {
                    const [filename] = asset.split('?', 2);
                    const ignore = /(\.(css|js)\.map|\.LICENSE|\.eot|\.ttf|manifest\.json|@resize-.+|favicon|workbox)$/;
                    return !ignore.test(filename);
                },
                hints: 'warning',
                maxAssetSize: Number.MAX_SAFE_INTEGER,
                maxEntrypointSize: 512 * 1024,
            }
            : false,

    plugins: [
        ...(ENV.WATCH ? [new BrowserSyncPlugin()] : []),
        new CleanWebpackPlugin({
            cleanOnceBeforeBuildPatterns: ENV.WATCH || ENV.DEV_SERVER ? [] : ['**/*', '!.gitkeep', '!.htaccess'],
            cleanAfterEveryBuildPatterns: ['**/*.br', '**/*.gz'],
        }),
        new MiniCssExtractPlugin({
            filename: 'css/app.min.css',
            allChunks: true,
        }),
        new CopyWebpackPlugin(
            [
                ...['**/.htaccess', 'img/**/*.*', '*.txt', '*.php', 'static/**/*.*'].map((from) => ({
                    from,
                    to: ENV.OUTPUT_PATH,
                    context: ENV.SOURCE_PATH,
                    ignore: ENV.SITEMAP.map((i) => i.template),
                })),
            ],
            {
                copyUnmodified: !(ENV.PROD || ENV.DEBUG),
                debug: ENV.DEBUG ? 'debug' : 'info',
                force: true,
            },
        ),
        new EagerImportsPlugin(),
        ...(ENV.PROD && !ENV.DEBUG
            ? [
                new CaseSensitivePathsPlugin(),
                new webpack.NoEmitOnErrorsPlugin(),
                new CompressionPlugin({
                    test: /\.(js|css|json|lottie)(\?.*)?$/i,
                    filename: '[path].br[query]',
                    compressionOptions: {
                        level: 11,
                    },
                    algorithm: 'brotliCompress',
                }),
                new CompressionPlugin({
                    test: /\.(js|css|json|lottie)(\?.*)?$/i,
                    filename: '[path].gz[query]',
                    compressionOptions: {
                        numiterations: 15,
                    },
                    algorithm: zopfli.gzip,
                }),
            ]
            : []),
        new webpack.BannerPlugin({
            banner: BANNER_STRING,
            include: /\.(css|js)(\?.*)?$/i,
        }),
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.$': 'jquery',
            'window.jQuery': 'jquery',
        }),
        new webpack.DefinePlugin({
            DEBUG: JSON.stringify(ENV.DEBUG),
            NODE_ENV: JSON.stringify(ENV.NODE_ENV),
            PACKAGE_NAME: JSON.stringify(ENV.PACKAGE_NAME),
            ...Object.assign(
                {},
                ...Object.entries(APP).map(([k, v]) => ({
                    [`APP.${k}`]: JSON.stringify(v),
                })),
            ),
        }),
        new WebpackNotifierPlugin({
            alwaysNotify: true,
            contentImage: path.resolve('./.favicons-source-1024x1024.png'),
            title: APP.TITLE,
        }),
        ...(ENV.USE_LINTERS
            ? [
                new StyleLintPlugin({
                    syntax: 'scss',
                    files: '**/*.scss',
                    configFile: './.stylelintrc.json',
                    ignorePath: './.stylelintignore',
                    emitErrors: false,
                    failOnError: false,
                    lintDirtyModulesOnly: ENV.DEV_SERVER || ENV.WATCH,
                    fix: !ENV.DEV_SERVER,
                }),
            ]
            : []),
        ...(APP.USE_FAVICONS
            ? [
                new FaviconsPlugin.AppIcon({
                    logo: path.join(__dirname, '.favicons-source-1024x1024.png'),
                    publicPath: APP.PUBLIC_PATH,
                    outputPath: 'img/favicons',
                    prefix: 'img/favicons',
                }),
                new FaviconsPlugin.FavIcon({
                    logo: path.join(__dirname, '.favicons-source-64x64.png'),
                    publicPath: APP.PUBLIC_PATH,
                    outputPath: 'img/favicons',
                    prefix: 'img/favicons',
                }),
            ]
            : []),
        ...ENV.SITEMAP.map(
            ({ template, filename }) => new HtmlWebpackPlugin({
                filename,
                template,
                inject: !path.basename(template).startsWith('_'),
                minify:
                        ENV.PROD || ENV.DEBUG
                            ? {
                                html5: true,
                                collapseBooleanAttributes: true,
                                collapseWhitespace: false,
                                conservativeCollapse: false,
                                removeComments: !APP.HTML_PRETTY,
                                decodeEntities: !APP.HTML_PRETTY,
                                minifyCSS: !APP.HTML_PRETTY,
                                minifyJS: !APP.HTML_PRETTY,
                                removeStyleLinkTypeAttributes: true,
                                removeScriptTypeAttributes: true,
                            }
                            : false,
                hash: ENV.PROD || ENV.DEBUG,
                cache: !ENV.DEBUG,
                title: APP.TITLE,
            }),
        ),
        ...(APP.HTML_PRETTY
            ? [
                new HtmlBeautifyPlugin({
                    config: {
                        html: {
                            ocd: false,
                            unformatted: ['code', 'pre', 'textarea'],
                            indent_inner_html: false,
                            indent_char: ' ',
                            indent_size: 4,
                            wrap_line_length: Number.MAX_SAFE_INTEGER,
                            preserve_newlines: true,
                            max_preserve_newlines: 1,
                            sep: '\n',
                        },
                    },
                }),
            ]
            : []),
        new SpriteLoaderPlugin({
            plainSprite: true,
        }),
        ...(ENV.PROD || ENV.DEBUG
            ? [
                new ImageminPlugin({
                    test: /\.(jpeg|jpg|png|gif|svg)(\?.*)?$/i,
                    exclude: /(fonts|font|svg-sprite)/i,
                    name: UTILS.resourceName('img'),
                    imageminOptions: require('./imagemin.config.js'),
                    cache: !ENV.DEBUG,
                    loader: true,
                }),
                new BundleAnalyzerPlugin({
                    analyzerMode: ENV.DEV_SERVER ? 'server' : 'static',
                    openAnalyzer: ENV.DEV_SERVER,
                    reportFilename: path.join(
                        __dirname,
                        'node_modules',
                        '.cache',
                        `bundle-analyzer-${ENV.NODE_ENV}.html`,
                    ),
                }),
            ]
            : []),
    ],

    devtool: ENV.USE_SOURCE_MAP ? 'eval-source-map' : 'nosources-source-map',

    resolve: require('./resolve.config.js').resolve,

    module: {
        rules: [
            // html loaders
            {
                test: /\.(html)(\?.*)?$/i,
                loader: './loader.html.js',
                options: {
                    context: APP,
                    searchPath: ENV.SOURCE_PATH,
                },
            },
            // javascript loaders
            {
                test: require.resolve('jquery'),
                use: [
                    {
                        loader: 'expose-loader',
                        options: 'jQuery',
                    },
                    {
                        loader: 'expose-loader',
                        options: '$',
                    },
                ],
            },
            ...(ENV.USE_LINTERS
                ? [
                    {
                        enforce: 'pre',
                        test: /\.(js|mjs|cjs)(\?.*)?$/i,
                        exclude: [path.join(__dirname, 'node_modules'), path.join(ENV.SOURCE_PATH, 'js', 'external')],
                        loader: 'eslint-loader',
                        options: {
                            fix: true,
                            quiet: ENV.PROD,
                            emitError: false,
                            emitWarning: false,
                        },
                    },
                ]
                : []),
            {
                type: 'javascript/auto',
                test: /\.(js|mjs|cjs)(\?.*)?$/i,
                exclude: {
                    test: [
                        // disable babel transform
                        ...BabelConfig.excludeTransform,
                    ],
                    exclude: [
                        // enable babel transform
                        ...BabelConfig.includeTransform,
                    ],
                },
                loaders: [
                    {
                        // global jQuery import
                        loader: 'imports-loader',
                        options: {
                            $: 'jquery',
                            jQuery: 'jquery',
                        },
                    },
                    {
                        loader: 'babel-loader',
                        options: {
                            babelrc: false,
                            configFile: false,
                            envName: ENV.NODE_ENV,
                            ...BabelConfig.options,
                        },
                    },
                ],
            },
            // image loaders
            {
                test: /\.(svg)(\?.*)?$/i,
                issuer: /\.(html)(\?.*)?$/i,
                include: /(partials)/i,
                exclude: /(fonts|font|svg-sprite)/i,
                loader: './loader.svgo.js',
            },
            {
                test: /\.(jpeg|jpg|png|gif|svg)(\?.*)?$/i,
                exclude: /(fonts|font|partials|svg-sprite)/i,
                oneOf: [
                    {
                        exclude: /\.(svg)$/i,
                        resourceQuery: /[&?]resize=.+/,
                        loader: './loader.resize.js',
                        options: { name: UTILS.resourceName('img'), limit: 32 * 1024, esModule: false },
                    },
                    {
                        resourceQuery: /[&?]inline=inline/,
                        loader: 'url-loader',
                        options: { name: UTILS.resourceName('img'), limit: 32 * 1024, esModule: false },
                    },
                    {
                        loader: 'file-loader',
                        options: { name: UTILS.resourceName('img'), esModule: false },
                    },
                ],
            },
            {
                test: /\.svg$/,
                include: /(svg-sprite)/i,
                exclude: /(fonts|font|partials)/i,
                loader: 'svg-sprite-loader',
                options: {
                    extract: true,
                    spriteFilename: 'img/svg-sprite.svg',
                    symbolId: (filePath) => {
                        const spriteDir = path.join(ENV.SOURCE_PATH, 'img/svg-sprite');
                        const relativePath = slash(path.relative(spriteDir, path.normalize(filePath)));
                        const symbolId = path.basename(relativePath, '.svg').replace(path.posix.sep, '-');
                        return `svg-sprite-${symbolId}`;
                    },
                },
            },
            // font loaders
            {
                test: /\.(eot|woff|woff2|ttf|svg)(\?.*)?$/i,
                exclude: /(img|images|partials|svg-sprite)/i,
                loader: 'file-loader',
                options: { name: UTILS.resourceName('fonts'), esModule: false },
            },
            // css loaders
            {
                test: /\.(css|scss)(\?.*)?$/i,
                loaders: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            hmr: ENV.DEV_SERVER,
                            publicPath: '../',
                        },
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 2,
                            sourceMap: ENV.USE_SOURCE_MAP,
                        },
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            ident: 'postcss',
                            sourceMap: ENV.USE_SOURCE_MAP,
                            config: { path: './postcss.config.js' },
                        },
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            prependData: UTILS.toScssVars({
                                DEBUG: ENV.DEBUG,
                                NODE_ENV: ENV.NODE_ENV,
                                PACKAGE_NAME: ENV.PACKAGE_NAME,
                                ...Object.assign(
                                    {},
                                    ...Object.entries(APP).map(([k, v]) => ({
                                        [`APP-${k}`]: v,
                                    })),
                                ),
                            }),
                            sourceMap: ENV.USE_SOURCE_MAP,
                            sassOptions: {
                                indentWidth: 4,
                                outputStyle: 'expanded',
                                sourceMapEmbed: ENV.USE_SOURCE_MAP,
                                sourceComments: ENV.USE_SOURCE_MAP,
                            },
                        },
                    },
                ],
            },
        ],
    },
};
