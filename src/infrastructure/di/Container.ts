import { GoldLiquidationRepositoryImpl } from '../repositories/GoldLiquidationRepositoryImpl';
import { GoldBuybackRepositoryImpl } from '../repositories/GoldBuybackRepositoryImpl';
import { ShiftRepositoryImpl } from '../repositories/ShiftRepositoryImpl';
import { RetailRepositoryImpl } from '../repositories/RetailRepositoryImpl';
import { StockRepositoryImpl } from '../repositories/StockRepositoryImpl';
import { RepairRepositoryImpl } from '../repositories/RepairRepositoryImpl';
import { HandoverRepositoryImpl } from '../repositories/HandoverRepositoryImpl';
import { SuspendedCartRepositoryImpl } from '../repositories/SuspendedCartRepositoryImpl';
import { CustomerRepositoryImpl } from '../repositories/CustomerRepositoryImpl';
import { UserRepositoryImpl } from '../repositories/UserRepositoryImpl';
import { PettyCashRepositoryImpl } from '../repositories/PettyCashRepositoryImpl';
import { CustomOrderRepositoryImpl } from '../repositories/CustomOrderRepositoryImpl';
import { AppointmentRepositoryImpl } from '../repositories/AppointmentRepositoryImpl';
import { InternalNoteRepositoryImpl } from '../repositories/InternalNoteRepositoryImpl';
import { ReportQueryImpl } from '../queries/ReportQueryImpl';
import { LiveQueriesImpl } from '../queries/LiveQueriesImpl';
import { UnitOfWorkImpl } from '../uow/UnitOfWorkImpl';
import { DatabaseAdminServiceImpl } from '../services/DatabaseAdminServiceImpl';
import { PrintServiceImpl } from '../services/PrintServiceImpl';
import { SyncServiceImpl } from '../services/SyncServiceImpl';
import { CommunicationServiceImpl } from '../services/CommunicationServiceImpl';
import { BulkReceiveStockUseCase } from '../../features/inventory/usecases/BulkReceiveStockUseCase';
import { BuybackUseCase } from '../../features/gold/usecases/BuybackUseCase';
import { GoldLiquidationUseCase } from '../../features/gold/usecases/GoldLiquidationUseCase';
import { CheckoutUseCase } from '../../features/pos/usecases/CheckoutUseCase';
import { CreateRepairUseCase } from '../../features/services/usecases/CreateRepairUseCase';
import { UpdateRepairStatusUseCase } from '../../features/services/usecases/UpdateRepairStatusUseCase';
import { OpenShiftUseCase } from '../../features/shift/usecases/OpenShiftUseCase';
import { CloseShiftUseCase } from '../../features/shift/usecases/CloseShiftUseCase';
import { ReceiveStockUseCase } from '../../features/inventory/usecases/ReceiveStockUseCase';
import { UpdateProductUseCase } from '../../features/inventory/usecases/UpdateProductUseCase';
import { DeleteProductUseCase } from '../../features/inventory/usecases/DeleteProductUseCase';
import { CreateHandoverUseCase } from '../../features/shift/usecases/CreateHandoverUseCase';
import { SuspendCartUseCase } from '../../features/pos/usecases/SuspendCartUseCase';
import { ResumeCartUseCase } from '../../features/pos/usecases/ResumeCartUseCase';
import { LogAuditUseCase } from '../../features/audit/usecases/LogAuditUseCase';
import { CreateCustomerUseCase } from '../../features/admin/usecases/CreateCustomerUseCase';
import { UpdateCustomerUseCase } from '../../features/admin/usecases/UpdateCustomerUseCase';
import { DeleteCustomerUseCase } from '../../features/admin/usecases/DeleteCustomerUseCase';
import { LoyaltyUseCase } from '../../features/pos/usecases/LoyaltyUseCase';
import { RecordPettyCashUseCase } from '../../features/pos/usecases/RecordPettyCashUseCase';
import { ManageCustomOrderUseCase } from '../../features/services/usecases/ManageCustomOrderUseCase';
import { ManageCommunicationUseCase } from '../../features/admin/usecases/ManageCommunicationUseCase';
import { VoidTransactionUseCase } from '../../features/pos/usecases/VoidTransactionUseCase';
import { FlagTransactionUseCase } from '../../features/pos/usecases/FlagTransactionUseCase';
import { SetupStoreUseCase } from '../../features/auth/usecases/SetupStoreUseCase';

import { AuditIntegrityService } from '@application/services/AuditIntegrityService';

import { HardwareCheckService } from '../services/HardwareCheckService';

