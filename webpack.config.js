const path = require('path');
const webpack = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');


const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'notemine.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: '',
    library: {
      name: 'Notemine',
      type: 'umd',
    },
    globalObject: 'this',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.js', '.wasm'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.worker\.ts$/,
        type: 'asset/resource',
        generator: {
          filename: '[name].js',
        },
      },
      // {
      //   test: /\.worker\.ts$/,
      //   use: 'ts-loader',
      //   exclude: /node_modules/,
      //   options: {
      //     transpileOnly: true,
      //   },
      // },
      // {
      //   test: /\.worker\.ts$/,
      //   use: [
      //     {
      //       loader: 'worker-loader',
      //       options: {
      //         filename: 'mine.worker.js',
      //       },
      //     },
      //     'ts-loader',
      //   ],
      // },
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          'css-loader',
        ],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name][ext]',
        },
      },
    ],
  },
  experiments: {
    asyncWebAssembly: true,
    syncWebAssembly: true,
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'styles.css',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],
  externals: {
    // 'rxjs': 'rxjs',
    // 'nostr-tools': 'nostrTools',
  },
  devtool: isProduction ? 'source-map' : 'inline-source-map',
  mode: isProduction ? 'production' : 'development',
  target: 'web',
  optimization: {
    minimize: isProduction,
  }
};
