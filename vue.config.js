module.exports = {
  lintOnSave: false,
  devServer: {
    proxy: {
        "/api": {
          target: "https://localhost:3080",
          changeOrigin: true,
        },
        "/ws": {
          target: "https://localhost:3080",
          changeOrigin: true,
	  ws: true
        }
    },
  }
}
