import { IPrintService } from '../../application/services/IPrintService';
import { Transaction, RepairService, db } from '../../shared/api/db';
import { useToastStore } from '../../shared/store/toastStore';

export class PrintServiceImpl implements IPrintService {
  formatReceipt(data: Transaction | RepairService, shopName: string, shopAddress: string, shopFooter: string): string {
    const LINE_WIDTH = 32;
    const padRight = (str: string, len: number) => str.padEnd(len, ' ').substring(0, len);
    const center = (str: string, len: number) => {
      const pad = Math.max(0, len - str.length);
      const padLeft = Math.floor(pad / 2);
      const padRight = pad - padLeft;
      return ' '.repeat(padLeft) + str + ' '.repeat(padRight);
    };

    const separator = '-'.repeat(LINE_WIDTH) + '\n';
    const doubleSeparator = '='.repeat(LINE_WIDTH) + '\n';

    let receipt = '';

    receipt += center(shopName || 'PSA JEWELLERY', LINE_WIDTH) + '\n';
    if (shopAddress) {
      receipt += center(shopAddress, LINE_WIDTH) + '\n';
    }
    receipt += '\n';

    if ('items' in data) {
      const transaction = data as Transaction;
      const dateStr = new Date(transaction.date).toLocaleString('id-ID', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit'
      });
      receipt += `No  : ${transaction.id.substring(0, 8).toUpperCase()}\n`;
      receipt += `Tgl : ${dateStr}\n`;
      receipt += `Kasir: ${transaction.user}\n`;
      receipt += separator;

      for (const item of transaction.items) {
        const itemName = item.name.length > LINE_WIDTH ? item.name.substring(0, LINE_WIDTH) : item.name;
        receipt += `${itemName}\n`;
        const qtyPrice = `${item.quantity}x Rp${item.price.toLocaleString('id-ID')}`;
        const subtotal = `Rp${item.subtotal.toLocaleString('id-ID')}`;
        receipt += padRight(qtyPrice, LINE_WIDTH - subtotal.length) + subtotal + '\n';
      }
      receipt += separator;
      const totalStr = `Rp${transaction.total.toLocaleString('id-ID')}`;
      receipt += padRight('TOTAL', LINE_WIDTH - totalStr.length) + totalStr + '\n';
      receipt += `Metode: ${transaction.paymentMethod}\n`;
    } else {
      const repair = data as RepairService;
      const dateStr = new Date(repair.date).toLocaleString('id-ID', {
        year: 'numeric', month: '2-digit', day: '2-digit'
      });
      receipt += center('STRUK REPARASI', LINE_WIDTH) + '\n';
      receipt += `No  : ${repair.id.substring(0, 8).toUpperCase()}\n`;
      receipt += `Tgl : ${dateStr}\n`;
      receipt += `Pelanggan: ${repair.customerName}\n`;
      receipt += separator;
      receipt += `Layanan: ${repair.serviceType}\n`;
      receipt += `Barang : ${repair.itemDescription}\n`;
      receipt += `Berat  : ${repair.initialWeight}g\n`;
      receipt += separator;
      const priceStr = `Rp${repair.price.toLocaleString('id-ID')}`;
      receipt += padRight('BIAYA', LINE_WIDTH - priceStr.length) + priceStr + '\n';
    }
    
    receipt += doubleSeparator;
    
    // Split footer by newline and center each line
    const footerText = shopFooter || 'Terima Kasih\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.';
    const footerLines = footerText.split('\n');
    for (const line of footerLines) {
      receipt += center(line.trim(), LINE_WIDTH) + '\n';
    }
    
    receipt += '\n\n\n';

