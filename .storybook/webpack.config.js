const path = require("path");

module.exports = ({ config }) => {
    config.module.rules.push({
        test: /\.(ts|tsx)$/,
        use: [
            {
                loader: require.resolve("ts-loader"),
                options: {
                    transpileOnly: true,
                    configFile: path.resolve(__dirname, "../tsconfig.storybook.json")
                }
            }
        ]
    });
    config.resolve.extensions.push(".ts", ".tsx"); // not yet using react, but just in case...
    return config;
};
