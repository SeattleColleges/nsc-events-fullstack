module.exports = {
  'nsc-events-nestjs/**/*.{ts,js}': (filenames) => [
    'npm run lint --prefix nsc-events-nestjs -- --fix',
  ],
  'nsc-events-nextjs/**/*.{ts,tsx,js,jsx}': (filenames) => [
    'npm run lint --prefix nsc-events-nextjs',
  ],
};