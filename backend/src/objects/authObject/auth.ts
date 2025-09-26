/**
 * auth.ts
 * 
 * This file centeralizes the Firebase token verification logic.
 * it exports a hono middleware function that can be applied to any hono
 * route to ensure the request comes form an authorized user.
 * 
 */

import { verifyFirebaseAuth } from '@hono/firebase-auth';
import type { MiddlewareHandler } from 'hono';

//binding auth enviorment
interface AuthenticationEnv {
    Bindings:{
        FIREBASE_PROJECT_ID: string;
        PUBLIC_KEYS_CACHE: KVNamespace;
    }
}

/**
 * Creates and returns firebase authentication middleware.
 * it initalizes the verifier with the necessary project ID from ENV secretss
 * 
 * Nick 9/26 - Method Created
 * 
 * *@returns A Hono Middleware function 
 *
 */

export function firebaseAuthMiddleware(): MiddlewareHandler<AuthenticationEnv> {
    return async (c, next) => {
        const verifier = verifyFirebaseAuth({
        projectId: c.env.FIREBASE_PROJECT_ID,

        // this method will look for and use a kv namespace
        // binding named PUBLIC_KEYS_CACHE for cached public keys.
    });
    return await verifier(c, next)
    };
};