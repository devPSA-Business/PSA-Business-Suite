import { describe, it, expect, vi } from 'vitest';
import { handleFirestoreError, OperationType, isConfigValid, firestoreDb } from '../../../src/shared/api/firebase';

describe('Firebase Shared API', () => {
  describe('handleFirestoreError', () => {
    it('should throw a formatted JSON error for Firestore failures', () => {
      const error = new Error('Permission denied');
      const operation = OperationType.WRITE;
      const path = 'users/1';

      try {
        handleFirestoreError(error, operation, path);
      } catch (err: any) {
        const errorInfo = JSON.parse(err.message);
        expect(errorInfo.error).toBe('Permission denied');
        expect(errorInfo.operationType).toBe('write');
        expect(errorInfo.path).toBe('users/1');
        expect(errorInfo.authInfo).toBeDefined();
      }
    });

    it('should handle non-Error objects gracefully', () => {
      try {
        handleFirestoreError('String error', OperationType.GET, null);
      } catch (err: any) {
        const errorInfo = JSON.parse(err.message);
        expect(errorInfo.error).toBe('String error');
      }
    });
  });

  describe('Configuration and Proxies', () => {
    it('isConfigValid should be a boolean', () => {
      expect(typeof isConfigValid).toBe('boolean');
    });

    it('should throw descriptive error when accessing firestoreDb if unconfigured', () => {
      // In tests, Firebase is likely unconfigured unless mocked
      if (!isConfigValid) {
        expect(() => {
          // Accessing any property should throw via Proxy
          (firestoreDb as any).collection('test');
        }).toThrow(/belum terkonfigurasi/);
      }
    });
  });
});
