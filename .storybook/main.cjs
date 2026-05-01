module.exports = {
    stories: ["../stories/**/*.stories.ts"],
    framework: {
        name: "@storybook/html-vite",
        options: {}
    },
    core: {
        renderer: "@storybook/html"
    },
    features: {
        storyStoreV7: false
    }
};