    return receipt;
  }

  async testConnection(): Promise<boolean> {
    try {
      const profile = await db.store_profile.get('default');
      const config = profile?.printerConfig;
      if (!config) return false;
      
      if (config.type === 'USB' && navigator.usb) {
        const devices = await navigator.usb.getDevices();
        // Check if the configured printer is currently plugged in and recognized
        return devices.some(d => d.vendorId === config.vendorId && d.productId === config.productId);
      }
      // For Bluetooth or fallback, assume true if config exists
      return true;
    } catch (_error) {
      return false;
    }
  }

  async print(data: Transaction | RepairService): Promise<void> {
    try {
      const profile = await db.store_profile.get('default');
      const shopName = profile?.name || 'PSA JEWELLERY';
      const shopAddress = profile?.address || '';
      const shopFooter = profile?.receiptFooter || 'Terima Kasih';
      
      const receiptText = this.formatReceipt(data, shopName, shopAddress, shopFooter);
      
      const config = profile?.printerConfig;

      if (config?.type === 'USB') {
        const printed = await this.printViaWebUSB(receiptText, config.vendorId, config.productId);
        if (printed) return;
      } else if (config?.type === 'BLUETOOTH') {
        const printed = await this.printViaBluetooth(receiptText);
        if (printed) return;
      }

      // Fallback to iframe print if no hardware printer is configured or fails
      useToastStore.getState().addToast('Mencetak via dialog browser...', 'info');
      await this.printViaIframe(receiptText);
    } catch (error) {
      console.error('Print error:', error);
      useToastStore.getState().addToast(error instanceof Error ? (error instanceof Error ? error.message : String(error)) : 'Gagal mencetak struk', 'error');
    }
  }

  private async printViaIframe(receiptText: string): Promise<void> {
    if (typeof window.print !== 'function') {
      throw new Error('Fitur cetak tidak didukung di browser ini.');
    }

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <style>
              body { font-family: monospace; white-space: pre; margin: 0; padding: 10px; width: 300px; }
            </style>
          </head>
          <body>${receiptText}</body>
        </html>
      `);
      doc.close();
      
      if (!iframe.contentWindow) {
        throw new Error('Gagal menginisialisasi printer.');
      }

      return new Promise((resolve, reject) => {
        setTimeout(() => {
          try {
            const fw = iframe.contentWindow;
            if (!fw) throw new Error('Iframe context lost');
            
            fw.focus();

            let isFinished = false;
            const finishPrint = () => {
              if (isFinished) return;
              isFinished = true;
              if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
              }
              resolve();
            };

            fw.onafterprint = finishPrint;
            
            // Listen for window focus as a fallback if onafterprint doesn't fire (common in Safari/mobile)
            window.addEventListener('focus', () => { setTimeout(finishPrint, 1000); }, { once: true });

            fw.print();
          } catch (printError) {
            console.error('Print execution error:', printError);
            reject(new Error('Gagal mengirim data ke printer. Pastikan printer terhubung.'));
          }
        }, 250);
      });
    } else {
      document.body.removeChild(iframe);
      throw new Error('Gagal menginisialisasi printer.');
    }
  }

  private async printViaBluetooth(receiptText: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (!nav.bluetooth) {
      console.warn('Bluetooth not supported');
      return false;
    }

    try {
      const device = await nav.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      const server = await device.gatt?.connect();
      const service = await server?.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
      const characteristic = await service?.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

      const encoder = new TextEncoder();
      const data = encoder.encode(receiptText + '\n\n\n');
      
      // Bluetooth often requires chunking
      const CHUNK_SIZE = 20;
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristic?.writeValue(chunk);
      }

      await device.gatt?.disconnect();
      return true;
    } catch (error) {
      console.warn('Bluetooth printing failed:', error);
      return false;
    }
  }

  private withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(errorMessage)), ms);
      promise.then(
        (val) => { clearTimeout(timer); resolve(val); },
        (err) => { clearTimeout(timer); reject(err); }
      );
    });
  }

  private async printViaWebUSB(receiptText: string, vendorId?: number, productId?: number): Promise<boolean> {
    if (!navigator.usb || !navigator.locks) {
      return false;
    }

    return await navigator.locks.request('psa_printer_lock', { mode: 'exclusive' }, async () => {
      let device: USBDevice | undefined;

      try {
        let vId = vendorId;
        let pId = productId;

        // Try to load saved printer if not provided
        if (!vId || !pId) {
          const savedPrinter = await db.keyval.get('saved_usb_printer');
          if (savedPrinter) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const val = savedPrinter.value as any;
            vId = val.vendorId;
            pId = val.productId;
          }
        }

        if (vId && pId) {
          const devices = await navigator.usb.getDevices();
          const found = devices.find(d => d.vendorId === vId && d.productId === pId);
          if (found) {
            device = found;
          } else {
            device = await navigator.usb.requestDevice({ filters: [{ vendorId: vId, productId: pId }] });
          }
        } else {
          device = await navigator.usb.requestDevice({ filters: [] });
        }
        
        await device.open();
        
        // Save for next time
        await db.keyval.put({ 
          key: 'saved_usb_printer', 
          value: { vendorId: device.vendorId, productId: device.productId } 
        });

        if (device.configuration === null) await device.selectConfiguration(1);
        await device.claimInterface(0);

        const encoder = new TextEncoder();
        const data = encoder.encode(receiptText);

        const ESC = 0x1B;
        const GS = 0x1D;
        const initCmd = new Uint8Array([ESC, 0x40]);
        const cutCmd = new Uint8Array([GS, 0x56, 0x41, 0x00]);

        let outEndpoint: USBEndpoint | undefined;
        for (const endpoint of device.configuration!.interfaces[0].alternate.endpoints) {
          if (endpoint.direction === 'out') {
            outEndpoint = endpoint;
            break;
          }
        }

        if (!outEndpoint) throw new Error('No OUT endpoint found');

        await this.withTimeout(device.transferOut(outEndpoint.endpointNumber, initCmd), 5000, 'Timeout mengirim perintah inisialisasi ke printer');
        await this.withTimeout(device.transferOut(outEndpoint.endpointNumber, data), 5000, 'Timeout mengirim data ke printer');
        await this.withTimeout(device.transferOut(outEndpoint.endpointNumber, cutCmd), 5000, 'Timeout mengirim perintah potong kertas ke printer');

        return true;
      } catch (error) {
        console.warn('WebUSB error:', error);
        return false;
      } finally {
        if (device && device.opened) {
          await device.close();
        }
      }
    });
  }

  async triggerCashDrawer(): Promise<void> {
    try {
      if (navigator.usb) {
        const triggeredViaUsb = await this.triggerCashDrawerViaWebUSB();
        if (triggeredViaUsb) {
          useToastStore.getState().addToast('Laci kasir dibuka (USB)', 'info');
          return;
        }
      }
      
      console.log('Triggering cash drawer (Fallback)...');
      useToastStore.getState().addToast('Laci kasir dibuka', 'info');
    } catch (error) {
      console.error('Cash drawer error:', error);
      useToastStore.getState().addToast('Gagal membuka laci kasir', 'error');
    }
  }

  private async triggerCashDrawerViaWebUSB(): Promise<boolean> {
    if (!navigator.usb || !navigator.locks) {
      return false;
    }

    return await navigator.locks.request('psa_printer_lock', { mode: 'exclusive' }, async () => {
      let device: USBDevice | undefined;

      try {
        const savedPrinter = await db.keyval.get('saved_usb_printer');
        if (savedPrinter) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const val = savedPrinter.value as any;
          const devices = await navigator.usb.getDevices();
          const found = devices.find(d => d.vendorId === val.vendorId && d.productId === val.productId);
          if (found) {
            device = found;
          } else {
            device = await navigator.usb.requestDevice({ filters: [{ vendorId: val.vendorId, productId: val.productId }] });
          }
        } else {
          device = await navigator.usb.requestDevice({ filters: [] });
        }
        
        await device.open();
        
        if (device.opened) {
          await db.keyval.put({ 
            key: 'saved_usb_printer', 
            value: { vendorId: device.vendorId, productId: device.productId } 
          });
        }
        
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }
        
        await device.claimInterface(0);

        // ESC/POS Command to open cash drawer
        const ESC = 0x1B;
        const drawerCmd = new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xFA]);

        let outEndpoint: USBEndpoint | undefined;
        for (const endpoint of device.configuration!.interfaces[0].alternate.endpoints) {
          if (endpoint.direction === 'out') {
            outEndpoint = endpoint;
            break;
          }
        }

        if (!outEndpoint) {
          throw new Error('No OUT endpoint found on USB device.');
        }

        await this.withTimeout(device.transferOut(outEndpoint.endpointNumber, drawerCmd), 5000, 'Timeout mengirim perintah buka laci ke printer');
        return true;
      } catch (error) {
        console.warn('WebUSB drawer error:', error);
        return false;
      } finally {
        if (device && device.opened) {
          await device.close();
        }
      }
    });
  }
}
