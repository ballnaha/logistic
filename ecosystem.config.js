module.exports = {
  apps: [
    {
      name: "logistic",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3002",
      cwd: "C:/laragon/www/logistic",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};