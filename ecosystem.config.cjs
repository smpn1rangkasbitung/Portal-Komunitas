module.exports = {
  apps: [
    {
      name: 'portal-komunitas',
      // Menggunakan tsx untuk mengeksekusi TypeScript server.ts secara langsung di server
      script: 'node_modules/.bin/tsx',
      args: 'server.ts',
      cwd: './',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      // Direktori log
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true,
    },
  ],
};
