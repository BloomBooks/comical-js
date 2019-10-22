const merge = require("webpack-merge");
const common = require("./webpack.common.js");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = merge(common, {
    mode: "production",
    devtool: "source-map",
    output: {filename: "[name].min.js", sourceMapFilename: "[file].map" },

    optimization: {
        minimize: true,
        minimizer: [new TerserPlugin({
            sourceMap: true
        })]
    }
});
