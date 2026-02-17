import jwt, { SignOptions } from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';

export interface TokenPayload {
  id: number;
  role: 'user' | 'driver' | 'super_admin' | 'admin' | 'operator';
  [key: string]: any;
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = jwtConfig.secret as jwt.Secret;
  const options: SignOptions = { expiresIn: jwtConfig.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, secret, options);
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, jwtConfig.secret) as TokenPayload;
};

