import { db } from '../../../shared/api/db';
import { IUnitOfWork } from '@application/core/IUnitOfWork';
import { UserRole } from '../../../domain/models/User';
import { cryptoDB } from '../../../lib/cryptoIndexedDB';
import { cryptoKeyStore } from '../../../lib/cryptoKeyStore';
import { getCurrentTime } from '../../../shared/utils/timeUtils';
import { hashPin, useSecurityStore } from '../../../shared/store/useSecurityStore';

export interface SetupStorePayload {
  storeName: string;
  storeAddress: string;
  ownerName: string;
  ownerPin: string;
}

export class SetupStoreUseCase {
  constructor(private readonly unitOfWork: IUnitOfWork) {}

  async execute(payload: SetupStorePayload): Promise<void> {
    // PRE-TRANSACTION: Lakukan operasi kriptografi berat di luar UnitOfWork (Dexie Transaction).
    // Dexie akan melakukan "commit too early" jika ada await pada operasi WebCrypto native atau async yang tidak di-wrap IndexedDB.
    
    // 1. Siapkan Entitas User Owner
    const userId = `USR-${crypto.randomUUID()}`;
    const userSalt = crypto.getRandomValues(new Uint8Array(32));
    
    // 2. CRITICAL CRYPTO GENESIS (Murni di luar IDB Transaction)
    const deviceKey = await cryptoDB.generateDeviceKey();
    const pinWrappedKey = await cryptoDB.wrapKeyWithPin(deviceKey, payload.ownerPin, userSalt);
    
    // F-02: Re-import deviceKey as non-extractable specifically for runtime memory usage
    const keyData = await window.crypto.subtle.exportKey('raw', deviceKey);
    const secureDeviceKey = await window.crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false, // NOT EXTRACTABLE
      ['encrypt', 'decrypt']
    );
    
    const wrappedKeyMeta = {
      id: 'primary_device_key',
      keyId: `local-key-${crypto.randomUUID()}`,
      wrappedKeyBlob: 'DEPRECATED_NO_SERVER',
      wrappedKeysByPin: { [userId]: pinWrappedKey },
      createdAt: getCurrentTime()
    };
    
    // 3. Hash PIN Owner
    const hashedPin = await hashPin(payload.ownerPin, userSalt);
      
    // TRANSAKSI ATOMIK DATABASE: Mulai proses penulisan.
    await this.unitOfWork.execute(async () => {
      // 1. Simpan Profil Toko
      const storeProfilePayload = {
        id: 'default',
        name: payload.storeName,
        address: payload.storeAddress,
        receiptFooter: 'Terima Kasih\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.',
        isSetupComplete: true,
        updatedAt: getCurrentTime()
      };
      await db.store_profile.put(storeProfilePayload);

      // 2. Simpan kunci terenkripsi tersebut ke KeyStore IndexDB
      await cryptoKeyStore.saveWrappedKey(wrappedKeyMeta);
      
      // Aktifkan kunci di memori cryptoDB
      cryptoDB.setKey(secureDeviceKey, wrappedKeyMeta.keyId);

      // 3. Simpan Entitas User Owner (Role: ADMIN)
      const newUser = {
        id: userId,
        name: payload.ownerName,
        role: UserRole.ADMIN,
        pinHash: hashedPin,
        salt: userSalt, // Rekam salt
        status: 'ACTIVE' as const,
        createdAt: getCurrentTime()
      };

      // @ts-expect-error db users mock
      await db.users.add(newUser);

      // Sinkronisasikan Pembuatan User ke Cloud
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.unitOfWork.registerSync('users', 'INSERT', newUser as any);

      // 4. Audit Log Eksekusi Genesis
      await this.unitOfWork.registerAudit(
        'STORE_GENESIS',
        payload.ownerName,
        `Toko berhasil diinisialisasi. Crypto Genesis berhasil.`,
        { role: UserRole.ADMIN, userId }
      );
    }, ['store_profile', 'users']);

    // Update store state OUTSIDE of the transaction
    useSecurityStore.getState().initSetupState();
  }
}