// Internal instances
let _goldLiquidationRepository: GoldLiquidationRepositoryImpl;
let _goldBuybackRepository: GoldBuybackRepositoryImpl;
let _shiftRepository: ShiftRepositoryImpl;
let _retailRepository: RetailRepositoryImpl;
let _stockRepository: StockRepositoryImpl;
let _repairRepository: RepairRepositoryImpl;
let _handoverRepository: HandoverRepositoryImpl;
let _suspendedCartRepository: SuspendedCartRepositoryImpl;
let _customerRepository: CustomerRepositoryImpl;
let _userRepository: UserRepositoryImpl;
let _pettyCashRepository: PettyCashRepositoryImpl;
let _customOrderRepository: CustomOrderRepositoryImpl;
let _appointmentRepository: AppointmentRepositoryImpl;
let _internalNoteRepository: InternalNoteRepositoryImpl;

let _databaseAdminService: DatabaseAdminServiceImpl;
let _printService: PrintServiceImpl;
let _syncService: SyncServiceImpl;
let _communicationService: CommunicationServiceImpl;
let _hardwareCheckService: HardwareCheckService;
let _auditIntegrityService: AuditIntegrityService;

let _reportQuery: ReportQueryImpl;
let _liveQueries: LiveQueriesImpl;

let _unitOfWork: UnitOfWorkImpl;

let _loyaltyUseCase: LoyaltyUseCase;
let _buybackUseCase: BuybackUseCase;
let _goldLiquidationUseCase: GoldLiquidationUseCase;
let _checkoutUseCase: CheckoutUseCase;
let _createRepairUseCase: CreateRepairUseCase;
let _updateRepairStatusUseCase: UpdateRepairStatusUseCase;
let _openShiftUseCase: OpenShiftUseCase;
let _closeShiftUseCase: CloseShiftUseCase;
let _receiveStockUseCase: ReceiveStockUseCase;
let _bulkReceiveStockUseCase: BulkReceiveStockUseCase;
let _updateProductUseCase: UpdateProductUseCase;
let _deleteProductUseCase: DeleteProductUseCase;
let _createHandoverUseCase: CreateHandoverUseCase;
let _suspendCartUseCase: SuspendCartUseCase;
let _resumeCartUseCase: ResumeCartUseCase;
let _logAuditUseCase: LogAuditUseCase;
let _createCustomerUseCase: CreateCustomerUseCase;
let _updateCustomerUseCase: UpdateCustomerUseCase;
let _deleteCustomerUseCase: DeleteCustomerUseCase;
let _recordPettyCashUseCase: RecordPettyCashUseCase;
let _manageCustomOrderUseCase: ManageCustomOrderUseCase;
let _manageCommunicationUseCase: ManageCommunicationUseCase;
let _voidTransactionUseCase: VoidTransactionUseCase;
let _flagTransactionUseCase: FlagTransactionUseCase;
let _setupStoreUseCase: SetupStoreUseCase;

