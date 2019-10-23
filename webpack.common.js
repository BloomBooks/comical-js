var path = require("path");
var webpack = require("webpack");
var node_modules = path.resolve(__dirname, "node_modules");

var globule = require("globule");
const CopyPlugin = require("copy-webpack-plugin");
var outputDir = "dist";

// From Bloom's webpack, it seems this is needed
// if ever our output directory does not have the same parent as our node_modules. We then
// need to resolve the babel related presets (and plugins).  This mapping function was
// suggested at https://github.com/babel/babel-loader/issues/166.
// Since our node_modules DOES have the same parent, maybe we could do without it?
function localResolve(preset) {
  return Array.isArray(preset)
    ? [require.resolve(preset[0]), preset[1]]
    : require.resolve(preset);
}

module.exports = {
  // mode must be set to either "production" or "development" in webpack 4.
  // Webpack-common is intended to be 'required' by something that provides that.
  context: __dirname,
  entry: {
    index: "./src/index.ts"
  },

  output: {
    path: path.join(__dirname, outputDir),
    filename: "[name].js",
    library: "ComicalJS",
    libraryTarget: "umd"
  },

  resolve: {
    modules: [".", node_modules],
    extensions: [".js", ".jsx", ".ts", ".tsx"]
  },

  optimization: {
    minimize: false,
    namedModules: true,
    splitChunks: {
      cacheGroups: {
        default: false
      }
    }
  },
  module: {
    rules: [
      {
        test: /\.ts(x?)$/,
        use: [{ loader: "ts-loader" }]
      },
      {
        test: /\.less$/i,
        use: [
          {
            loader: "style-loader" // creates style nodes from JS strings
          },
          {
            loader: "css-loader" // translates CSS into CommonJS
          },
          {
            loader: "less-loader" // compiles Less to CSS
          }
        ]
      },
      {
        test: /\.css$/,
        loader: "style-loader!css-loader"
      },
      // WOFF Font--needed?
      {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        use: {
          loader: "url-loader",
          options: {
            limit: 10000,
            mimetype: "application/font-woff"
          }
        }
      },
      {
        // this allows things like background-image: url("myComponentsButton.svg") and have the resulting path look for the svg in the stylesheet's folder
        // the last few seem to be needed for (at least) slick-carousel to build.
        test: /\.(svg|jpg|png|ttf|eot|gif)$/,
        use: {
          loader: "file-loader"
        }
      }
    ]
  }
};
