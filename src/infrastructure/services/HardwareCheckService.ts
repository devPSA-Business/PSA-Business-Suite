import { IPrintService } from '../../application/services/IPrintService';

export class HardwareCheckService {
  constructor(private readonly printService: IPrintService) {}

  // Implementations should interact with actual hardware adapters
  async testPrinter(): Promise<boolean> {
    try {
      return await this.printService.testConnection();
    } catch (error) {
      console.error('Printer check failed:', error);
      return false;
    }
  }

  async testDrawer(): Promise<boolean> {
    try {
      return await this.printService.testConnection();
    } catch (error) {
      console.error('Drawer check failed:', error);
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
      console.error('Scale check failed:', error);
      return false;
    }
  }
}
