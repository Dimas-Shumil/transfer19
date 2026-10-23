module.exports = {
  apps: [
    {
      name: "transfer19",
      script: "./server.js",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "350M",
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: 3000,
        TRUST_PROXY: "1"
      }
    }
  ]
};
