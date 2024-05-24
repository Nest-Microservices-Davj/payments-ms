import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
  PORT: number;

  STRIPE_API_KEY: string;
}

const envsSchema = joi
  .object({
    PORT: joi.number().required(),
    STRIPE_API_KEY: joi.string().required(),
  })
  .unknown(true);

const { error, value } = envsSchema.validate({
  ...process.env,
});

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
  port: envVars.PORT,
  stripeApiKey: envVars.STRIPE_API_KEY,
};
