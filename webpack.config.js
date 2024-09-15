// webpack.config.js
const path = require('path');

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist/bundle'),
    clean: true, 
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: true, // Skips type checking
          },
        },
        exclude: /node_modules/,
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
      },

    ],
  },
  experiments: {
    asyncWebAssembly: true, 
  },
  devtool: 'source-map',
  devServer: {
    static: './dist',
    hot: true,
    port: 3000,
  },
};