export const DIContainer = {
  // Repositories
  get goldLiquidationRepository() { if (!_goldLiquidationRepository) _goldLiquidationRepository = new GoldLiquidationRepositoryImpl(); return _goldLiquidationRepository; },
  get goldBuybackRepository() { if (!_goldBuybackRepository) _goldBuybackRepository = new GoldBuybackRepositoryImpl(); return _goldBuybackRepository; },
  get shiftRepository() { if (!_shiftRepository) _shiftRepository = new ShiftRepositoryImpl(); return _shiftRepository; },
  get retailRepository() { if (!_retailRepository) _retailRepository = new RetailRepositoryImpl(); return _retailRepository; },
  get stockRepository() { if (!_stockRepository) _stockRepository = new StockRepositoryImpl(); return _stockRepository; },
  get repairRepository() { if (!_repairRepository) _repairRepository = new RepairRepositoryImpl(); return _repairRepository; },
  get handoverRepository() { if (!_handoverRepository) _handoverRepository = new HandoverRepositoryImpl(); return _handoverRepository; },
  get suspendedCartRepository() { if (!_suspendedCartRepository) _suspendedCartRepository = new SuspendedCartRepositoryImpl(); return _suspendedCartRepository; },
  get customerRepository() { if (!_customerRepository) _customerRepository = new CustomerRepositoryImpl(); return _customerRepository; },
  get userRepository() { if (!_userRepository) _userRepository = new UserRepositoryImpl(); return _userRepository; },
  get pettyCashRepository() { if (!_pettyCashRepository) _pettyCashRepository = new PettyCashRepositoryImpl(); return _pettyCashRepository; },
  get customOrderRepository() { if (!_customOrderRepository) _customOrderRepository = new CustomOrderRepositoryImpl(); return _customOrderRepository; },
  get appointmentRepository() { if (!_appointmentRepository) _appointmentRepository = new AppointmentRepositoryImpl(); return _appointmentRepository; },
  get internalNoteRepository() { if (!_internalNoteRepository) _internalNoteRepository = new InternalNoteRepositoryImpl(); return _internalNoteRepository; },

  // Services
  get databaseAdminService() { if (!_databaseAdminService) _databaseAdminService = new DatabaseAdminServiceImpl(); return _databaseAdminService; },
  get printService() { if (!_printService) _printService = new PrintServiceImpl(); return _printService; },
  get syncService() { if (!_syncService) _syncService = new SyncServiceImpl(); return _syncService; },
  get communicationService() { if (!_communicationService) _communicationService = new CommunicationServiceImpl(); return _communicationService; },
  get hardwareCheckService() { if (!_hardwareCheckService) _hardwareCheckService = new HardwareCheckService(this.printService); return _hardwareCheckService; },
  get auditIntegrityService() { if (!_auditIntegrityService) _auditIntegrityService = new AuditIntegrityService(this.unitOfWork); return _auditIntegrityService; },

  // Queries
  get reportQuery() { if (!_reportQuery) _reportQuery = new ReportQueryImpl(); return _reportQuery; },
  get liveQueries() { if (!_liveQueries) _liveQueries = new LiveQueriesImpl(); return _liveQueries; },

  // Unit of Work
  get unitOfWork() { if (!_unitOfWork) _unitOfWork = new UnitOfWorkImpl(this.syncService); return _unitOfWork; },

  // Use Cases
  get loyaltyUseCase() { if (!_loyaltyUseCase) _loyaltyUseCase = new LoyaltyUseCase(this.customerRepository, this.unitOfWork); return _loyaltyUseCase; },
  get buybackUseCase() { if (!_buybackUseCase) _buybackUseCase = new BuybackUseCase(this.goldBuybackRepository, this.stockRepository, this.userRepository, this.unitOfWork); return _buybackUseCase; },
  get goldLiquidationUseCase() { if (!_goldLiquidationUseCase) _goldLiquidationUseCase = new GoldLiquidationUseCase(this.goldBuybackRepository, this.shiftRepository, this.internalNoteRepository, this.userRepository, this.unitOfWork); return _goldLiquidationUseCase; },
  get checkoutUseCase() { if (!_checkoutUseCase) _checkoutUseCase = new CheckoutUseCase(this.retailRepository, this.stockRepository, this.shiftRepository, this.unitOfWork, this.loyaltyUseCase); return _checkoutUseCase; },
  get createRepairUseCase() { if (!_createRepairUseCase) _createRepairUseCase = new CreateRepairUseCase(this.repairRepository, this.unitOfWork); return _createRepairUseCase; },
  get updateRepairStatusUseCase() { if (!_updateRepairStatusUseCase) _updateRepairStatusUseCase = new UpdateRepairStatusUseCase(this.repairRepository, this.unitOfWork, this.communicationService, this.customerRepository); return _updateRepairStatusUseCase; },
  get openShiftUseCase() { if (!_openShiftUseCase) _openShiftUseCase = new OpenShiftUseCase(this.shiftRepository, this.unitOfWork); return _openShiftUseCase; },
  get closeShiftUseCase() { if (!_closeShiftUseCase) _closeShiftUseCase = new CloseShiftUseCase(this.shiftRepository, this.unitOfWork); return _closeShiftUseCase; },
  get receiveStockUseCase() { if (!_receiveStockUseCase) _receiveStockUseCase = new ReceiveStockUseCase(this.stockRepository, this.unitOfWork); return _receiveStockUseCase; },
  get bulkReceiveStockUseCase() { if (!_bulkReceiveStockUseCase) _bulkReceiveStockUseCase = new BulkReceiveStockUseCase(this.stockRepository, this.unitOfWork); return _bulkReceiveStockUseCase; },
  get updateProductUseCase() { if (!_updateProductUseCase) _updateProductUseCase = new UpdateProductUseCase(this.stockRepository, this.unitOfWork); return _updateProductUseCase; },
  get deleteProductUseCase() { if (!_deleteProductUseCase) _deleteProductUseCase = new DeleteProductUseCase(this.stockRepository, this.unitOfWork); return _deleteProductUseCase; },
  get createHandoverUseCase() { if (!_createHandoverUseCase) _createHandoverUseCase = new CreateHandoverUseCase(this.handoverRepository, this.unitOfWork); return _createHandoverUseCase; },
  get suspendCartUseCase() { if (!_suspendCartUseCase) _suspendCartUseCase = new SuspendCartUseCase(this.suspendedCartRepository, this.unitOfWork); return _suspendCartUseCase; },
  get resumeCartUseCase() { if (!_resumeCartUseCase) _resumeCartUseCase = new ResumeCartUseCase(this.suspendedCartRepository, this.unitOfWork); return _resumeCartUseCase; },
  get logAuditUseCase() { if (!_logAuditUseCase) _logAuditUseCase = new LogAuditUseCase(this.unitOfWork); return _logAuditUseCase; },
  get createCustomerUseCase() { if (!_createCustomerUseCase) _createCustomerUseCase = new CreateCustomerUseCase(this.customerRepository, this.unitOfWork); return _createCustomerUseCase; },
  get updateCustomerUseCase() { if (!_updateCustomerUseCase) _updateCustomerUseCase = new UpdateCustomerUseCase(this.customerRepository, this.unitOfWork); return _updateCustomerUseCase; },
  get deleteCustomerUseCase() { if (!_deleteCustomerUseCase) _deleteCustomerUseCase = new DeleteCustomerUseCase(this.customerRepository, this.unitOfWork); return _deleteCustomerUseCase; },
  get recordPettyCashUseCase() { if (!_recordPettyCashUseCase) _recordPettyCashUseCase = new RecordPettyCashUseCase(this.pettyCashRepository, this.unitOfWork); return _recordPettyCashUseCase; },
  get manageCustomOrderUseCase() { if (!_manageCustomOrderUseCase) _manageCustomOrderUseCase = new ManageCustomOrderUseCase(this.customOrderRepository, this.unitOfWork); return _manageCustomOrderUseCase; },
  get manageCommunicationUseCase() { if (!_manageCommunicationUseCase) _manageCommunicationUseCase = new ManageCommunicationUseCase(this.appointmentRepository, this.internalNoteRepository, this.unitOfWork); return _manageCommunicationUseCase; },
  get voidTransactionUseCase() { if (!_voidTransactionUseCase) _voidTransactionUseCase = new VoidTransactionUseCase(this.unitOfWork, this.retailRepository, this.stockRepository); return _voidTransactionUseCase; },
  get flagTransactionUseCase() { if (!_flagTransactionUseCase) _flagTransactionUseCase = new FlagTransactionUseCase(this.unitOfWork, this.retailRepository); return _flagTransactionUseCase; },
  get setupStoreUseCase() { if (!_setupStoreUseCase) _setupStoreUseCase = new SetupStoreUseCase(this.unitOfWork); return _setupStoreUseCase; },
};

