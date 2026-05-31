import { IPrintService } from '../../application/services/IPrintService';
import { logger } from '../../lib/logger';

export class HardwareCheckService {
  constructor(private readonly printService: IPrintService) {}

  // Implementations should interact with actual hardware adapters
  async testPrinter(): Promise<boolean> {
    try {
      return await this.printService.testConnection();
    } catch (error) {
      logger.error('[HardwareCheck] Printer check failed', { error });
      return false;
    }
  }

  async testDrawer(): Promise<boolean> {
    try {
      return await this.printService.testConnection();
    } catch (error) {
      logger.error('[HardwareCheck] Drawer check failed', { error });
      return false;
    }
  }

  async testScale(): Promise<boolean> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scaleService = (window as any).scaleService;
      if (scaleService && typeof scaleService.test === 'function') {
        return await scaleService.test();
      }
      return true;
    } catch (error) {
      logger.error('[HardwareCheck] Scale check failed', { error });
      return false;
    }
  }
}
