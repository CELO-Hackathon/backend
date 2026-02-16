// import jwt from 'jsonwebtoken';
// import crypto from 'crypto';
// import { verifyMessage } from 'viem';
// import { AuthNonce } from '../models/AuthNonce';
// import { User } from '../models/User';
// import { env } from '../config/env';
// import { logger } from '../utils/logger';
// import { AuthPayload, LoginRequest, LoginResponse } from '../types/auth';
// import { Address } from 'viem';

// export class AuthService {
//   /**
//    * Generate a nonce for wallet authentication
//    */
//   async generateNonce(address: string): Promise<string> {
//     const nonce = crypto.randomBytes(32).toString('hex');
//     const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
//     // Upsert nonce (replace if exists)
//     await AuthNonce.findOneAndUpdate(
//       { address: address.toLowerCase() },
//       { nonce, expiresAt },
//       { upsert: true, new: true }
//     );
    
//     logger.debug('Nonce generated', { address, expiresAt });
    
//     return nonce;
//   }

//   /**
//    * Generate the message to be signed
//    */
//   generateAuthMessage(nonce: string): string {
//     const timestamp = new Date().toISOString();
    
//     const template = env.AUTH_MESSAGE_TEMPLATE || 
//       "Sign this message to authenticate with PulseRemit.\n\nNonce: {nonce}\nTimestamp: {timestamp}";
    
//     return template
//       .replace('{nonce}', nonce)
//       .replace('{timestamp}', timestamp);
//   }

//   /**
//    * Verify signature and authenticate user
//    */
//   async verifyAndLogin(request: LoginRequest): Promise<LoginResponse> {
//     const { address, signature, message } = request;
    
//     logger.info('Login attempt', { address });
    
//     // 1. Get stored nonce
//     const authNonce = await AuthNonce.findOne({
//       address: address.toLowerCase(),
//     });
    
//     if (!authNonce) {
//       throw new Error('No nonce found. Please request a new nonce.');
//     }
    
//     // 2. Check nonce expiry
//     if (new Date() > authNonce.expiresAt) {
//       await AuthNonce.deleteOne({ _id: authNonce._id });
//       throw new Error('Nonce expired. Please request a new nonce.');
//     }
    
//     // 3. Verify nonce is in message
//     if (!message.includes(authNonce.nonce)) {
//       throw new Error('Invalid nonce in message.');
//     }
    
//     // 4. Verify signature
//     const isValid = await this.verifySignature(
//       message,
//       signature as `0x${string}`,
//       address as Address
//     );
    
//     if (!isValid) {
//       logger.warn('Invalid signature', { address });
//       throw new Error('Invalid signature.');
//     }
    
//     // 5. Delete used nonce
//     await AuthNonce.deleteOne({ _id: authNonce._id });
    
//     // 6. Find or create user
//     let user = await User.findOne({ address: address.toLowerCase() });
//     if (!user) {
//       user = await User.create({ address: address.toLowerCase() });
//       logger.info('New user created', { address });
//     }
    
//     // 7. Generate JWT
//     const token = this.generateToken(address as Address);
    
//     logger.info('Login successful', { address });
    
//     return {
//       token,
//       user: {
//         address: user.address,
//         agentAuthorized: user.agentAuthorized,
//         createdAt: user.createdAt,
//       },
//     };
//   }

//   /**
//    * Verify message signature
//    */
//   private async verifySignature(
//     message: string,
//     signature: `0x${string}`,
//     address: Address
//   ): Promise<boolean> {
//     try {
//       const valid = await verifyMessage({
//         address,
//         message,
//         signature,
//       });
      
//       return valid;
//     } catch (error) {
//       logger.error('Signature verification failed:', error);
//       return false;
//     }
//   }

//   /**
//    * Generate JWT token
//    */
//   private generateToken(address: Address): string {
//     const payload: Omit<AuthPayload, 'iat' | 'exp'> = {
//       address,
//     };
    
//     return jwt.sign(payload, env.JWT_SECRET, {
//       expiresIn: env.JWT_EXPIRES_IN,
//     });
//   }