// Export individual use cases for backward compatibility if needed
export const loyaltyUseCase = DIContainer.loyaltyUseCase;
export const buybackUseCase = DIContainer.buybackUseCase;
export const goldLiquidationUseCase = DIContainer.goldLiquidationUseCase;
export const checkoutUseCase = DIContainer.checkoutUseCase;
export const createRepairUseCase = DIContainer.createRepairUseCase;
export const updateRepairStatusUseCase = DIContainer.updateRepairStatusUseCase;
export const openShiftUseCase = DIContainer.openShiftUseCase;
export const closeShiftUseCase = DIContainer.closeShiftUseCase;
export const receiveStockUseCase = DIContainer.receiveStockUseCase;
export const bulkReceiveStockUseCase = DIContainer.bulkReceiveStockUseCase;
export const updateProductUseCase = DIContainer.updateProductUseCase;
export const deleteProductUseCase = DIContainer.deleteProductUseCase;
export const createHandoverUseCase = DIContainer.createHandoverUseCase;
export const suspendCartUseCase = DIContainer.suspendCartUseCase;
export const resumeCartUseCase = DIContainer.resumeCartUseCase;
export const logAuditUseCase = DIContainer.logAuditUseCase;
export const createCustomerUseCase = DIContainer.createCustomerUseCase;
export const updateCustomerUseCase = DIContainer.updateCustomerUseCase;
export const deleteCustomerUseCase = DIContainer.deleteCustomerUseCase;
export const recordPettyCashUseCase = DIContainer.recordPettyCashUseCase;
export const manageCustomOrderUseCase = DIContainer.manageCustomOrderUseCase;
export const manageCommunicationUseCase = DIContainer.manageCommunicationUseCase;
