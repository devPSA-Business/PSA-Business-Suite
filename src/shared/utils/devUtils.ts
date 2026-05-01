export const isDevEnvironment = () => process.env.NODE_ENV !== 'production';

export const isAuthorizedDev = (email?: string | null) => {
  return isDevEnvironment() && email === 'dev.psajewelry@gmail.com';
};