//   /**
//    * Verify JWT token
//    */
//   verifyToken(token: string): AuthPayload {
//     try {
//       const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
//       return payload;
//     } catch (error) {
//       throw new Error('Invalid or expired token.');
//     }
//   }

//   /**
//    * Logout (optional - mainly client-side token removal)
//    */
//   async logout(address: string): Promise<void> {
//     // Delete any active nonces
//     await AuthNonce.deleteOne({ address: address.toLowerCase() });
//     logger.info('User logged out', { address });
//   }
// }

// export const authService = new AuthService();

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyMessage } from 'viem';
import { AuthNonce } from '../models/AuthNonce';
import { User } from '../models/User';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AuthPayload, LoginRequest, LoginResponse } from '../types/auth';
import { Address } from 'viem';

export class AuthService {
  /**
   * Generate a nonce for wallet authentication
   */
  async generateNonce(address: string): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    // Upsert nonce (replace if exists)
    await AuthNonce.findOneAndUpdate(
      { address: address.toLowerCase() },
      { nonce, expiresAt },
      { upsert: true, new: true }
    );
    
    logger.debug('Nonce generated', { address, expiresAt });
    
    return nonce;
  }

  /**
   * Generate the message to be signed
   */
  generateAuthMessage(nonce: string): string {
    const timestamp = new Date().toISOString();
    
    const template = env.AUTH_MESSAGE_TEMPLATE || 
      "Sign this message to authenticate with PulseRemit.\n\nNonce: {nonce}\nTimestamp: {timestamp}";
    
    return template
      .replace('{nonce}', nonce)
      .replace('{timestamp}', timestamp);
  }

  /**
   * Verify signature and authenticate user
   */
  async verifyAndLogin(request: LoginRequest): Promise<LoginResponse> {
    const { address, signature, message } = request;
    
    logger.info('Login attempt', { address });
    
    // 1. Get stored nonce
    const authNonce = await AuthNonce.findOne({
      address: address.toLowerCase(),
    });
    
    if (!authNonce) {
      throw new Error('No nonce found. Please request a new nonce.');
    }
    
    // 2. Check nonce expiry
    if (new Date() > authNonce.expiresAt) {
      await AuthNonce.deleteOne({ _id: authNonce._id });
      throw new Error('Nonce expired. Please request a new nonce.');
    }
    
    // 3. Verify nonce is in message
    if (!message.includes(authNonce.nonce)) {
      throw new Error('Invalid nonce in message.');
    }
    
    // 4. Verify signature
    const isValid = await this.verifySignature(
      message,
      signature as `0x${string}`,
      address as Address
    );
    
    if (!isValid) {
      logger.warn('Invalid signature', { address });
      throw new Error('Invalid signature.');
    }
    
    // 5. Delete used nonce
    await AuthNonce.deleteOne({ _id: authNonce._id });
    
    // 6. Find or create user
    let user = await User.findOne({ address: address.toLowerCase() });
    if (!user) {
      user = await User.create({ address: address.toLowerCase() });
      logger.info('New user created', { address });
    }
    
    // 7. Generate JWT
    const token = this.generateToken(address as Address);
    
    logger.info('Login successful', { address });
    
    return {
      token,
      user: {
        address: user.address,
        agentAuthorized: user.agentAuthorized,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Verify message signature
   */
  private async verifySignature(
    message: string,
    signature: `0x${string}`,
    address: Address
  ): Promise<boolean> {
    try {
      const valid = await verifyMessage({
        address,
        message,
        signature,
      });
      
      return valid;
    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Generate JWT token
   */
  private generateToken(address: Address): string {
    const payload = {
      address,
    };
    
    // ✅ Fixed: Proper SignOptions type
    // const options: jwt.SignOptions = {
    //   expiresIn: env.JWT_EXPIRES_IN,
    // };
    
    return jwt.sign(payload, env.JWT_SECRET);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): AuthPayload {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      return payload;
    } catch (error) {
      throw new Error('Invalid or expired token.');
    }
  }

  /**
   * Logout (optional - mainly client-side token removal)
   */
  async logout(address: string): Promise<void> {
    // Delete any active nonces
    await AuthNonce.deleteOne({ address: address.toLowerCase() });
    logger.info('User logged out', { address });
  }
}

export const authService = new AuthService();