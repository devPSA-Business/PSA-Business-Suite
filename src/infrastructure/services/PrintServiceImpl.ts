/**
 * @ai_context Implementasi layanan cetak struk dengan Hardware Abstraction Layer (HAL).
 * @security_tier MEDIUM
 * @business_rule Templating struk DIPISAHKAN dari transport protocol (USB/Bluetooth/Browser).
 *   ReceiptTemplating: murni string formatting, tidak tahu cara pengiriman.
 *   TransportLayer: murni I/O hardware, tidak tahu konten struk.
 * @data-component-id: print-service-impl
 * @data-error-domain: hardware
 * @changelog:
 *   2026-05-20 — P3: Refactor ke HAL — pisahkan ReceiptTemplating dari TransportLayer
 *                    Eliminasi tight coupling antara formatting dan hardware protocol
 *                    Transport bersifat plug-and-play: USB → BT → Browser fallback
 */
import { IPrintService } from '../../application/services/IPrintService';
import { Transaction, RepairService, db } from '../../shared/api/db';
import { useToastStore } from '../../shared/store/toastStore';
import { logger } from '../../lib/logger';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: RECEIPT TEMPLATING — murni string formatting, zero hardware knowledge
// ═══════════════════════════════════════════════════════════════════════════════

/** Konfigurasi layout struk */
interface ReceiptLayout {
  lineWidth: number;
  shopName: string;
  shopAddress: string;
  shopFooter: string;
}

/**
 * ReceiptTemplating — Hardware-agnostic string formatter.
 *
 * Tanggung jawab tunggal: mengubah domain data → string ESC/POS-ready.
 * Tidak tahu dan tidak peduli apakah output dikirim via USB, Bluetooth, atau iframe.
 */
