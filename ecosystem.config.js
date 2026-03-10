module.exports = {
  apps: [
    {
      name: 'llm-ui',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
      }
    }
  ]
};
