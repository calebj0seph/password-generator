const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const browserList = require('./browserlist');

const REPO_URL = 'https://github.com/calebj0seph/password-generator';
const BASE_URL = 'https://calebj0seph.github.io/password-generator';

module.exports = {
  entry: ['focus-visible', './src/index.jsx'],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  resolve: {
    alias: {
      static: path.resolve(__dirname, 'static/'),
      components: path.resolve(__dirname, 'src/components/'),
      util: path.resolve(__dirname, 'src/util/'),
      style: path.resolve(__dirname, 'src/style/'),
    },
    extensions: ['.wasm', '.mjs', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.worker\.(js|jsx)$/,
        exclude: /(node_modules|bower_components)/,
        use: [
          'worker-loader',
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/env', {
                  targets: {
                    browsers: browserList,
                  },
                }],
                '@babel/react',
              ],
            },
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/env', {
                targets: {
                  browsers: browserList,
                },
              }],
              '@babel/react',
            ],
          },
        },
      },
      {
        test: /\.svg$/,
        use: {
          loader: 'svg-react-loader',
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'src/index.html',
      templateParameters: {
        title: 'Password Generator',
        description: 'A highly configurable tool for generating cryptographically secure random passwords inside your browser.',
        repoUrl: REPO_URL,
        canonicalUrl: BASE_URL,
        openGraphImageUrl: `${BASE_URL}/static/og.jpg`,
      },
      minify: {
        collapseWhitespace: true,
      },
    }),
    new CopyWebpackPlugin([
      { from: 'static/*.jpg', to: './' },
    ]),
  ],
};
