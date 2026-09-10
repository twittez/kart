module.exports = {
  apps: [
    {
      name: "kart-loja",
      script: ".output/server/index.mjs",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3009,
        NITRO_PORT: 3009,
        HOST: "127.0.0.1",
        NITRO_HOST: "127.0.0.1",
      },
      max_memory_restart: "400M",
      restart_delay: 2000,
      autorestart: true,
    },
  ],
};