class ReceiptTemplating {
  format(data: Transaction | RepairService, layout: ReceiptLayout): string {
    const { lineWidth, shopName, shopAddress, shopFooter } = layout;

    const padRight = (str: string, len: number) =>
      str.padEnd(len, ' ').substring(0, len);

    const center = (str: string, len: number) => {
      const pad = Math.max(0, len - str.length);
      const padL = Math.floor(pad / 2);
      return ' '.repeat(padL) + str + ' '.repeat(pad - padL);
    };

    const sep = '-'.repeat(lineWidth) + '\n';
    const dSep = '='.repeat(lineWidth) + '\n';

    let r = '';
    r += center(shopName || 'PSA JEWELLERY', lineWidth) + '\n';
    if (shopAddress) r += center(shopAddress, lineWidth) + '\n';
    r += '\n';

    if ('items' in data) {
      // Struk Transaksi Ritel
      const tx = data as Transaction;
      const dateStr = new Date(tx.date).toLocaleString('id-ID', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
      r += `No  : ${tx.id.substring(0, 8).toUpperCase()}\n`;
      r += `Tgl : ${dateStr}\n`;
      r += `Kasir: ${tx.user}\n`;
      r += sep;

      for (const item of tx.items) {
        const name = item.name.substring(0, lineWidth);
        r += `${name}\n`;
        const qtyPrice = `${item.quantity}x Rp${item.price.toLocaleString('id-ID')}`;
        const subtotal = `Rp${item.subtotal.toLocaleString('id-ID')}`;
        r += padRight(qtyPrice, lineWidth - subtotal.length) + subtotal + '\n';
      }

      r += sep;
      const totalStr = `Rp${tx.total.toLocaleString('id-ID')}`;
      r += padRight('TOTAL', lineWidth - totalStr.length) + totalStr + '\n';
      r += `Metode: ${tx.paymentMethod}\n`;
    } else {
      // Struk Reparasi
      const repair = data as RepairService;
      const dateStr = new Date(repair.date).toLocaleString('id-ID', {
        year: 'numeric', month: '2-digit', day: '2-digit',
      });
      r += center('STRUK REPARASI', lineWidth) + '\n';
      r += `No  : ${repair.id.substring(0, 8).toUpperCase()}\n`;
      r += `Tgl : ${dateStr}\n`;
      r += `Pelanggan: ${repair.customerName}\n`;
      r += sep;
      r += `Layanan: ${repair.serviceType}\n`;
      r += `Barang : ${repair.itemDescription}\n`;
      r += `Berat  : ${repair.initialWeight}g\n`;
      r += sep;
      const priceStr = `Rp${repair.price.toLocaleString('id-ID')}`;
      r += padRight('BIAYA', lineWidth - priceStr.length) + priceStr + '\n';
    }

    r += dSep;
    const footer = shopFooter || 'Terima Kasih\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.';
    for (const line of footer.split('\n')) {
      r += center(line.trim(), lineWidth) + '\n';
    }
    r += '\n\n\n';
    return r;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: TRANSPORT LAYER — murni I/O hardware, zero formatting knowledge
// ═══════════════════════════════════════════════════════════════════════════════

/** Hasil pengiriman print dari transport */
interface TransportResult {
  success: boolean;
  method: 'USB' | 'BLUETOOTH' | 'BROWSER';
  error?: string;
}

/**
 * PrintTransportLayer — Kumpulan strategi pengiriman data ke hardware.
 *
 * Tanggung jawab tunggal: mengirim raw string ke perangkat keras.
 * Tidak tahu dan tidak peduli dengan konten/format string yang dikirim.
 * Pattern: Strategy — setiap transport adalah strategi independen.
 */
class PrintTransportLayer {
  private withTimeout<T>(promise: Promise<T>, ms: number, msg: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(msg)), ms);
      promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
    });
  }

  async sendViaUSB(
    data: string,
    vendorId?: number,
    productId?: number
  ): Promise<TransportResult> {
    if (!navigator.usb || !navigator.locks) {
      return { success: false, method: 'USB', error: 'WebUSB not supported' };
    }

    return navigator.locks.request('psa_printer_lock', { mode: 'exclusive' }, async () => {
      let device: USBDevice | undefined;
      try {
        let vId = vendorId;
        let pId = productId;

        if (!vId || !pId) {
          const saved = await db.keyval.get('saved_usb_printer');
          if (saved && typeof saved.value === 'object' && saved.value !== null) {
            const v = saved.value as Record<string, unknown>;
            vId = typeof v['vendorId'] === 'number' ? v['vendorId'] : undefined;
            pId = typeof v['productId'] === 'number' ? v['productId'] : undefined;
          }
        }

        const devices = await navigator.usb.getDevices();
        device = vId && pId
          ? (devices.find(d => d.vendorId === vId && d.productId === pId)
            ?? await navigator.usb.requestDevice({ filters: [{ vendorId: vId, productId: pId }] }))
          : await navigator.usb.requestDevice({ filters: [] });

        await device.open();
        await db.keyval.put({ key: 'saved_usb_printer', value: { vendorId: device.vendorId, productId: device.productId } });
        if (device.configuration === null) await device.selectConfiguration(1);
        await device.claimInterface(0);

        const encoded = new TextEncoder().encode(data);
        const ESC = 0x1B, GS = 0x1D;
        const initCmd = new Uint8Array([ESC, 0x40]);
        const cutCmd = new Uint8Array([GS, 0x56, 0x41, 0x00]);

        let outEp: USBEndpoint | undefined;
        for (const ep of device.configuration!.interfaces[0].alternate.endpoints) {
          if (ep.direction === 'out') { outEp = ep; break; }
        }
        if (!outEp) throw new Error('No USB OUT endpoint found');

        await this.withTimeout(device.transferOut(outEp.endpointNumber, initCmd), 5000, 'Timeout init printer');
        await this.withTimeout(device.transferOut(outEp.endpointNumber, encoded), 5000, 'Timeout kirim data');
        await this.withTimeout(device.transferOut(outEp.endpointNumber, cutCmd), 5000, 'Timeout cut paper');

        return { success: true, method: 'USB' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.warn('[PrintTransport:USB] Gagal:', { error: msg });
        return { success: false, method: 'USB', error: msg };
      } finally {
        if (device?.opened) await device.close().catch(() => {});
      }
    });
  }

  async sendViaBluetooth(data: string): Promise<TransportResult> {
    const nav = navigator as Navigator & { bluetooth?: {
      requestDevice: (opt: unknown) => Promise<{
        gatt?: { connect: () => Promise<{ getPrimaryService: (s: string) => Promise<{
          getCharacteristic: (c: string) => Promise<{ writeValue: (d: Uint8Array) => Promise<void> }>;
        }> }> };
        disconnect: () => void;
      }>;
    } };

    if (!nav.bluetooth) {
      return { success: false, method: 'BLUETOOTH', error: 'Web Bluetooth not supported' };
    }

    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
      });
      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const char = await service?.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      const encoded = new TextEncoder().encode(data + '\n\n\n');
      const CHUNK = 20;
      for (let i = 0; i < encoded.length; i += CHUNK) {
        await char?.writeValue(encoded.slice(i, i + CHUNK));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (device.gatt as any)?.disconnect?.();
      return { success: true, method: 'BLUETOOTH' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('[PrintTransport:BT] Gagal:', { error: msg });
      return { success: false, method: 'BLUETOOTH', error: msg };
    }
  }

  async sendViaBrowser(data: string): Promise<TransportResult> {
    if (typeof window.print !== 'function') {
      return { success: false, method: 'BROWSER', error: 'window.print not available' };
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;

    if (!doc) {
      document.body.removeChild(iframe);
      return { success: false, method: 'BROWSER', error: 'Gagal membuat iframe print' };
    }

    doc.open();
    doc.write(`<html><head><style>
      body { font-family: monospace; white-space: pre; margin: 0; padding: 10px; width: 300px; }
    </style></head><body>${data}</body></html>`);
    doc.close();

    return new Promise((resolve) => {
      setTimeout(() => {
        const fw = iframe.contentWindow;
        if (!fw) { document.body.removeChild(iframe); resolve({ success: false, method: 'BROWSER', error: 'iframe context lost' }); return; }

        let done = false;
        const finish = () => {
          if (done) return; done = true;
          if (document.body.contains(iframe)) document.body.removeChild(iframe);
          resolve({ success: true, method: 'BROWSER' });
        };

        fw.onafterprint = finish;
        window.addEventListener('focus', () => setTimeout(finish, 800), { once: true });
        fw.focus();
        fw.print();
      }, 250);
    });
  }

  async openCashDrawerViaUSB(): Promise<boolean> {
    if (!navigator.usb || !navigator.locks) return false;

    return navigator.locks.request('psa_printer_lock', { mode: 'exclusive' }, async () => {
      let device: USBDevice | undefined;
      try {
        const saved = await db.keyval.get('saved_usb_printer');
        if (!saved?.value) return false;
        const v = saved.value as Record<string, unknown>;
        const vId = typeof v['vendorId'] === 'number' ? v['vendorId'] : undefined;
        const pId = typeof v['productId'] === 'number' ? v['productId'] : undefined;
        if (!vId || !pId) return false;

        const devices = await navigator.usb.getDevices();
        device = devices.find(d => d.vendorId === vId && d.productId === pId)
          ?? await navigator.usb.requestDevice({ filters: [{ vendorId: vId, productId: pId }] });

        await device.open();
        if (device.configuration === null) await device.selectConfiguration(1);
        await device.claimInterface(0);

        const drawerCmd = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
        let outEp: USBEndpoint | undefined;
        for (const ep of device.configuration!.interfaces[0].alternate.endpoints) {
          if (ep.direction === 'out') { outEp = ep; break; }
        }
        if (!outEp) throw new Error('No OUT endpoint');

        await this.withTimeout(device.transferOut(outEp.endpointNumber, drawerCmd), 5000, 'Timeout buka laci');
        return true;
      } catch (err) {
        logger.warn('[PrintTransport:USB:Drawer] Gagal:', { error: err instanceof Error ? err.message : String(err) });
        return false;
      } finally {
        if (device?.opened) await device.close().catch(() => {});
      }
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR: IPrintService implementasi — mengorkestrasi Templating + Transport
// ═══════════════════════════════════════════════════════════════════════════════

export class PrintServiceImpl implements IPrintService {
  private readonly templating = new ReceiptTemplating();
  private readonly transport = new PrintTransportLayer();
  private readonly LINE_WIDTH = 32;

  /** Public — dipakai untuk preview struk di UI */
  formatReceipt(data: Transaction | RepairService, shopName: string, shopAddress: string, shopFooter: string): string {
    return this.templating.format(data, { lineWidth: this.LINE_WIDTH, shopName, shopAddress, shopFooter });
  }

  async testConnection(): Promise<boolean> {
    try {
      const profile = await db.store_profile.get('default');
      const config = profile?.printerConfig;
      if (!config) return false;

      if (config.type === 'USB' && navigator.usb) {
        const devices = await navigator.usb.getDevices();
        return devices.some(d => d.vendorId === config.vendorId && d.productId === config.productId);
      }
      return true;
    } catch {
      return false;
    }
  }

  async print(data: Transaction | RepairService): Promise<void> {
    try {
      const profile = await db.store_profile.get('default');
      const layout: ReceiptLayout = {
        lineWidth: this.LINE_WIDTH,
        shopName: profile?.name || 'PSA JEWELLERY',
        shopAddress: profile?.address || '',
        shopFooter: profile?.receiptFooter || 'Terima Kasih',
      };

      // Layer 1: Format struk (agnostik hardware)
      const receiptText = this.templating.format(data, layout);

      // Layer 2: Pilih transport berurutan — USB → BT → Browser fallback
      const config = profile?.printerConfig;
      let result: TransportResult;

      if (config?.type === 'USB') {
        result = await this.transport.sendViaUSB(receiptText, config.vendorId, config.productId);
        if (result.success) return;
        logger.warn('[PrintService] USB gagal, coba Bluetooth:', { error: result.error });
      }

      if (config?.type === 'BLUETOOTH') {
        result = await this.transport.sendViaBluetooth(receiptText);
        if (result.success) return;
        logger.warn('[PrintService] Bluetooth gagal, fallback Browser:', { error: result.error });
      }

      // Fallback: browser print dialog
      useToastStore.getState().addToast('Mencetak via dialog browser...', 'info');
      await this.transport.sendViaBrowser(receiptText);
    } catch (error) {
      logger.error('[PrintService] Gagal cetak:', { error: error instanceof Error ? error.message : String(error) });
      useToastStore.getState().addToast(
        error instanceof Error ? error.message : 'Gagal mencetak struk',
        'error'
      );
    }
  }

  async triggerCashDrawer(): Promise<void> {
    try {
      if (navigator.usb) {
        const ok = await this.transport.openCashDrawerViaUSB();
        if (ok) { useToastStore.getState().addToast('Laci kasir dibuka (USB)', 'info'); return; }
      }
      useToastStore.getState().addToast('Laci kasir dibuka', 'info');
    } catch (error) {
      logger.error('[PrintService] Gagal buka laci kasir:', { error: error instanceof Error ? error.message : String(error) });
      useToastStore.getState().addToast('Gagal membuka laci kasir', 'error');
    }
  }
}
