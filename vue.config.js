module.exports = {
  lintOnSave: false,
  devServer: {
    disableHostCheck: true,
    proxy: {
        "/api": {
          target: "https://localhost:3080",
          changeOrigin: true,
        },
        "/ws": {
          target: "https://localhost:3080",
          changeOrigin: true,
        }
    },
  }
}
